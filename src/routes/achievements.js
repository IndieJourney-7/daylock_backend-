/**
 * Achievements Routes
 * /api/achievements
 */

import { Router } from 'express'
import { achievementsService } from '../services/achievementsService.js'

const router = Router()

/**
 * GET /api/achievements
 * Get all achievement definitions
 */
router.get('/', async (req, res, next) => {
  try {
    const data = await achievementsService.getAll()
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/achievements/me
 * Get current user's earned achievements
 */
router.get('/me', async (req, res, next) => {
  try {
    const data = await achievementsService.getUserAchievements(req.user.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/achievements/unnotified
 * Get achievements user hasn't been notified about yet
 */
router.get('/unnotified', async (req, res, next) => {
  try {
    const data = await achievementsService.getUnnotified(req.user.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/achievements/mark-notified
 * Mark achievements as notified
 */
router.post('/mark-notified', async (req, res, next) => {
  try {
    const { achievementIds } = req.body
    await achievementsService.markNotified(req.user.id, achievementIds)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/achievements/check
 * Trigger achievement check for current user
 */
router.post('/check', async (req, res, next) => {
  try {
    const data = await achievementsService.checkAndAward(req.user.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

export default router
