/**
 * Root page - redirects to login or dashboard based on auth status
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const AUTH_CHECK_TIMEOUT_MS = 10_000

export default function RootPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)

    const checkAuth = async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), AUTH_CHECK_TIMEOUT_MS)
        )
        const userPromise = supabase.auth.getUser().then(({ data: { user } }) => user)
        const user = await Promise.race([userPromise, timeoutPromise])

        if (cancelled) return
        if (!user) {
          router.replace('/login')
          return
        }
        const { data: orgMember } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
        if (cancelled) return
        if (!orgMember) {
          router.replace('/app/dashboard')
          return
        }
        const { data: org } = await supabase.from('organisations').select('onboarding_completed_at').eq('id', orgMember.org_id).single()
        if (cancelled) return
        if (org && org.onboarding_completed_at) {
          router.replace('/app/dashboard')
        } else {
          router.replace('/onboarding')
        }
      } catch (e) {
        if (cancelled) return
        if (e instanceof Error && e.message === 'timeout') {
          setError('Connection is taking too long. Check web-app/.env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set to your Supabase project.')
        } else {
          router.replace('/login')
        }
      }
    }

    checkAuth()
    return () => { cancelled = true }
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-md">
          <p className="text-slate mb-4">{error}</p>
          <Link href="/login" className="text-copper font-semibold underline">Go to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper mb-4"></div>
        <p className="text-slate">Loading...</p>
      </div>
    </div>
  )
}
