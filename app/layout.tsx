import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Agent Talent Matching Prototype",
  description:
    "MIT Impact Project for Beyond Resume: John and an employer AI interview each other while an evaluator agent assesses job fit.",
  openGraph: {
    title: "AI Agent Talent Matching Prototype",
    description:
      "MIT Impact Project for Beyond Resume: John and an employer AI interview each other while an evaluator agent assesses job fit."
  },
  twitter: {
    title: "AI Agent Talent Matching Prototype",
    description:
      "MIT Impact Project for Beyond Resume: John and an employer AI interview each other while an evaluator agent assesses job fit."
  }
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
