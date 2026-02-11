/**
 * Gallery Routes
 * /api/gallery
 * Approved proof photos organized by room for user's personal gallery
 */

import { Router } from 'express'
import { galleryService } from '../services/galleryService.js'

const router = Router()

/**
 * GET /api/gallery
 * Get all rooms with approved proof counts (gallery overview)
 */
router.get('/', async (req, res, next) => {
  try {
    const rooms = await galleryService.getUserGalleryRooms(req.user.id)
    res.json(rooms)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/gallery/room/:roomId
 * Get all approved proof photos for a specific room
 */
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const { fromDate, toDate, limit } = req.query
    const photos = await galleryService.getRoomGalleryPhotos(
      req.params.roomId,
      req.user.id,
      {
        fromDate,
        toDate,
        limit: limit ? parseInt(limit) : undefined
      }
    )
    res.json(photos)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/gallery/all
 * Get all approved proof photos across all rooms
 */
router.get('/all', async (req, res, next) => {
  try {
    const { fromDate, toDate, limit } = req.query
    const photos = await galleryService.getAllGalleryPhotos(
      req.user.id,
      {
        fromDate,
        toDate,
        limit: limit ? parseInt(limit) : undefined
      }
    )
    res.json(photos)
  } catch (error) {
    next(error)
  }
})

export default router
