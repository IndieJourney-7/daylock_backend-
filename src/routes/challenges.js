/**
 * Challenges Routes
 * /api/challenges
 */

import { Router } from 'express'
import { challengesService } from '../services/challengesService.js'

const router = Router()

/**
 * GET /api/challenges
 * Get active challenges for current user
 */
router.get('/', async (req, res, next) => {
  try {
    const data = await challengesService.getActive(req.user.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/challenges/:id
 * Get challenge details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const data = await challengesService.getById(req.params.id)
    if (!data) return res.status(404).json({ error: 'Challenge not found' })
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/challenges/room/:roomId
 * Get challenges for a room
 */
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const data = await challengesService.getForRoom(req.params.roomId)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/challenges
 * Create a new challenge
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, description, type, targetDays, roomId } = req.body
    const data = await challengesService.create(req.user.id, { title, description, type, targetDays, roomId })
    res.status(201).json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/challenges/:id/join
 * Join a challenge
 */
router.post('/:id/join', async (req, res, next) => {
  try {
    const data = await challengesService.join(req.params.id, req.user.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/challenges/:id/leave
 * Leave a challenge
 */
router.post('/:id/leave', async (req, res, next) => {
  try {
    await challengesService.leave(req.params.id, req.user.id)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/challenges/:id/log
 * Log completed day for a challenge
 */
router.post('/:id/log', async (req, res, next) => {
  try {
    const data = await challengesService.logDay(req.params.id, req.user.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/challenges/:id/participants
 * Get challenge participants with rankings
 */
router.get('/:id/participants', async (req, res, next) => {
  try {
    const data = await challengesService.getParticipants(req.params.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

export default router
