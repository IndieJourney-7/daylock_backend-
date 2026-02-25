/**
 * CORS Configuration
 */

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean)

export const corsOptions = {
  origin: (origin, callback) => {
    // In production, require origin header
    if (!origin) {
      // Allow no-origin requests only in development (for Postman, curl, etc.)
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true)
      }
      return callback(new Error('Origin header required'))
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`Blocked request from unauthorized origin: ${origin}`)
      callback(new Error(`Not allowed by CORS: ${origin}`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours - cache preflight requests
}

export default corsOptions
