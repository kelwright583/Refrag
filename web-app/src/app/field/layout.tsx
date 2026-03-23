/**
 * Field layout — mobile-native shell for field operatives
 * Server component: checks auth, fetches org name
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FieldBottomNav } from '@/components/field/FieldBottomNav'
import { PWAInstallBanner } from '@/components/field/PWAInstallBanner'

export default async function FieldLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch org name
  let orgName = ''
  const { data: orgMember } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (orgMember?.org_id) {
    const { data: org } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', orgMember.org_id)
      .single()
    orgName = org?.name ?? ''
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[100vw] overflow-x-hidden">
      {/* Top header */}
      <header
        className="bg-white border-b border-[#D4CFC7] px-4 py-3 flex items-center gap-3 sticky top-0 z-30"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <span className="text-base font-bold tracking-wide text-charcoal">REFRAG</span>
        {orgName && (
          <span className="text-xs text-muted truncate flex-1">{orgName}</span>
        )}
        <Link
          href="/app/dashboard"
          className="ml-auto text-xs text-[#C72A00] font-medium shrink-0 hover:underline"
        >
          Switch to Desktop
        </Link>
      </header>

      {/* PWA install banner (dismissable) */}
      <PWAInstallBanner />

      {/* Main content area — padded so content clears the fixed bottom nav */}
      <main
        className="flex-1 overflow-auto"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </main>

      {/* Bottom navigation */}
      <FieldBottomNav />
    </div>
  )
}
