/**
 * Root layout for admin-suite
 */

import type { Metadata } from 'next'
import { Inter, Anek_Bangla } from 'next/font/google'
import './globals.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/Toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const anekBangla = Anek_Bangla({
  subsets: ['latin', 'bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-anek-bangla',
})

export const metadata: Metadata = {
  title: 'Refrag Admin',
  description: 'Refrag internal admin panel',
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
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
