import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "NutriFact Lab — 營養與 Supplement 證據指南",
    template: "%s | NutriFact Lab"
  },
  description: "香港繁中營養與 Supplement 證據平台：成分、用途、證據強度、安全注意與研究來源，一次過睇清。",
  metadataBase: new URL("https://nutrifact-lab-mvp.vercel.app")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
