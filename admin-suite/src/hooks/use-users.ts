/**
 * React Query hooks for users (admin)
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUsers,
  getUser,
  updateUser,
  triggerPasswordReset,
} from '@/lib/api/users'
import { UpdateUserInput } from '@/lib/types/admin'

export function useUsers(search?: string) {
  return useQuery({
    queryKey: ['users', search],
    queryFn: () => getUsers(search),
  })
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
    enabled: !!userId,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: UpdateUserInput }) =>
      updateUser(userId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
    },
  })
}

export function useTriggerPasswordReset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => triggerPasswordReset(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
  })
}
