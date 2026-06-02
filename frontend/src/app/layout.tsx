import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Event Management",
    template: "%s | Event Management",
  },
  description:
    "Nền tảng quản lý sự kiện toàn diện - Tạo, quản lý và tham gia các sự kiện dễ dàng.",
  keywords: ["event", "management", "sự kiện", "quản lý"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={outfit.variable}>
      <body>{children}</body>
    </html>
  );
}
