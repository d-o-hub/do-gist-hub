import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dogisthub.app',
  appName: 'd.o. Gist Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
