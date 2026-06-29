const RESERVED_USERNAMES = new Set([
  'login',
  'signup',
  'logout',
  'verify',
  'profile',
  'upload',
  'portfolio',
  'health',
  'api',
  'v1',
  'admin',
  'dashboard',
  'about',
  'contact',
  'help',
  'terms',
  'privacy',
  'settings',
  'submissions',
  'users',
  'photos',
  'u',
  'p',
])

export function isValidUsername(username: string): boolean {
  if (!username || username.length < 4) return false
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return false
  if (RESERVED_USERNAMES.has(username.toLowerCase())) return false
  return true
}
