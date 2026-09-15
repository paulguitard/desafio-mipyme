import { Montserrat, Nunito_Sans } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AIEP | Portal de casos",
  description: "Casos, evaluaciones y correcciones",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${nunito.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="page-shell h-full min-h-full font-sans">{children}</body>
    </html>
  );
}
