/**
 * Profile Routes
 * /api/profile
 */

import { Router } from 'express'
import { profileService } from '../services/index.js'

const router = Router()

/**
 * GET /api/profile
 * Get current user's profile
 */
router.get('/', async (req, res, next) => {
  try {
    const profile = await profileService.getProfile(req.user.id)
    res.json(profile)
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/profile
 * Update current user's profile
 */
router.put('/', async (req, res, next) => {
  try {
    const { name, avatar_url, settings } = req.body
    const profile = await profileService.updateProfile(req.user.id, {
      name,
      avatar_url,
      settings
    })
    res.json(profile)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/profile/ensure
 * Ensure profile exists (create if not)
 */
router.post('/ensure', async (req, res, next) => {
  try {
    const { email, name, avatar_url } = req.body
    const profile = await profileService.ensureProfile(req.user.id, {
      email: email || req.user.email,
      name,
      avatar_url
    })
    res.json(profile)
  } catch (error) {
    next(error)
  }
})

export default router
