/**
 * Error thrown by apiFetch when the backend returns a non-2xx response.
 * Carries the HTTP status so callers can choose different UX per status.
 */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
