import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RmBg - Remove Image Background",
  description: "Remove image backgrounds with one click. Powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
