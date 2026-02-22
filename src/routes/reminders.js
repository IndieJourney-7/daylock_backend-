/**
 * Room Reminders Routes
 * /api/reminders
 */

import { Router } from 'express'
import { remindersService } from '../services/remindersService.js'

const router = Router()

/**
 * GET /api/reminders
 * Get all reminders for current user (with room info)
 */
router.get('/', async (req, res, next) => {
  try {
    const data = await remindersService.getAll(req.user.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/reminders/room/:roomId
 * Get reminders for a specific room
 */
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const data = await remindersService.getForRoom(req.user.id, req.params.roomId)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/reminders/room/:roomId
 * Set all reminders for a room (replaces existing)
 * Body: { minutesBefore: [5, 10, 15] }
 */
router.put('/room/:roomId', async (req, res, next) => {
  try {
    const { minutesBefore, timezone } = req.body
    const data = await remindersService.setForRoom(req.user.id, req.params.roomId, minutesBefore, timezone)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/reminders
 * Add a single reminder
 * Body: { roomId, minutesBefore }
 */
router.post('/', async (req, res, next) => {
  try {
    const { roomId, minutesBefore, timezone } = req.body
    const data = await remindersService.add(req.user.id, roomId, minutesBefore, timezone)
    res.status(201).json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/reminders/:id
 * Remove a reminder
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await remindersService.remove(req.user.id, req.params.id)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

/**
 * PATCH /api/reminders/:id/toggle
 * Toggle a reminder on/off
 * Body: { enabled: true/false }
 */
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const { enabled } = req.body
    const data = await remindersService.toggle(req.user.id, req.params.id, enabled)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

export default router
