import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Train Signal",
  description:
    "Find out when you are likely to have good mobile signal on your train journey.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
