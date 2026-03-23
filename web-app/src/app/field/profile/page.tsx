/**
 * Field Profile Page — server component
 * Shows user info, org name, app version and sign-out
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Monitor, LogOut } from 'lucide-react'

const APP_VERSION = 'v1.0.0'

export default async function FieldProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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

  const meta = user.user_metadata as Record<string, string> | null
  const displayName =
    meta?.full_name ||
    meta?.name ||
    `${meta?.first_name ?? ''} ${meta?.last_name ?? ''}`.trim() ||
    user.email?.split('@')[0] ||
    'Unknown'

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Avatar / Name */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#C72A00] flex items-center justify-center text-white text-xl font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-bold text-charcoal">{displayName}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl divide-y divide-[#D4CFC7]">
        {orgName && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted">Organisation</span>
            <span className="text-sm font-medium text-charcoal">{orgName}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted">App version</span>
          <span className="text-sm font-medium text-charcoal">{APP_VERSION}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Link
          href="/app/dashboard"
          className="flex items-center gap-3 w-full bg-white border border-[#D4CFC7] rounded-xl px-4 py-3 text-sm font-medium text-charcoal hover:bg-[#FAFAF8] transition-colors"
        >
          <Monitor className="w-5 h-5 text-muted shrink-0" />
          Switch to Desktop
        </Link>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex items-center gap-3 w-full bg-white border border-[#D4CFC7] rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}
