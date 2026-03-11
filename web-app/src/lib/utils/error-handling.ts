/**
 * Error handling utilities
 */

export interface AppError {
  message: string
  code?: string
  statusCode?: number
  details?: Record<string, any>
}

/**
 * Create user-friendly error message
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    // Handle common error patterns
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'You do not have permission to perform this action.'
    }
    if (error.message.includes('not found')) {
      return 'The requested resource was not found.'
    }
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'Invalid input. Please check your data and try again.'
    }
    return error.message
  }
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Log error (for future error monitoring integration)
 */
export function logError(error: unknown, context?: Record<string, any>) {
  console.error('Application error:', error, context)
  // TODO: Integrate with error monitoring service (e.g., Sentry, LogRocket)
}

/**
 * Handle API error response
 */
export async function handleApiError(response: Response): Promise<never> {
  let errorMessage = 'An error occurred'
  try {
    const errorData = await response.json()
    errorMessage = errorData.error || errorMessage
  } catch {
    errorMessage = `HTTP ${response.status}: ${response.statusText}`
  }
  throw new Error(errorMessage)
}
