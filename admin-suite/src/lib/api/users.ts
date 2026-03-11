/**
 * User API functions (admin)
 */

import { User, UserWithOrgs, UpdateUserInput } from '@/lib/types/admin'

/**
 * Get all users
 */
export async function getUsers(search?: string): Promise<UserWithOrgs[]> {
  const params = new URLSearchParams()
  if (search) params.append('search', search)

  const response = await fetch(`/api/admin/users?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch users')
  }

  return response.json()
}

/**
 * Get user by ID
 */
export async function getUser(userId: string): Promise<UserWithOrgs> {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch user')
  }

  return response.json()
}

/**
 * Update user
 */
export async function updateUser(
  userId: string,
  updates: UpdateUserInput
): Promise<User> {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update user')
  }

  return response.json()
}

/**
 * Trigger password reset for user
 */
export async function triggerPasswordReset(userId: string): Promise<void> {
  const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to trigger password reset')
  }
}
