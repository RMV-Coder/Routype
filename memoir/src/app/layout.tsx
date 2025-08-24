import type { Metadata } from "next";
import { Courier_Prime } from "next/font/google";
import { AuthProvider } from "./providers";

import "./globals.css";
import LayoutClient from "@/components/custom/layout-client";

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"]
});

export const metadata: Metadata = {
  title: "Routype",
  description: "Routype is a modern journaling and typing app that helps you build habits, share thoughts, and track your streaks — one keystroke at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
    <html lang="en">
      <body
        className={`${courierPrime.variable} antialiased`}
      >
      <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
    </AuthProvider>
  );
}
