import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

export interface EventProps {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Client-side event tracking via the /api/events/track endpoint.
 * Fire-and-forget — never blocks the calling action or throws.
 */
export async function trackEvent(
  eventName: string,
  props?: EventProps,
  vertical?: string,
): Promise<void> {
  try {
    fetch('/api/events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_props: props ?? {},
        vertical: vertical ?? undefined,
      }),
    }).catch(() => {})
  } catch {
    // Telemetry must never break the app
  }
}

/**
 * Server-side event tracking — inserts directly into platform_events.
 * Designed for use inside API routes where auth context is already resolved.
 */
export async function trackServerEvent(
  eventName: string,
  props?: EventProps,
  context?: { orgId?: string; userId?: string; vertical?: string },
): Promise<void> {
  try {
    const supabase = await createServerSupabase()

    let orgId = context?.orgId
    let userId = context?.userId

    if (!orgId || !userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = userId ?? user.id
        if (!orgId) {
          const { data: orgMember } = await supabase
            .from('org_members')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)
            .single()
          orgId = orgMember?.org_id ?? undefined
        }
      }
    }

    void Promise.resolve(
      supabase
        .from('platform_events')
        .insert({
          org_id: orgId ?? null,
          user_id: userId ?? null,
          event_name: eventName,
          event_props: props ?? {},
          vertical: context?.vertical ?? null,
        })
    ).catch(() => {})
  } catch {
    // Telemetry must never break the app
  }
}

/**
 * React hook for client-side event tracking.
 * Returns a stable fire-and-forget function that sends events via the API route.
 */
export function useTrackEvent(): (eventName: string, props?: EventProps) => void {
  return (eventName: string, props?: EventProps) => {
    trackEvent(eventName, props).catch(() => {})
  }
}
