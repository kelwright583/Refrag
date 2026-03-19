/**
 * System health API route handler (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

async function verifyStaff(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: staff, error } = await supabase
    .from('staff_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (error || !staff) {
    throw new Error('Not authorized - staff access required')
  }

  return staff.id
}

/**
 * GET /api/admin/system-health - Get system health data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await verifyStaff(supabase)

    const adminClient = createAdminClient()

    let totalStorage = 0
    const bucketSizes: Record<string, number> = {}

    const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets()
    if (!bucketsError && buckets) {
      for (const bucket of buckets) {
        const { data: files } = await adminClient.storage.from(bucket.name).list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        })

        let bucketSize = 0
        if (files) {
          for (const file of files) {
            if (file.metadata?.size) {
              bucketSize += file.metadata.size
            }
          }
        }
        bucketSizes[bucket.name] = bucketSize
        totalStorage += bucketSize
      }
    }

    return NextResponse.json({
      storage: {
        total_storage: totalStorage,
        buckets: bucketSizes,
        evidence_storage: bucketSizes['evidence'] ?? 0,
        exports_storage: bucketSizes['exports'] ?? 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
