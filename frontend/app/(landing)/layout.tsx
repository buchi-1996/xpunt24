import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../globals.css";
import Footer from "@/components/footer/Footer";
import Providers from "@/context/Providers";
import HeaderSwitcher from "@/components/header/HeaderSwitcher";
import BottomNav from "@/components/bottomNav";
import UnverifiedEmailBanner from "@/components/auth/UnverifiedEmailBanner";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"], // Choose the subset you need
  weight: ["300", "400", "500", "600", "700", "800"], // Select weights
  variable: "--font-plus-jakarta-sans", // Optional: Use CSS variable
});



export const metadata: Metadata = {
  title: {
    template: '%s | Xpunt24',
    default: 'Xpunt24 — Peer-to-Peer Sports Challenges',
  },
  description: 'Xpunt24 lets you challenge other fans with real money peer-to-peer sports wagers. Pick your side, set your stake, and find an opponent.',
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.className} overflow-x-hidden antialiased bg-[#F1F3FF]`}
      >
        <Providers>
          <HeaderSwitcher />
          <UnverifiedEmailBanner />
          {children}
          <BottomNav />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
