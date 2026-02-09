/**
 * Authentication Middleware
 * Validates Supabase JWT tokens
 */

import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET

// Log if JWT_SECRET is missing on startup
if (!JWT_SECRET) {
  console.error('⚠️  WARNING: SUPABASE_JWT_SECRET is not set!')
}

/**
 * Middleware to verify Supabase JWT token
 * Extracts user info and attaches to req.user
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth failed: Missing or invalid authorization header')
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header' 
      })
    }
    
    const token = authHeader.split(' ')[1]
    
    if (!token) {
      console.log('Auth failed: No token provided')
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No token provided' 
      })
    }

    if (!JWT_SECRET) {
      console.error('Auth failed: SUPABASE_JWT_SECRET not configured')
      return res.status(500).json({
        error: 'Server Configuration Error',
        message: 'JWT secret not configured'
      })
    }
    
    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // Attach user info to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      aud: decoded.aud
    }
    
    console.log(`Auth success: ${decoded.email} (${decoded.sub})`)
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Token expired' 
      })
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid token' 
      })
    }
    
    console.error('Auth middleware error:', error)
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Authentication failed' 
    })
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work for both auth and non-auth users
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null
    return next()
  }
  
  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role
    }
  } catch (error) {
    req.user = null
  }
  
  next()
}

export default authenticate
