import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Boss - QR Code Generator",
  description: "The ultimate QR code generator for all your needs. Create custom QR codes for URLs and vCards with ease. Download in PNG or SVG format. Fast, free, and user-friendly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
