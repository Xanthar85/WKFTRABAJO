import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig & { orientation?: string } = {
  appId: 'com.wkftrabajo.wkftrabajo',
  appName: 'WKF',
  webDir: 'dist',
  orientation: 'portrait',
  plugins: {
    CapacitorUpdater: {
      appId: 'com.wkftrabajo.wkftrabajo',
      version: '0.0.0',
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
