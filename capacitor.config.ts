import type { CapacitorConfig } from '@capacitor/cli';

// ⚠️ WORKING PLACEHOLDER — the final app name is TBD; Reza will rename it.
const config: CapacitorConfig = {
  appId: 'ir.fitai.app',
  appName: 'اپ هوشمند بدنسازی',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
