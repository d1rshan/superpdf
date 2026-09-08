import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "superpdf",
  description: "A fact knowledge layer for PDFs",
};

const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* ponytail: static inline script — must run before paint to avoid theme flash */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static string, no user input */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <nav className="flex justify-between items-center border-b border-line px-6 py-3 text-sm">
          <div className="flex gap-6">
            <Link href="/" className="hover:text-accent">
              Documents
            </Link>
            <Link href="/topics" className="hover:text-accent">
              Topics
            </Link>
          </div>
          <ThemeToggle />
        </nav>
        {children}
      </body>
    </html>
  );
}
