import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()

function createMockChain(terminalData: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(terminalData),
    insert: vi.fn().mockReturnValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
  return chain
}

let orgSelectChain: any
let updateChain: any
let auditInsertChain: any

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => {
    const sb = {
      from: vi.fn((table: string) => {
        if (table === 'organisations') {
          if (updateChain._shouldUseUpdate) {
            return updateChain
          }
          return orgSelectChain
        }
        if (table === 'audit_log') {
          return auditInsertChain
        }
        return createMockChain({ data: null, error: null })
      }),
    }
    return sb
  },
}))

vi.mock('@/lib/events', () => ({
  trackServerEvent: vi.fn(),
}))

import { checkAndDeductPackCredit } from './credit-gate'

describe('checkAndDeductPackCredit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auditInsertChain = { insert: vi.fn().mockReturnValue({ data: null, error: null }) }
  })

  describe('credits mode', () => {
    it('deducts a credit and returns ok with remaining count', async () => {
      orgSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: {
            billing_mode: 'credits',
            billing_status: 'active',
            report_pack_credits: 5,
            monthly_pack_count: 0,
            monthly_pack_limit: 0,
          },
          error: null,
        }),
      }

      updateChain = {
        _shouldUseUpdate: false,
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: { report_pack_credits: 4 },
          error: null,
        }),
      }

      let callCount = 0
      const originalFrom = vi.fn((table: string) => {
        if (table === 'organisations') {
          callCount++
          if (callCount === 1) return orgSelectChain
          return updateChain
        }
        if (table === 'audit_log') return auditInsertChain
        return createMockChain({ data: null, error: null })
      })

      vi.mocked(await import('@/lib/supabase/service')).createServiceClient = () =>
        ({ from: originalFrom }) as any

      const { checkAndDeductPackCredit: fn } = await import('./credit-gate')
      const result = await fn('org-1', 'user-1')

      expect(result.status).toBe('ok')
      if (result.status === 'ok') {
        expect(result.creditsRemaining).toBe(4)
      }
    })

    it('returns no_credits when credits are 0', async () => {
      orgSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: {
            billing_mode: 'credits',
            billing_status: 'active',
            report_pack_credits: 0,
            monthly_pack_count: 0,
            monthly_pack_limit: 0,
          },
          error: null,
        }),
      }

      let callCount = 0
      vi.mocked(await import('@/lib/supabase/service')).createServiceClient = () =>
        ({
          from: vi.fn((table: string) => {
            if (table === 'organisations') {
              callCount++
              if (callCount === 1) return orgSelectChain
              return orgSelectChain
            }
            if (table === 'audit_log') return auditInsertChain
            return createMockChain({ data: null, error: null })
          }),
        }) as any

      const { checkAndDeductPackCredit: fn } = await import('./credit-gate')
      const result = await fn('org-1')

      expect(result.status).toBe('no_credits')
    })
  })

  describe('subscription mode', () => {
    it('returns ok within subscription limit', async () => {
      const orgData = {
        billing_mode: 'subscription',
        billing_status: 'active',
        report_pack_credits: 0,
        monthly_pack_count: 3,
        monthly_pack_limit: 10,
      }

      orgSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: orgData, error: null }),
      }

      updateChain = {
        _shouldUseUpdate: false,
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: { monthly_pack_count: 4 },
          error: null,
        }),
      }

      let callCount = 0
      vi.mocked(await import('@/lib/supabase/service')).createServiceClient = () =>
        ({
          from: vi.fn((table: string) => {
            if (table === 'organisations') {
              callCount++
              if (callCount === 1) return orgSelectChain
              return updateChain
            }
            if (table === 'audit_log') return auditInsertChain
            return createMockChain({ data: null, error: null })
          }),
        }) as any

      const { checkAndDeductPackCredit: fn } = await import('./credit-gate')
      const result = await fn('org-1', 'user-1')

      expect(result.status).toBe('ok')
      if (result.status === 'ok') {
        expect(result.monthlyUsed).toBe(4)
        expect(result.monthlyLimit).toBe(10)
      }
    })

    it('returns subscription_limit when at limit with no overage credits', async () => {
      const orgData = {
        billing_mode: 'subscription',
        billing_status: 'active',
        report_pack_credits: 0,
        monthly_pack_count: 10,
        monthly_pack_limit: 10,
      }

      orgSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: orgData, error: null }),
      }

      let callCount = 0
      vi.mocked(await import('@/lib/supabase/service')).createServiceClient = () =>
        ({
          from: vi.fn((table: string) => {
            if (table === 'organisations') {
              callCount++
              return orgSelectChain
            }
            if (table === 'audit_log') return auditInsertChain
            return createMockChain({ data: null, error: null })
          }),
        }) as any

      const { checkAndDeductPackCredit: fn } = await import('./credit-gate')
      const result = await fn('org-1')

      expect(result.status).toBe('subscription_limit')
    })
  })

  describe('inactive billing', () => {
    it('returns not_active when billing status is cancelled', async () => {
      const orgData = {
        billing_mode: 'subscription',
        billing_status: 'cancelled',
        report_pack_credits: 5,
        monthly_pack_count: 0,
        monthly_pack_limit: 10,
      }

      orgSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: orgData, error: null }),
      }

      vi.mocked(await import('@/lib/supabase/service')).createServiceClient = () =>
        ({
          from: vi.fn((table: string) => {
            if (table === 'organisations') return orgSelectChain
            if (table === 'audit_log') return auditInsertChain
            return createMockChain({ data: null, error: null })
          }),
        }) as any

      const { checkAndDeductPackCredit: fn } = await import('./credit-gate')
      const result = await fn('org-1')

      expect(result.status).toBe('not_active')
    })

    it('returns not_active when org is not found', async () => {
      orgSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: null, error: { message: 'not found' } }),
      }

      vi.mocked(await import('@/lib/supabase/service')).createServiceClient = () =>
        ({
          from: vi.fn((table: string) => {
            if (table === 'organisations') return orgSelectChain
            if (table === 'audit_log') return auditInsertChain
            return createMockChain({ data: null, error: null })
          }),
        }) as any

      const { checkAndDeductPackCredit: fn } = await import('./credit-gate')
      const result = await fn('org-nonexistent')

      expect(result.status).toBe('not_active')
    })
  })
})
