import type { Metadata } from "next";
import { Courier_Prime } from "next/font/google";
import { AuthProvider } from "./providers";
import LayoutClient from "@/components/layout/layout-client";
import "./globals.css";

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Routype",
  description:
    "Routype is a home for writers: publish stories, poems, riddles and thoughts in rich markdown and LaTeX, keep a private diary, and race other writers in a multiplayer typing game built from the community's own words.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${courierPrime.variable} antialiased`}>
        <AuthProvider>
          <LayoutClient>{children}</LayoutClient>
        </AuthProvider>
      </body>
    </html>
  );
}
