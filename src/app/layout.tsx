import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
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
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-1.5 focus:text-sm focus:text-accent-ink"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 font-editorial text-xl"
              >
                <span aria-hidden className="size-2 bg-accent" />
                superpdf
              </Link>
              <NavLinks />
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
