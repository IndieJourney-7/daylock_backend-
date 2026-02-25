/**
 * Security Headers Middleware
 * Implements security best practices using Helmet
 */

import helmet from 'helmet'

// Get allowed origins from environment
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean)

// Helmet configuration for security headers
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://*.supabase.co", "https://*.supabase.in"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://*.supabase.in", ...allowedOrigins],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  // Cross-Origin headers (needed for Supabase)
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // Additional security headers
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // Set referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})

export default securityHeaders
