import { Montserrat, Nunito_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { getAppBaseUrl } from "@/lib/app-url";
import { DESKTOP_SCALE_SCRIPT } from "@/lib/desktop-scale-script";
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
const APP_TITLE = "Desafío MiPyme | Portal de Asesorías";
const APP_DESCRIPTION =
  "Portal de asesorías del Desafío Nacional MiPyme AIEP";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 10,
  userScalable: true,
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
    <html
      lang="es"
      className={`${nunito.variable} ${montserrat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="page-shell h-full min-h-full font-sans">
        <Script
          id="desktop-scale"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: DESKTOP_SCALE_SCRIPT }}
        />
        {children}
      </body>
    </html>
  );
}
