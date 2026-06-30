import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EventBox - Nền tảng sự kiện hàng đầu",
    template: "%s | EventBox",
  },
  description:
    "Khám phá vô vàn sự kiện âm nhạc, sân khấu, thể thao, workshop & quản lý sự kiện trực tuyến thật dễ dàng trên EventBox.",
  keywords: ["event", "management", "sự kiện", "quản lý", "vé", "ticketbox"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

