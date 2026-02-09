/**
 * Daylock Backend API
 * Express.js server with Supabase for database
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { corsOptions } from './config/index.js'
import { errorHandler, notFoundHandler } from './middleware/index.js'
import routes from './routes/index.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`)
    next()
  })
}

// API Routes
app.use('/api', routes)

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Daylock API',
    version: '1.0.0',
    status: 'running'
  })
})

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Daylock API Server running!
   
   Local:   http://localhost:${PORT}
   Health:  http://localhost:${PORT}/api/health
   
   Environment: ${process.env.NODE_ENV || 'development'}
  `)
})

export default app
