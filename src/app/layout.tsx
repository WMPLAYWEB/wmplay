import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WMPLAY - Filmes, Séries & TV ao Vivo",
  description: "WMPLAY - Plataforma completa de streaming e TV ao vivo com mais de 38.000 títulos",
  referrer: "no-referrer",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WMPLAY",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className="min-h-full antialiased overflow-hidden transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
