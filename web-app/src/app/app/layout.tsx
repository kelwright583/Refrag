/**
 * App layout with navigation
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { RefragLogo } from '@/components/brand'
import { NavIcon } from '@/components/NavIcon'

export default async function AppLayout({
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

  const { data: orgMember } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (orgMember) {
    const { data: org } = await supabase
      .from('organisations')
      .select('onboarding_completed_at')
      .eq('id', orgMember.org_id)
      .single()
    if (org && !org.onboarding_completed_at) {
      redirect('/onboarding')
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-[#D4CFC7] bg-white">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-[#D4CFC7] flex flex-col items-center">
            <h1 className="text-xl font-bold tracking-wide text-charcoal mb-1">REFRAG</h1>
            <RefragLogo width={100} height={28} className="mb-2" />
            <p className="font-subtitle text-[10px] tracking-wide text-muted uppercase">FROM EVIDENCE TO OUTCOME</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-0.5">
            <Link
              href="/app/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate rounded-lg hover:bg-[#F5F2EE] transition-colors"
            >
              <NavIcon type="dashboard" />
              Dashboard
            </Link>
            <Link
              href="/app/cases"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate rounded-lg hover:bg-[#F5F2EE] transition-colors"
            >
              <NavIcon type="cases" />
              Cases
            </Link>
            <Link
              href="/app/clients"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate rounded-lg hover:bg-[#F5F2EE] transition-colors"
            >
              <NavIcon type="clients" />
              Clients
            </Link>
            <Link
              href="/app/appointments"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate rounded-lg hover:bg-[#F5F2EE] transition-colors"
            >
              <NavIcon type="calendar" />
              Appointments
            </Link>
            <Link
              href="/app/calendar"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate rounded-lg hover:bg-[#F5F2EE] transition-colors"
            >
              <NavIcon type="calendar" />
              Calendar
            </Link>
            <Link
              href="/app/inbound"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate rounded-lg hover:bg-[#F5F2EE] transition-colors"
            >
              <NavIcon type="dashboard" />
              Inbound
            </Link>
            <Link
              href="/app/invoices"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate rounded-lg hover:bg-[#F5F2EE] transition-colors"
            >
              <NavIcon type="cases" />
              Invoices
            </Link>
            <Link
              href="/app/settings"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate rounded-lg hover:bg-[#F5F2EE] transition-colors"
            >
              <NavIcon type="settings" />
              Settings
            </Link>
          </nav>

          <div className="p-4 border-t border-[#D4CFC7]">
            <div className="px-4 py-2">
              <p className="text-sm font-medium text-slate truncate">{user.email}</p>
              <form action="/auth/signout" method="post" className="mt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 text-sm text-muted hover:text-slate transition-colors"
                >
                  <NavIcon type="logout" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
