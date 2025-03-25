import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Script from 'next/script';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nützlich - KI-gestützter Schreibassistent",
  description: "Ihr KI-gestützter Schreibassistent für kreatives Schreiben",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link 
          rel="preload" 
          href="/assets/pdf.min.js" 
          as="script" 
          type="text/javascript"
          crossOrigin="anonymous"
        />
        <link 
          rel="preload" 
          href="/assets/pdf.worker.min.js" 
          as="script" 
          type="text/javascript"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-[#f4f4f4]">
          {children}
        </div>
        
        <Script 
          src="/assets/pdf.min.js"
          strategy="afterInteractive"
          id="pdf-script"
        />
        <Script 
          src="/assets/pdf.worker.min.js"
          strategy="lazyOnload"
          id="pdf-worker-script"
        />
      </body>
    </html>
  );
}
