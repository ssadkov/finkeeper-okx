import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SolanaWalletConnect from './components/SolanaWalletConnect';
import Sidebar from './components/Sidebar';
import { WalletProvider } from './context/WalletContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinKeeper OKX (Solana edition)",
  description: "FinKeeper OKX - Solana DeFi Protocol Explorer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <WalletProvider>
          <div className="h-screen flex flex-col bg-gray-50">
            <header className="bg-white shadow-sm">
              <div className="pl-4 pr-4 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">FinKeeper OKX</h1>
                <SolanaWalletConnect />
              </div>
            </header>
            <div className="flex-1 flex overflow-hidden">
              <Sidebar />
              <main className="flex-1 flex flex-col overflow-hidden">
                {children}
              </main>
            </div>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
