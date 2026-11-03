import type { CapacitorConfig } from '@capacitor/cli';

// Final app name: Musclepro (ماسل پرو). Package id stays ir.fitai.app
// so existing installs update in place — never change the package id.
const config: CapacitorConfig = {
  appId: 'ir.fitai.app',
  appName: 'Musclepro',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
