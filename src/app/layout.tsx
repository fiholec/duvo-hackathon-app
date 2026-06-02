import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { SapShell } from "@/components/SapShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DEK → Hilti · Zadávání objednávek do SAP (duvo demo)",
  description:
    "Simulace manuálního zadávání objednávek do SAP (DEK → Hilti) a kalkulace úspory času s duvo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StoreProvider>
          <SapShell>{children}</SapShell>
        </StoreProvider>
      </body>
    </html>
  );
}
