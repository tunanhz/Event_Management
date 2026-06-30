import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
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

// Applies the saved (or system) theme before first paint to avoid a flash.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={beVietnamPro.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

