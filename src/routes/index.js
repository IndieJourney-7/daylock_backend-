/**
 * Routes Index
 * Aggregates all API routes
 */

import { Router } from 'express'
import { authenticate } from '../middleware/index.js'

import profileRoutes from './profile.js'
import roomsRoutes from './rooms.js'
import attendanceRoutes from './attendance.js'
import invitesRoutes from './invites.js'
import rulesRoutes from './rules.js'
import analyticsRoutes from './analytics.js'
import galleryRoutes from './gallery.js'

const router = Router()

// Health check (public)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  })
})

// All routes below require authentication
router.use('/profile', authenticate, profileRoutes)
router.use('/rooms', authenticate, roomsRoutes)
router.use('/attendance', authenticate, attendanceRoutes)
router.use('/invites', authenticate, invitesRoutes)
router.use('/rules', authenticate, rulesRoutes)
router.use('/analytics', authenticate, analyticsRoutes)
router.use('/gallery', authenticate, galleryRoutes)

export default router
