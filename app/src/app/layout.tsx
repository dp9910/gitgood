import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GitGood - Learn Anything on GitHub",
  description:
    "Turn any GitHub repository into a personalized AI-powered course",
  openGraph: {
    title: "GitGood - Learn Anything on GitHub",
    description:
      "Turn any GitHub repo into a personalized AI-powered course",
    url: "https://gitgood.online",
    siteName: "GitGood",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitGood - Learn Anything on GitHub",
    description:
      "Turn any GitHub repo into a personalized AI-powered course",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-display antialiased bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
