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
        <div className="min-h-screen bg-[#fafafa]">
          <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="max-w-[2000px] mx-auto px-6 py-4 flex justify-between items-center">
              <img src="/Logo-nuetzlich-gruen.svg" alt="Nützlich Logo" className="h-8" />
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm">
                <div className="w-6 h-6 rounded-full bg-[#2c2c2c] flex items-center justify-center text-white text-xs font-medium">
                  CF
                </div>
                <span className="text-gray-700">Carsten</span>
              </button>
            </div>
          </header>
          <main className="pt-16">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
