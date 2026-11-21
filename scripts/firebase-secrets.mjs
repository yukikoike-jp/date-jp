// Vercel の本番の環境変数を、Firebase App Hosting の秘密(Cloud Secret Manager)へ移す。
// 値は画面に出さない。Vercel から取り出したファイルは、終わったら消す。
//
// 使い方(どちらも先にログインしておく: npx vercel login / npx firebase-tools login):
//   node scripts/firebase-secrets.mjs <Firebase のプロジェクトID> <App Hosting のバックエンド名>

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";

const [project, backend] = process.argv.slice(2);
if (!project || !backend) {
  console.error("使い方: node scripts/firebase-secrets.mjs <プロジェクトID> <バックエンド名>");
  process.exit(1);
}

// apphosting.yaml に書いた名前だけを移す
const NAMES = [
  "STRIPE_SECRET_KEY", "LICENSE_SECRET", "SUPPORT_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
  "HOTPEPPER_API_KEY", "STATS_TOKEN", "SELLER_NAME", "OPERATOR_NAME", "SELLER_EMAIL", "CONTACT_EMAIL",
];
const FILE = ".env.firebase-move";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

try {
  execFileSync(npx, ["vercel", "env", "pull", FILE, "--environment", "production", "--yes"], { stdio: ["ignore", "ignore", "inherit"] });
  const env = Object.fromEntries(
    readFileSync(FILE, "utf8")
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1").replace(/\\n/g, "\n")]),
  );
  for (const name of NAMES) {
    const value = env[name];
    if (!value) {
      console.log(`- ${name}: Vercel に値がないので飛ばします`);
      continue;
    }
    execFileSync(npx, ["firebase-tools", "apphosting:secrets:set", name, "--project", project, "--data-file", "-", "--force"], {
      input: value,
      stdio: ["pipe", "ignore", "inherit"],
    });
    execFileSync(npx, ["firebase-tools", "apphosting:secrets:grantaccess", name, "--project", project, "--backend", backend], {
      stdio: ["ignore", "ignore", "inherit"],
    });
    console.log(`✓ ${name}`);
  }
} finally {
  if (existsSync(FILE)) rmSync(FILE);
}
console.log("おわり。値は画面に出していません。");
