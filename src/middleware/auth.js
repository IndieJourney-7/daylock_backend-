/**
 * Authentication Middleware
 * Validates Supabase JWT tokens using Supabase Auth API
 * Works with both legacy HS256 and new ECC (P-256) keys
 */

import { supabaseAdmin } from '../config/supabase.js'

/**
 * Middleware to verify Supabase JWT token
 * Uses supabase.auth.getUser() for reliable token validation
 */
export async function authenticate(req, res, next) {
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
    
    // Verify token using Supabase Auth API
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      console.log('Auth failed:', error?.message || 'No user found')
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: error?.message || 'Invalid token' 
      })
    }
    
    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      aud: user.aud
    }
    
    console.log(`Auth success: ${user.email} (${user.id})`)
    next()
  } catch (error) {
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
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null
    return next()
  }
  
  try {
    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (user && !error) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        aud: user.aud
      }
    } else {
      req.user = null
    }
    next()
  } catch {
    req.user = null
    next()
  }
}
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
