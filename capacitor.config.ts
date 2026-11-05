import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig & { orientation?: string; version?: string } = {
  appId: 'com.wkftrabajo.wkftrabajo',
  appName: 'WKFTrabajo',
  version: '0.1.9',
  webDir: 'dist',
  orientation: 'portrait',
  plugins: {
    CapacitorUpdater: {
      appId: 'com.wkftrabajo.wkftrabajo',
      version: '0.1.9',
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
// capacitor.config.ts