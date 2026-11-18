import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { Toaster } from "@/components/ui";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const heading = Fraunces({ subsets: ["latin"], variable: "--font-heading", axes: ["SOFT", "opsz"] });

export const metadata: Metadata = {
  title: "Life Ledger",
  description: "Your days, tasks and money in one quiet place.",
  appleWebApp: { capable: true, title: "Life Ledger", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e9",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable}`}>
      <body>
        {children}
        <Toaster />
        <SwRegister />
      </body>
    </html>
  );
}
