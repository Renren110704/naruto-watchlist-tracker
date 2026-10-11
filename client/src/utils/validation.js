// Mirrors the server-side rules in server/routes/authRoutes.js.

export function validateUsername(username) {
  if (!username) return 'Username is required'
  if (username.length < 3 || username.length > 30) return 'Username must be 3–30 characters'
  if (!/^[A-Za-z0-9_.-]+$/.test(username)) return 'Use only letters, numbers, dots, dashes and underscores'
  return null
}

export function validatePassword(password) {
  if (!password) return 'Password is required'
  if (password.length < 8 || password.length > 128) return 'Password must be 8–128 characters'
  if (!/[A-Za-z]/.test(password)) return 'Password must contain a letter'
  if (!/\d/.test(password)) return 'Password must contain a number'
  return null
}
