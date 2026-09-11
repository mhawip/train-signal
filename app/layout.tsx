import type { Metadata } from "next";
import Link from "next/link";
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
      <body>
        <a href="#main-content" className="ts-skip-link">
          Skip to main content
        </a>

        <header className="ts-header">
          <Link href="/" className="ts-header__link">
            Train Signal
          </Link>
        </header>

        {children}

        <footer className="ts-footer">
          <p>
            <Link href="/about" className="ts-footer__link">
              About the data
            </Link>
            {" · "}
            <Link href="/accessibility" className="ts-footer__link">
              Accessibility statement
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
