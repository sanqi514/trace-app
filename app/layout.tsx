import type { Metadata, Viewport } from "next";
import "./globals.css";
import SWRegister from "@/components/SWRegister";

export const metadata: Metadata = {
  title: "Trace · 个人记录与 AI 复盘",
  description: "本地优先的灵感 / 趣事 / 复盘记录与 AI 整理工具",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Trace",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f1ec",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
