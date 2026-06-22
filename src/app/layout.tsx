import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lingua — ES · IT · FR",
  description: "Personal trainer for Spanish, Italian and French fluency",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
