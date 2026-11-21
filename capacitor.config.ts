import type { CapacitorConfig } from "@capacitor/cli";

// Tsudoro のアプリ(iPhone・Android)。Ionic の Capacitor で、本番の www.tsudoro.com をアプリの中で開く(2026-11-21)。
// サーバーの処理(会の保存・お店探し・集金)はそのまま本番を使うので、Web とアプリで中身がずれない。
// 電波がないときだけ capacitor-www/index.html を出す
const config: CapacitorConfig = {
  appId: "com.tsudoro.app",
  appName: "Tsudoro",
  webDir: "capacitor-www",
  server: {
    url: "https://www.tsudoro.com",
    errorPath: "index.html",
  },
  backgroundColor: "#000000",
  plugins: {
    SplashScreen: { launchShowDuration: 800, backgroundColor: "#000000", showSpinner: false },
    StatusBar: { style: "DARK", backgroundColor: "#000000", overlaysWebView: true },
  },
  ios: { contentInset: "never" },
};

export default config;
