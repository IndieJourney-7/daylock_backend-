/**
 * Warnings Routes
 * /api/warnings
 */

import { Router } from 'express'
import { warningsService } from '../services/index.js'

const router = Router()

/**
 * GET /api/warnings
 * Get all active warnings for admin's rooms
 */
router.get('/', async (req, res, next) => {
  try {
    const warnings = await warningsService.getAdminWarnings(req.user.id)
    res.json(warnings)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/warnings/room/:roomId
 * Get warnings for a specific room
 */
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const warnings = await warningsService.getWarnings(req.params.roomId)
    res.json(warnings)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/warnings
 * Create a manual warning
 */
router.post('/', async (req, res, next) => {
  try {
    const { room_id, user_id, severity, message } = req.body
    
    if (!room_id || !user_id || !message) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'room_id, user_id, and message are required'
      })
    }
    
    const warning = await warningsService.createWarning({
      room_id,
      user_id,
      admin_id: req.user.id,
      severity,
      message
    })
    res.status(201).json(warning)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/warnings/auto
 * Create auto-detected warning (deduplicates)
 */
router.post('/auto', async (req, res, next) => {
  try {
    const { room_id, user_id, trigger_reason, severity, message } = req.body
    
    if (!room_id || !user_id || !trigger_reason || !message) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'room_id, user_id, trigger_reason, and message are required'
      })
    }
    
    const warning = await warningsService.createAutoWarning({
      room_id,
      user_id,
      admin_id: req.user.id,
      trigger_reason,
      severity,
      message
    })
    res.status(201).json(warning)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/warnings/:warningId/acknowledge
 * Acknowledge a warning (user action)
 */
router.post('/:warningId/acknowledge', async (req, res, next) => {
  try {
    const warning = await warningsService.acknowledgeWarning(req.params.warningId)
    res.json(warning)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/warnings/:warningId/dismiss
 * Dismiss a warning (admin action)
 */
router.post('/:warningId/dismiss', async (req, res, next) => {
  try {
    const warning = await warningsService.dismissWarning(req.params.warningId)
    res.json(warning)
  } catch (error) {
    next(error)
  }
})

// ============ CONSEQUENCES ============

/**
 * GET /api/warnings/consequences/room/:roomId
 * Get consequences for a room
 */
router.get('/consequences/room/:roomId', async (req, res, next) => {
  try {
    const consequences = await warningsService.getConsequences(req.params.roomId)
    res.json(consequences)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/warnings/consequences
 * Issue a consequence
 */
router.post('/consequences', async (req, res, next) => {
  try {
    const { room_id, user_id, level, reason, notes, expires_at } = req.body
    
    if (!room_id || !user_id || !reason) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'room_id, user_id, and reason are required'
      })
    }
    
    const consequence = await warningsService.issueConsequence({
      room_id,
      user_id,
      admin_id: req.user.id,
      level,
      reason,
      notes,
      expires_at
    })
    res.status(201).json(consequence)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/warnings/consequences/:consequenceId/resolve
 * Resolve a consequence
 */
router.post('/consequences/:consequenceId/resolve', async (req, res, next) => {
  try {
    const consequence = await warningsService.resolveConsequence(req.params.consequenceId)
    res.json(consequence)
  } catch (error) {
    next(error)
  }
})

export default router
