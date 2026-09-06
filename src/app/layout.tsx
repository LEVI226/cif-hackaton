import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CIF Sentinel · Conformité LBC/FT/FP pour IMF",
  description: "Plateforme de filtrage des clients et de lutte contre le blanchiment de capitaux, le financement du terrorisme et la prolifération des armes de destruction massive. Conçue pour les Coopératives financières membres de la CIF.",
  keywords: ["LBC", "FT", "FP", "Conformité", "IMF", "CIF", "PPE", "Sanctions", "BCEAO", "UEMOA", "DigiCoop"],
  authors: [{ name: "CIF - DigiCoop-WA+" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
