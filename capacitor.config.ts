// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig & { orientation?: string; version?: string } = {
  appId: 'com.wkftrabajo.wkftrabajo',
  appName: 'WKFTrabajo',
  version: '0.1.10',
  webDir: 'dist',
  orientation: 'portrait',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0
    }
  }
};

export default config;
// capacitor.config.ts