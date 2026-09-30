import { Montserrat, Nunito_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { getAppBaseUrl } from "@/lib/app-url";
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

const APP_NAME = "Desafío MiPyme";
const APP_TITLE = "Desafío MiPyme | Portal de Mentorías";
const APP_DESCRIPTION =
  "Portal de mentorías del Desafío Nacional MiPyme AIEP";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
  applicationName: APP_NAME,
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  openGraph: {
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${nunito.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="page-shell h-full min-h-full font-sans">{children}</body>
    </html>
  );
}
