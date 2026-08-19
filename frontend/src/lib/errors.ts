/**
 * Error thrown by apiFetch when the backend returns a non-2xx response.
 * Carries the HTTP status codes so callers can choose different UX per status.
 * Error class only carry message, not helpful for deterministic behaviour
 */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
