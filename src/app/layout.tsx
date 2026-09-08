import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "superpdf",
  description: "A fact knowledge layer for PDFs",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="flex justify-center gap-6 border-b border-zinc-200 px-6 py-3 text-sm">
          <Link href="/" className="hover:text-green-700">
            Documents
          </Link>
          <Link href="/topics" className="hover:text-green-700">
            Topics
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
