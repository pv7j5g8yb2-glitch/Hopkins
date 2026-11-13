import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/literata";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lincoln",
  description: "Lincoln runs immigration cases for law firms. A licensed attorney reviews and signs everything.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fbfaf9" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
