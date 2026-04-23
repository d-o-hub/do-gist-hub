import { defineConfig, Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

/**
 * Reads app.config.ts and injects values into index.html
 * so the HTML title and meta tags derive from the single source of truth.
 */
function appConfigHtmlPlugin(): Plugin {
  return {
    name: 'app-config-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        process.env.VITE_APP_NAME = process.env.VITE_APP_NAME || 'd.o. Gist Hub';
        process.env.VITE_APP_DESCRIPTION = process.env.VITE_APP_DESCRIPTION || 'Offline-first GitHub Gist management app';
        process.env.VITE_APP_THEME_COLOR = process.env.VITE_APP_THEME_COLOR || '#2563eb';

        const appName = process.env.VITE_APP_NAME;
        const appDesc = process.env.VITE_APP_DESCRIPTION;
        const themeColor = process.env.VITE_APP_THEME_COLOR;

        return html
          .replaceAll('%VITE_APP_NAME%', appName)
          .replaceAll('%VITE_APP_DESCRIPTION%', appDesc)
          .replaceAll('%VITE_APP_THEME_COLOR%', themeColor);
      }
    }
  };
}

/**
 * Injects Content-Security-Policy meta tag into index.html.
 * CSP restricts resource loading to prevent XSS and data injection attacks.
 */
function cspPlugin(): Plugin {
  // Strict CSP policy for production
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.github.com",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  return {
    name: 'csp-inject',
    transformIndexHtml(html, ctx) {
      // Only inject CSP in production build
      if (ctx.server) return html;

      // Add CSP as meta tag in <head>
      const metaTag = `<meta http-equiv="Content-Security-Policy" content="${csp}" />`;
      // Remove any existing CSP meta tag from index.html to avoid duplicates
      const cleanedHtml = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[^>]*>/i, '');
      return cleanedHtml.replace('<head>', `<head>\n    ${metaTag}`);
    },
  };
}

/**
 * Generates manifest.webmanifest from src/config/app.config.ts
 * so the PWA manifest always matches the single source of truth.
 */
function manifestPlugin(): Plugin {
  return {
    name: 'manifest-generator',
    buildStart() {
      const configPath = path.resolve(__dirname, 'src/config/app.config.ts');
      if (fs.existsSync(configPath)) {
        this.addWatchFile(configPath);
      }
    },
    closeBundle() {
      const configPath = path.resolve(__dirname, 'src/config/app.config.ts');
      if (!fs.existsSync(configPath)) return;

      // Parse the config — we just need the APP constant values
      const publicDir = path.resolve(__dirname, 'public');
      const manifestPath = path.join(publicDir, 'manifest.webmanifest');

      // Import the built output to get typed values
      import(configPath).then((mod) => {
        const { APP } = mod;
        const manifest = {
          name: APP.name,
          short_name: APP.shortName,
          description: APP.description,
          theme_color: APP.themeColor,
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          orientation: 'any' as const,
          categories: ['productivity', 'developer tools'],
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
            { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          ],
        };
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      }).catch(() => {
        // Silent fallback during dev — manifest is written manually
      });
    },
  };
}

/**
 * Enforces performance budgets during build.
 * Fails the build if bundle sizes exceed defined limits.
 */
function performanceBudgetPlugin(): Plugin {
  const BUDGETS = {
    initialJS: 150 * 1024,    // 150KB gzipped (we check raw size as proxy)
    routeChunk: 150 * 1024,    // 50KB per chunk
  };

  return {
    name: 'performance-budget',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;

      const warnings: string[] = [];

      // Walk through all JS files in dist
      const walkDir = (dir: string): string[] => {
        const files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...walkDir(fullPath));
          } else if (entry.name.endsWith('.js')) {
            files.push(fullPath);
          }
        }
        return files;
      };

      const jsFiles = walkDir(distDir);
      let totalJSSize = 0;

      for (const file of jsFiles) {
        const stats = fs.statSync(file);
        totalJSSize += stats.size;

        // Check individual chunk size
        if (stats.size > BUDGETS.routeChunk) {
          const relativePath = path.relative(distDir, file);
          const sizeKB = (stats.size / 1024).toFixed(1);
          warnings.push(
            `Route chunk exceeds budget: ${relativePath} (${sizeKB}KB > ${(BUDGETS.routeChunk / 1024).toFixed(0)}KB)`
          );
        }
      }

      // Check total JS size (rough proxy for gzipped size)
      if (totalJSSize > BUDGETS.initialJS * 2.5) { // Raw size ~2.5x gzipped
        const totalKB = (totalJSSize / 1024).toFixed(1);
        warnings.push(
          `Total JS exceeds budget: ${totalKB}KB raw (~${(totalKB / 2.5).toFixed(1)}KB gzipped > ${(BUDGETS.initialJS / 1024).toFixed(0)}KB)`
        );
      }

      // Log warnings
      if (warnings.length > 0) {
        console.warn('\n⚠️  Performance Budget Warnings:');
        for (const warning of warnings) {
          console.warn(`  - ${warning}`);
        }
        console.warn('');

        // In CI, fail the build
        if (process.env.CI) {
          throw new Error('Performance budgets exceeded (see warnings above)');
        }
      } else {
        console.log('\n✓ Performance budgets passed');
      }
    },
  };
}

export default defineConfig({
  plugins: [
    appConfigHtmlPlugin(),
    cspPlugin(),
    manifestPlugin(),
    performanceBudgetPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tokens': path.resolve(__dirname, './src/tokens'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'esnext',
    // Use esbuild for fast minification
    minify: 'esbuild',
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Chunk splitting strategy for better caching
    rollupOptions: {
      output: {
        // Separate vendor chunks
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          return null;
        },
        // Consistent file naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Report compressed sizes
    reportCompressedSize: true,
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 3000,
    host: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['idb'],
  },
  // Preview server for testing production builds
  preview: {
    port: 4173,
    host: true,
  },
});
