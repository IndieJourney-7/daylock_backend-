/**
 * Rooms Routes
 * /api/rooms
 */

import { Router } from 'express'
import { roomsService } from '../services/index.js'

const router = Router()

/**
 * GET /api/rooms
 * Get all rooms for current user
 */
router.get('/', async (req, res, next) => {
  try {
    console.log(`GET /rooms - User: ${req.user.id}`)
    const rooms = await roomsService.getUserRooms(req.user.id)
    console.log(`GET /rooms - Found ${rooms?.length || 0} rooms`)
    res.json(rooms)
  } catch (error) {
    console.error('GET /rooms error:', error.message)
    next(error)
  }
})

/**
 * GET /api/rooms/admin
 * Get rooms where current user is admin
 */
router.get('/admin', async (req, res, next) => {
  try {
    const rooms = await roomsService.getAdminRooms(req.user.id)
    res.json(rooms)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/rooms/:roomId
 * Get single room by ID
 */
router.get('/:roomId', async (req, res, next) => {
  try {
    const room = await roomsService.getRoom(req.params.roomId)
    res.json(room)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/rooms/:roomId/stats
 * Get room with stats
 */
router.get('/:roomId/stats', async (req, res, next) => {
  try {
    const room = await roomsService.getRoomWithStats(req.params.roomId, req.user.id)
    res.json(room)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/rooms
 * Create a new room
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, emoji, time_start, time_end } = req.body
    
    if (!name || !time_start || !time_end) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Name, time_start, and time_end are required' 
      })
    }
    
    const room = await roomsService.createRoom(req.user.id, {
      name,
      emoji,
      time_start,
      time_end
    })
    res.status(201).json(room)
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/rooms/:roomId
 * Update a room
 */
router.put('/:roomId', async (req, res, next) => {
  try {
    const { name, emoji, time_start, time_end } = req.body
    const room = await roomsService.updateRoom(req.params.roomId, req.user.id, {
      name,
      emoji,
      time_start,
      time_end
    })
    res.json(room)
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/rooms/:roomId
 * Delete a room
 */
router.delete('/:roomId', async (req, res, next) => {
  try {
    await roomsService.deleteRoom(req.params.roomId, req.user.id)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
