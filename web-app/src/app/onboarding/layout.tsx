/**
 * Onboarding layout — no sidebar, full-width wizard
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { RefragLogo } from '@/components/brand'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: orgMember } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!orgMember) {
    redirect('/app/dashboard')
  }

  const { data: org } = await supabase
    .from('organisations')
    .select('onboarding_completed_at')
    .eq('id', orgMember.org_id)
    .single()

  if (org?.onboarding_completed_at) {
    redirect('/app/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-[#D4CFC7] px-6 py-4 flex items-center justify-between">
        <Link href="/app/dashboard" className="text-sm text-slate hover:text-charcoal">
          <RefragLogo width={100} height={28} />
        </Link>
        <span className="text-sm text-muted">Setup</span>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>
    </div>
  )
}
