import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

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
      <body className={inter.className}>
        <div className="min-h-screen bg-[#f4f4f4]">
          {children}
        </div>
      </body>
    </html>
  );
}
