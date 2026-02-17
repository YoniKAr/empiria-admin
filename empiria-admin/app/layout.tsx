import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Empiria Admin",
  description: "Platform administration for Empiria India",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
