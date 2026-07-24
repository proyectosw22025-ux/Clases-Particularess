import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ClasesYa - Encuentra tu profesor particular",
  description: "Plataforma de clases particulares. Conecta con los mejores profesores, reserva clases y aprende a tu ritmo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen flex flex-col`}
      >
        <ConfirmProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ConfirmProvider>
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  );
}
