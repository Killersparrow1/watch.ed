import type { Metadata, Viewport } from "next"
import { Playfair_Display, Outfit } from "next/font/google"
import "./globals.css"

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
})

const outfit = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "watch.ed",
  description: "Tracking what I watch.",
  icons: {
    icon: "/favicon.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "watch.ed",
  },
}

export const viewport: Viewport = {
  themeColor: "#C0392B",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${outfit.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text-primary font-body antialiased">
        {children}
      </body>
    </html>
  )
}
