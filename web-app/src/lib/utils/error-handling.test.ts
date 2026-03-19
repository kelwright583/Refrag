import { describe, it, expect } from 'vitest'
import { getUserFriendlyError } from './error-handling'

describe('getUserFriendlyError', () => {
  it('returns network error message for network errors', () => {
    expect(getUserFriendlyError(new Error('network failure'))).toBe(
      'Network error. Please check your connection and try again.'
    )
  })

  it('returns network error message for fetch errors', () => {
    expect(getUserFriendlyError(new Error('fetch failed'))).toBe(
      'Network error. Please check your connection and try again.'
    )
  })

  it('returns permission error for unauthorized access', () => {
    expect(getUserFriendlyError(new Error('unauthorized access'))).toBe(
      'You do not have permission to perform this action.'
    )
  })

  it('returns permission error for permission denied', () => {
    expect(getUserFriendlyError(new Error('permission denied'))).toBe(
      'You do not have permission to perform this action.'
    )
  })

  it('returns not found message', () => {
    expect(getUserFriendlyError(new Error('resource not found'))).toBe(
      'The requested resource was not found.'
    )
  })

  it('returns validation error message', () => {
    expect(getUserFriendlyError(new Error('validation error'))).toBe(
      'Invalid input. Please check your data and try again.'
    )
  })

  it('returns validation error for invalid input', () => {
    expect(getUserFriendlyError(new Error('invalid email address'))).toBe(
      'Invalid input. Please check your data and try again.'
    )
  })

  it('returns original message for unrecognized Error instances', () => {
    expect(getUserFriendlyError(new Error('Something specific broke'))).toBe(
      'Something specific broke'
    )
  })

  it('returns generic message for non-Error values', () => {
    expect(getUserFriendlyError('string error')).toBe(
      'An unexpected error occurred. Please try again.'
    )
    expect(getUserFriendlyError(null)).toBe(
      'An unexpected error occurred. Please try again.'
    )
    expect(getUserFriendlyError(undefined)).toBe(
      'An unexpected error occurred. Please try again.'
    )
    expect(getUserFriendlyError(42)).toBe(
      'An unexpected error occurred. Please try again.'
    )
    expect(getUserFriendlyError({ code: 500 })).toBe(
      'An unexpected error occurred. Please try again.'
    )
  })
})
