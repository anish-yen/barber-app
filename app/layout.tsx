import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daz Barber - Waitlist",
  description: "Join the waitlist for Daz Barber",
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

