/**
 * Activity Feed Routes
 * /api/feed
 */

import { Router } from 'express'
import { feedService } from '../services/feedService.js'

const router = Router()

/**
 * GET /api/feed
 * Get personalized feed for current user (across their rooms)
 */
router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, before } = req.query
    const data = await feedService.getForUser(req.user.id, { limit: parseInt(limit), before })
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/feed/room/:roomId
 * Get feed for a specific room
 */
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const { limit = 50, before } = req.query
    const data = await feedService.getForRoom(req.params.roomId, { limit: parseInt(limit), before })
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/feed/global
 * Get global public feed
 */
router.get('/global', async (req, res, next) => {
  try {
    const { limit = 50, before } = req.query
    const data = await feedService.getGlobal({ limit: parseInt(limit), before })
    res.json(data)
  } catch (error) {
    next(error)
  }
})

export default router
