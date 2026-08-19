import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;

  return {
    title: "Antiaging Labs — Your Member Experience",
    description: "Your living health map, personalized protocol, reports, and daily guidance.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Antiaging Labs — Your health, connected",
      description: "Explore your living health map and follow a protocol built around your data.",
      images: [{ url: image, width: 1730, height: 909, alt: "Antiaging Labs member experience" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Antiaging Labs — Your health, connected",
      description: "Explore your living health map and follow a protocol built around your data.",
      images: [image],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
