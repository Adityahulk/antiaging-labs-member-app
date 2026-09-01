import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { ClientAuthGate } from "@/components/client-auth-gate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL("https://app.antiaging-labs.com"),
    title: "Antiaging Labs — Learn What Works for Your Body",
    description: "Bloodwork, DNA and wearable data combined into a personal plan that measures your response and learns what works for you.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Antiaging Labs — Learn What Works for Your Body",
      description: "Build your plan, measure your response and learn what actually works for your body.",
      images: [{ url: "/og-response-twin.png", width: 1730, height: 909, alt: "Antiaging Labs member experience" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Antiaging Labs — Learn What Works for Your Body",
      description: "Build your plan, measure your response and learn what actually works for your body.",
      images: ["/og-response-twin.png"],
    },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider><ClientAuthGate>{children}</ClientAuthGate></AppProvider>
      </body>
    </html>
  );
}
