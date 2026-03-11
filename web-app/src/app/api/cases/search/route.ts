/**
 * Search cases API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserOrgId(supabase: any): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !orgMember) {
    throw new Error('No organization found for user')
  }

  return orgMember.org_id
}

/**
 * GET /api/cases/search?q=query - Search cases
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    if (!query) {
      return NextResponse.json([])
    }

    const searchTerm = `%${query}%`

    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('org_id', orgId)
      .or(
        `case_number.ilike."${searchTerm}",client_name.ilike."${searchTerm}",claim_reference.ilike."${searchTerm}"`
      )
      .order('created_at', { ascending: false })
      .limit(50) // Limit search results

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
