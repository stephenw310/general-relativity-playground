import type { Metadata } from "next";
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
  metadataBase: new URL("https://universelab.org"),
  title: {
    default: "Universe Lab",
    template: "%s | Universe Lab",
  },
  description:
    "Play with spacetime through interactive simulations of gravity, light, time, motion, black holes, and gravitational waves.",
  openGraph: {
    type: "website",
    url: "https://universelab.org",
    siteName: "Universe Lab",
    title: "Universe Lab",
    description:
      "Play with spacetime through interactive simulations of gravity, light, time, motion, black holes, and gravitational waves.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
