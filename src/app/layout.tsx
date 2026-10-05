import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinTrack",
  description: "Secure personal finance management and AI financial insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
