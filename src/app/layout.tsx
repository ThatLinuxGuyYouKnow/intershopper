import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Intershopper — payment links you can share",
  description:
    "Generate hosted Interswitch payment links from a product description and price, then copy or share them on WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
                I
              </span>
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                Intershopper
              </span>
            </Link>
            <span className="text-xs text-slate-400">Powered by Interswitch Pay Bill</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-5 text-center text-xs text-slate-400">
            Payment links are hosted by Interswitch. Always confirm payment status
            server-side before delivering value.
          </div>
        </footer>
      </body>
    </html>
  );
}
