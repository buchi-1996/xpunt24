import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../globals.css";
import Footer from "@/components/footer/Footer";
import Providers from "@/context/Providers";
import HeaderSwitcher from "@/components/header/HeaderSwitcher";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"], // Choose the subset you need
  weight: ["300", "400", "500", "600", "700", "800"], // Select weights
  variable: "--font-plus-jakarta-sans", // Optional: Use CSS variable
});

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Register",
  description: "Create an Xpunt24 account",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.className} antialiased bg-[#F1F3FF]`}
      >
        <Providers>
          <HeaderSwitcher />

          <div className="container">
            <div className="sm:min-h-screen flex flex-col items-center  justify-center">
              <main className="py-10 flex flex-col justify-center">
                {children}
              </main>
            </div>
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
