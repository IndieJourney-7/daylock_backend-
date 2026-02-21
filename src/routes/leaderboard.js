/**
 * Leaderboard Routes
 * /api/leaderboard
 */

import { Router } from 'express'
import { leaderboardService } from '../services/leaderboardService.js'

const router = Router()

/**
 * GET /api/leaderboard
 * Get global leaderboard
 * Query params: sortBy (discipline_score|streak|attendance_rate), period (all|month|week), limit
 */
router.get('/', async (req, res, next) => {
  try {
    const { sortBy = 'discipline_score', period = 'all', limit = 50 } = req.query
    const data = await leaderboardService.getGlobal({ sortBy, period, limit: parseInt(limit) })
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/leaderboard/room/:roomId
 * Get leaderboard for a specific room
 */
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const data = await leaderboardService.getForRoom(req.params.roomId)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/leaderboard/me
 * Get current user's rank
 */
router.get('/me', async (req, res, next) => {
  try {
    const data = await leaderboardService.getUserRank(req.user.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

export default router
