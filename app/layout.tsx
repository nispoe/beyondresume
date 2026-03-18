import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "John Matchmaker Agent",
  description: "Two-agent talent matching prototype for John and employer conversations."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
