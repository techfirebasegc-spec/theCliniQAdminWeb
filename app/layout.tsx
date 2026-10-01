import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../src/providers/auth-provider";

export const metadata: Metadata = {
  title: "The CliniQ | Operations",
  description: "Private operations workspace for The CliniQ.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
