import { ImageResponse } from "next/og";
import { Logo } from "@/lib/logo";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<Logo size={64} />, size);
}
