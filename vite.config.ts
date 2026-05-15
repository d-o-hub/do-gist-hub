import { defineConfig, Plugin } from 'vite';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import esbuild from 'esbuild';
import { visualizer } from 'rollup-plugin-visualizer';
import { APP } from './src/config/app.config';
import { PERFORMANCE_BUDGETS } from './src/services/perf/budgets';
import { generateCSSVariables } from './src/tokens/css-variables';

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
        process.env.VITE_APP_NAME = process.env.VITE_APP_NAME || APP.name;
        process.env.VITE_APP_DESCRIPTION = process.env.VITE_APP_DESCRIPTION || APP.description;
        process.env.VITE_APP_THEME_COLOR = process.env.VITE_APP_THEME_COLOR || APP.themeColor;

        const appName = process.env.VITE_APP_NAME;
        const appDesc = process.env.VITE_APP_DESCRIPTION;
        const themeColor = process.env.VITE_APP_THEME_COLOR;

        return html
          .replaceAll('%VITE_APP_NAME%', appName)
          .replaceAll('%VITE_APP_DESCRIPTION%', appDesc)
          .replaceAll('%VITE_APP_THEME_COLOR%', themeColor);
      },
    },
  };
}

/**
 * Injects Content-Security-Policy meta tag into index.html.
 * CSP restricts resource loading to prevent XSS and data injection attacks.
 *
 * Production: static design-tokens.css removes need for blob: and unsafe-inline.
 * Dev mode uses index.html CSP which includes unsafe-inline for Vite HMR.
 */
function cspPlugin(): Plugin {
  return {
    name: 'csp-inject',
    transformIndexHtml(html, ctx) {
      // Only transform CSP in production build
      if (ctx.server) return html;

      // Extract existing CSP from index.html (handles multi-line and attribute order)
      const cspMatch =
        html.match(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]+)"[^>]*>/i) ||
        html.match(/<meta[^>]*content="([^"]+)"[^>]*http-equiv="Content-Security-Policy"[^>]*>/i);

      let csp = cspMatch ? cspMatch[1].replace(/\s+/g, ' ').trim() : '';

      if (!csp) {
        throw new Error('[csp-inject] No Content-Security-Policy found in index.html');
      }

      // Production Hardening: Remove dev-only style-src requirements
      // (Static design-tokens.css eliminates need for blob: and unsafe-inline)
      csp = csp
        .replace(/(style-src[^;]*)\s+blob:/g, '$1')
        .replace(/(style-src[^;]*)\s+'unsafe-inline'/g, '$1');

      // Add production-only hardening directives if not already present
      const prodAdditions = [
        "media-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        'upgrade-insecure-requests',
      ];

      for (const directive of prodAdditions) {
        const key = directive.split(' ')[0];
        if (!csp.includes(key)) {
          csp = `${csp.endsWith(';') ? csp : `${csp};`} ${directive}`;
        }
      }

      const metaTag = `<meta http-equiv="Content-Security-Policy" content="${csp.trim()}" />`;

      // Replace original meta tag with the transformed one (handles either attribute order)
      const fullMatch =
        html.match(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/i) ||
        html.match(/<meta[^>]*content="[^"]+"[^>]*http-equiv="Content-Security-Policy"[^>]*>/i);

      if (fullMatch) {
        return html.replace(fullMatch[0], metaTag);
      }

      return html;
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
      import(configPath)
        .then((mod) => {
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
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable',
              },
              {
                src: '/pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
              },
              { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
            ],
          };
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
        })
        .catch(() => {
          // Silent fallback during dev — manifest is written manually
        });
    },
  };
}

/**
 * Enforces performance budgets during build using actual gzip sizes.
 * Fails the build if bundle sizes exceed defined limits.
 */
function performanceBudgetPlugin(): Plugin {
  return {
    name: 'performance-budget',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;

      const warnings: string[] = [];
      const exceeded: string[] = [];

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
      let totalGzipSize = 0;

      for (const file of jsFiles) {
        const raw = fs.readFileSync(file);
        const gzipped = zlib.gzipSync(raw);
        const gzipSize = gzipped.length;
        totalGzipSize += gzipSize;

        const relativePath = path.relative(distDir, file);
        const sizeKB = (gzipSize / 1024).toFixed(1);

        if (gzipSize > PERFORMANCE_BUDGETS.routeChunk) {
          const msg = `Route chunk exceeds budget: ${relativePath} (${sizeKB}KB > ${(PERFORMANCE_BUDGETS.routeChunk / 1024).toFixed(0)}KB)`;
          warnings.push(msg);
          exceeded.push(msg);
        }
      }

      if (totalGzipSize > PERFORMANCE_BUDGETS.initialJS) {
        const totalKB = (totalGzipSize / 1024).toFixed(1);
        const msg = `Total JS exceeds budget: ${totalKB}KB gzipped > ${(PERFORMANCE_BUDGETS.initialJS / 1024).toFixed(0)}KB`;
        warnings.push(msg);
        exceeded.push(msg);
      }

      if (warnings.length > 0) {
        console.warn('\n⚠️  Performance Budget Warnings:');
        for (const warning of warnings) {
          console.warn(`  - ${warning}`);
        }
        console.warn('');

        if (process.env.CI) {
          throw new Error(
            `Performance budgets exceeded:\n${exceeded.map((e) => `  - ${e}`).join('\n')}`
          );
        }
      } else {
        console.log('\n✓ Performance budgets passed');
      }
    },
  };
}

/**
 * Generates public/design-tokens.css at build time from TypeScript token definitions.
 * Eliminates runtime blob URL injection in production (Phase C Action 4.2).
 */
function designTokensBuildPlugin(): Plugin {
  return {
    name: 'design-tokens-build',
    closeBundle() {
      const css = generateCSSVariables();
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      const targetPath = path.resolve(publicDir, 'design-tokens.css');
      fs.writeFileSync(targetPath, css);
      console.log(`✓ Design tokens CSS generated: public/design-tokens.css (${Buffer.byteLength(css, 'utf8')} bytes)`);
    },
  };
}

/**
 * Generates sw.js from TypeScript template at build time.
 * Injects cache names from app.config.ts and build timestamp.
 */
function swGeneratorPlugin(): Plugin {
  return {
    name: 'sw-generator',
    apply: 'build', // Only run during production builds
    async closeBundle() {
      const swEntry = path.resolve(__dirname, 'src/sw/sw.ts');
      const swOutput = path.resolve(__dirname, 'dist/sw.js');
      const buildTimestamp = Date.now().toString();

      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      try {
        const result = await esbuild.build({
          entryPoints: [swEntry],
          bundle: true,
          platform: 'browser',
          target: 'esnext',
          format: 'iife',
          write: false,
          minify: process.env.NODE_ENV === 'production',
        });

        if (result.outputFiles?.[0]) {
          let swCode = result.outputFiles[0].text;
          swCode = swCode.replace(/__BUILD_TIMESTAMP__/g, buildTimestamp);
          fs.writeFileSync(swOutput, swCode);
          console.log(`✓ Service Worker generated: dist/sw.js`);
        }
      } catch (error) {
        console.error('Failed to generate Service Worker:', error);
        throw error;
      }
    },
  };
}

const shouldAnalyze = process.env.ANALYZE === 'true';

export default defineConfig({
  plugins: [
    appConfigHtmlPlugin(),
    cspPlugin(),
    manifestPlugin(),
    designTokensBuildPlugin(),
    performanceBudgetPlugin(),
    swGeneratorPlugin(),
    ...(shouldAnalyze
      ? [
          visualizer({
            filename: 'analysis/bundle-stats.html',
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ]
      : []),
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
