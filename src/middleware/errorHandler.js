/**
 * Error Handler Middleware
 * Centralized error handling for the API
 */

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message)
    this.statusCode = statusCode
    this.details = details
    this.isOperational = true
  }
}

/**
 * Not Found handler
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  })
}

/**
 * Global error handler
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err)
  
  // Handle ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details
    })
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    })
  }
  
  // Handle Supabase/PostgreSQL errors
  if (err.code) {
    // Unique constraint violation
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Resource already exists'
      })
    }
    
    // Foreign key violation
    if (err.code === '23503') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Referenced resource does not exist'
      })
    }
  }
  
  // Default to 500
  const statusCode = err.statusCode || 500
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message
  
  res.status(statusCode).json({
    error: 'Internal Server Error',
    message
  })
}

export default errorHandler
