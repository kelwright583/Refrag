import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function getAuthContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, orgId: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: orgMember } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!orgMember) {
    return { supabase, user, orgId: null, error: NextResponse.json({ error: 'No organisation found' }, { status: 403 }) }
  }

  return { supabase, user, orgId: orgMember.org_id as string, error: null }
}

export function serverError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

// ─── Simple in-memory rate limiter ───────────────────────────────────────────
// Max 100 requests per IP per 60-second window.
const _rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function rateLimitResponse(request: NextRequest): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const now = Date.now()
  const windowMs = 60_000 // 1 minute
  const maxRequests = 100

  const entry = _rateLimitStore.get(ip)

  if (!entry || now > entry.resetAt) {
    _rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
    return null
  }

  entry.count += 1

  if (entry.count > maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    )
  }

  return null
}
