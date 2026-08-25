import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Phonely | KI-Telefonassistent",
  description: "Intelligenter Telefonassistent für Kleinunternehmen. Termine buchen, Fragen beantworten, 24/7 erreichbar.",
  openGraph: {
    title: "Phonely | KI-Telefonassistent",
    description: "Intelligenter Telefonassistent für Kleinunternehmen",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-[#0a0a0a] text-white font-sans">
        {children}
      </body>
    </html>
  );
}