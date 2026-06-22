import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Go Talk — ES · IT · FR",
  description: "Personal trainer for Spanish, Italian and French fluency",
};

const themeInit = `(function(){try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        {children}
      </body>
    </html>
  );
}
