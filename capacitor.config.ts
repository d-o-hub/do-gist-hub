import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gisthub.app',
  appName: 'Gist Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
