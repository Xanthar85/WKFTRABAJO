import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig & { orientation?: string } = {
  appId: 'com.wkf.app',
  appName: 'WKF',
  webDir: 'dist',
  orientation: 'portrait',
  plugins: {
    CapacitorUpdater: {
      appId: 'com.wkf.app',
      version: '0.1.1',
      defaultChannel: 'production',
      autoUpdate: 'always',
      autoSplashscreen: true
    },
    SplashScreen: {
      launchAutoHide: false
    }
  }
};

export default config;
