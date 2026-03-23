'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FolderOpen, Camera, Calendar, User } from 'lucide-react'
import { useFieldUploadQueue } from '@/hooks/use-field-upload-queue'

const TABS = [
  { label: 'Dashboard', href: '/app/field/dashboard', icon: Home },
  { label: 'Cases', href: '/app/field/cases', icon: FolderOpen },
  { label: 'Capture', href: '/app/field/capture', icon: Camera },
  { label: 'Calendar', href: '/app/field/calendar', icon: Calendar },
  { label: 'Profile', href: '/app/field/profile', icon: User },
] as const

export function FieldBottomNav() {
  const pathname = usePathname()
  const { stats } = useFieldUploadQueue()
  const pendingCount = stats.pending + stats.uploading

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D4CFC7] flex z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Field navigation"
    >
      {TABS.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        const isCapture = label === 'Capture'
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[3.5rem]"
            aria-current={isActive ? 'page' : undefined}
          >
            {isCapture ? (
              <div className="relative">
                <Icon
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2.5 : 1.75}
                  style={{ color: isActive ? '#C72A00' : '#6B6B6B' }}
                />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#C72A00] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
            ) : (
              <Icon
                className="w-5 h-5"
                strokeWidth={isActive ? 2.5 : 1.75}
                style={{ color: isActive ? '#C72A00' : '#6B6B6B' }}
              />
            )}
            <span
              className="text-[10px] font-medium leading-none"
              style={{ color: isActive ? '#C72A00' : '#6B6B6B' }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
