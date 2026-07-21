import rateLimit from 'express-rate-limit'

/**
 * Rate limiter for authentication endpoints (login, register, accept-invite)
 * Protects from brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter for invite and password reset endpoints
 * Protects from spam and abuse
 */
/**
 * Rate limiter for public form submissions (spam protection alongside the
 * honeypot field). Generous enough for legitimate visitors.
 */
export const formSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many submissions, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

export const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per windowMs
  message: 'Too many invite or reset requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})
