import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SolanaWalletConnect from './components/SolanaWalletConnect';
import Sidebar from './components/Sidebar';
import { WalletProvider } from './context/WalletContext';
import { WalletProvider as CustomWalletProvider } from './components/WalletProvider';
import { OkxProvider } from './context/OkxContext';
import TopPanel from './components/TopPanel';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
          <CustomWalletProvider>
            <OkxProvider>
              <div className="h-screen flex flex-col bg-gray-50">
                <TopPanel />
                <div className="flex-1 flex overflow-hidden">
                  <Sidebar />
                  <main className="flex-1 flex flex-col overflow-hidden">
                    {children}
                  </main>
                </div>
              </div>
            </OkxProvider>
          </CustomWalletProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
