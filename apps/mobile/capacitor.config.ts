import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.alpinesbolt.ivote',
  appName: 'iVote',
  // Point at the web build output
  webDir: '../web/dist',
  // In dev, load from the live server instead of bundled files
  server: process.env.NODE_ENV === 'development'
    ? {
        url: 'http://10.0.2.2:5173', // Android emulator localhost alias
        cleartext: true,
      }
    : undefined,
  plugins: {
    StatusBar: {
      style: 'dark',        // dark text on light background
      backgroundColor: '#0a1628',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0a1628',
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: process.env.NODE_ENV === 'development',
  },
  ios: {
    contentInset: 'always',
  },
}

export default config
