/**
 * Admin layout with navigation
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import { RefragLogo } from '@/components/brand'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Verify staff status
  const { data: staff } = await supabase
    .from('staff_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!staff) {
    redirect('/admin/access-denied')
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center gap-2 shrink-0">
                <RefragLogo width={100} height={28} className="mr-2" />
                <span className="text-xl font-heading font-bold text-charcoal">Admin</span>
              </div>
              <div className="flex space-x-4">
                <Link href="/admin" className="text-sm text-slate hover:text-charcoal">Dashboard</Link>
                <Link href="/admin/orgs" className="text-sm text-slate hover:text-charcoal">Organisations</Link>
                <Link href="/admin/users" className="text-sm text-slate hover:text-charcoal">Users</Link>
                <Link href="/admin/cases" className="text-sm text-slate hover:text-charcoal">Cases</Link>
                <Link href="/admin/exports" className="text-sm text-slate hover:text-charcoal">Exports</Link>
                <Link href="/admin/analytics" className="text-sm text-slate hover:text-charcoal">Analytics</Link>
                <Link href="/admin/insights" className="text-sm text-slate hover:text-charcoal">Insights</Link>
                <Link href="/admin/system-health" className="text-sm text-slate hover:text-charcoal">System Health</Link>
                <Link href="/admin/audit" className="text-sm text-slate hover:text-charcoal">Audit Logs</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate">{user.email}</span>
              <span className="text-xs text-slate">({staff.role})</span>
              <form action="/admin/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm text-copper hover:opacity-80"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </main>
    </div>
  )
}
