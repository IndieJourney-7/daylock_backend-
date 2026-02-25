/**
 * Rate Limiting Middleware
 * Protects against DDoS and brute force attacks
 */

import rateLimit from 'express-rate-limit'

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
})

// Strict limiter for authentication endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Moderate limiter for sensitive operations - 20 requests per 15 minutes
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Strict limiter for file uploads - 10 uploads per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Too Many Requests',
    message: 'Upload limit exceeded, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

export default {
  apiLimiter,
  authLimiter,
  sensitiveLimiter,
  uploadLimiter
}
