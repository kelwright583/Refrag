/**
 * Check if report can be marked as ready (mandate completion check)
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
 * GET /api/cases/[caseId]/reports/check-ready - Check if mandate requirements are complete
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    // Check if case has a mandate assigned
    const { data: caseMandate, error: mandateError } = await supabase
      .from('case_mandates')
      .select('mandate_id')
      .eq('case_id', params.id)
      .eq('org_id', orgId)
      .single()

    if (mandateError || !caseMandate) {
      return NextResponse.json({
        can_mark_ready: true,
        message: 'No mandate assigned to this case',
      })
    }

    // Get all requirement checks for this case
    const { data: requirementChecks, error: checksError } = await supabase
      .from('requirement_checks')
      .select('status')
      .eq('case_id', params.id)
      .eq('org_id', orgId)

    if (checksError) throw checksError

    // Check if any requirement is still 'missing'
    const hasMissingRequirements =
      requirementChecks && requirementChecks.some((check: any) => check.status === 'missing')

    if (hasMissingRequirements) {
      return NextResponse.json({
        can_mark_ready: false,
        message: 'All mandate requirements must be provided or marked as not applicable before marking report as ready',
        missing_count: requirementChecks.filter((check: any) => check.status === 'missing').length,
        total_count: requirementChecks.length,
      })
    }

    return NextResponse.json({
      can_mark_ready: true,
      message: 'All requirements are complete',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
