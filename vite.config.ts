import { defineConfig, Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

/**
 * Reads app.config.ts and injects values into index.html
 * so the HTML title and meta tags derive from the single source of truth.
 */
function appConfigHtmlPlugin(): Plugin {
  const env = process.env;
  const appName = env.VITE_APP_NAME || 'd.o. Gist Hub';
  const appDesc = env.VITE_APP_DESCRIPTION || '';
  const themeColor = env.VITE_APP_THEME_COLOR || '#2563eb';

  return {
    name: 'app-config-html',
    transformIndexHtml(html) {
      return html
        .replaceAll('%VITE_APP_NAME%', appName)
        .replaceAll('%VITE_APP_DESCRIPTION%', appDesc)
        .replaceAll('%VITE_APP_THEME_COLOR%', themeColor);
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

export default defineConfig({
  plugins: [
    appConfigHtmlPlugin(),
    manifestPlugin(),
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
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
  },
  server: {
    port: 3000,
    host: true,
  },
});
