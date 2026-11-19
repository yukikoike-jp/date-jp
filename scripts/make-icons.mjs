// public/tsudoro-icon.svg から、ブラウザのタブ・ホーム画面のアイコン(PNG)を書き出す
import sharp from "sharp";

const svg = "marketing/icon/account-A.png"; // SNS のアカウントと同じアイコン
const out = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["app/apple-icon.png", 180],
  ["app/icon.png", 64],
];
for (const [file, size] of out) {
  await sharp(svg).resize(size, size).png().toFile(file);
  console.log(file, size);
}
