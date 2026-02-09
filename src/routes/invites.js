/**
 * Invites Routes
 * /api/invites
 */

import { Router } from 'express'
import { invitesService } from '../services/index.js'
import { optionalAuth } from '../middleware/index.js'

const router = Router()

/**
 * GET /api/invites/code/:code
 * Get invite by code (public - for accepting invites)
 */
router.get('/code/:code', optionalAuth, async (req, res, next) => {
  try {
    const invite = await invitesService.getInviteByCode(req.params.code)
    
    if (!invite) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid invite code'
      })
    }
    
    res.json(invite)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/invites/room/:roomId
 * Get all invites for a room
 */
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const invites = await invitesService.getRoomInvites(req.params.roomId)
    res.json(invites)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/invites
 * Create a new invite for a room
 */
router.post('/', async (req, res, next) => {
  try {
    const { room_id } = req.body
    
    if (!room_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'room_id is required'
      })
    }
    
    const invite = await invitesService.createInvite(room_id, req.user.id)
    res.status(201).json(invite)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/invites/accept
 * Accept an invite (become admin for a room)
 */
router.post('/accept', async (req, res, next) => {
  try {
    const { invite_code } = req.body
    
    if (!invite_code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'invite_code is required'
      })
    }
    
    const result = await invitesService.acceptInvite(invite_code, req.user.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/invites/:inviteId/revoke
 * Revoke an invite
 */
router.post('/:inviteId/revoke', async (req, res, next) => {
  try {
    const result = await invitesService.revokeInvite(req.params.inviteId, req.user.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

export default router
