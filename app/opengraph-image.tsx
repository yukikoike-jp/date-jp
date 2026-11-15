import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "つどろ 飲み会を、URLを貼るだけで決める";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage();
}
