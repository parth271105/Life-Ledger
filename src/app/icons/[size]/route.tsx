import { ImageResponse } from "next/og";
import { Logo } from "@/lib/logo";

export const dynamic = "force-static";
export const generateStaticParams = () => [{ size: "192" }, { size: "512" }];

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const s = (await params).size === "512" ? 512 : 192;
  return new ImageResponse(<Logo size={s} />, { width: s, height: s });
}
