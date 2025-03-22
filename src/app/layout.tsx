import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
        <div className="min-h-screen bg-white">
          <header className="bg-white border-b border-gray-200">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <img src="/Logo-nuetzlich-gruen.svg" alt="Nützlich Logo" className="h-10 mb-1.5" />
            </div>
          </header>
          <main className="flex h-[calc(100vh-4rem)]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
