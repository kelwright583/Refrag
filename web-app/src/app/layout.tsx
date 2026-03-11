import type { Metadata, Viewport } from 'next'
import { Inter, Anek_Bangla } from 'next/font/google'
import './globals.css'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const anekBangla = Anek_Bangla({
  subsets: ['latin', 'bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-anek-bangla',
})

export const metadata: Metadata = {
  title: 'Refrag - Professional Workflow OS',
  description: 'Professional workflow OS for assessors/inspectors',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#C72A00',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${anekBangla.variable}`} suppressHydrationWarning>
      <body className="font-body" style={{ fontFamily: inter.style.fontFamily }} suppressHydrationWarning>
        <ErrorBoundary>
          <ReactQueryProvider>
            <GoogleMapsProvider>
              {children}
              <PWAInstallPrompt />
            </GoogleMapsProvider>
          </ReactQueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
