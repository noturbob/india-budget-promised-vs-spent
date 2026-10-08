import type { Metadata } from "next";
import { Familjen_Grotesk, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const familjen = Familjen_Grotesk({ subsets: ["latin"], variable: "--font-familjen" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["italic", "normal"], variable: "--font-instrument" });

export const metadata: Metadata = {
  metadataBase: new URL("https://india-budget-promised-vs-spent.vercel.app"),
  twitter: { card: "summary_large_image" },
  title: "Promised vs Spent",
  description:
    "Twenty years of India's Union Budget: what the government announced, and what it actually spent. Read from 32 official budget documents.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${familjen.variable} ${jetbrains.variable} ${instrument.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
