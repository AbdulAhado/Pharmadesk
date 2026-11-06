import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PharmaDesk — Licensing & Cryptographic Authority",
  description: "Enterprise Licensing Portal & Hardware Keying Authority for PharmaDesk",
  icons: {
    icon: "/pharma-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-[#F5F7F8] text-[#1E293B]">
        {children}
      </body>
    </html>
  );
}
