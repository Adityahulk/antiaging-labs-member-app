import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { AuthGate } from "./auth-gate";

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
  const image = `${protocol}://${host}/og-response-twin.png`;

  return {
    title: "Antiaging Labs — Learn What Works for Your Body",
    description: "Bloodwork, DNA and wearable data combined into a personal plan that measures your response and learns what works for you.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Antiaging Labs — Learn What Works for Your Body",
      description: "Build your plan, measure your response and learn what actually works for your body.",
      images: [{ url: image, width: 1730, height: 909, alt: "Antiaging Labs member experience" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Antiaging Labs — Learn What Works for Your Body",
      description: "Build your plan, measure your response and learn what actually works for your body.",
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
        <AuthGate><AppProvider>{children}</AppProvider></AuthGate>
      </body>
    </html>
  );
}
