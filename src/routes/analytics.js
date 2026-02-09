/**
 * Analytics Routes
 * /api/analytics
 */

import { Router } from 'express'
import { analyticsService } from '../services/analyticsService.js'

const router = Router()

/**
 * GET /api/analytics/user
 * Get full analytics for current user
 */
router.get('/user', async (req, res, next) => {
  try {
    const data = await analyticsService.getUserAnalytics(req.user.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/user/room/:roomId
 * Get full analytics for a specific room
 */
router.get('/user/room/:roomId', async (req, res, next) => {
  try {
    const data = await analyticsService.getUserRoomAnalytics(req.user.id, req.params.roomId)
    if (!data) {
      return res.status(404).json({ error: 'Room not found' })
    }
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/admin
 * Get full analytics for admin (across all managed rooms/users)
 */
router.get('/admin', async (req, res, next) => {
  try {
    const data = await analyticsService.getAdminAnalytics(req.user.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/admin/user/:userId
 * Get full personal analytics for a specific user (admin view)
 */
router.get('/admin/user/:userId', async (req, res, next) => {
  try {
    const data = await analyticsService.getAdminUserAnalytics(req.user.id, req.params.userId)
    if (!data) {
      return res.status(404).json({ error: 'User not found or no managed rooms for this user' })
    }
    res.json(data)
  } catch (error) {
    next(error)
  }
})

export default router
