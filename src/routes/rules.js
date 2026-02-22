/**
 * Rules Routes
 * /api/rules
 */

import { Router } from 'express'
import { rulesService } from '../services/index.js'

const router = Router()

/**
 * GET /api/rules/room/:roomId
 * Get rules for a room
 */
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const rules = await rulesService.getRoomRules(req.params.roomId)
    res.json(rules)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/rules
 * Add a rule to a room
 */
router.post('/', async (req, res, next) => {
  try {
    const { room_id, text, group_title, group_sort } = req.body
    
    if (!room_id || !text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'room_id and text are required'
      })
    }
    
    const rule = await rulesService.addRule(room_id, text, req.user.id, group_title || null, group_sort || 0)
    res.status(201).json(rule)
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/rules/:ruleId
 * Update a rule
 */
router.put('/:ruleId', async (req, res, next) => {
  try {
    const { text, enabled, sort_order, group_title, group_sort } = req.body
    const updates = {}
    if (text !== undefined) updates.text = text
    if (enabled !== undefined) updates.enabled = enabled
    if (sort_order !== undefined) updates.sort_order = sort_order
    if (group_title !== undefined) updates.group_title = group_title
    if (group_sort !== undefined) updates.group_sort = group_sort
    
    const rule = await rulesService.updateRule(
      req.params.ruleId,
      updates,
      req.user.id
    )
    res.json(rule)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/rules/:ruleId/toggle
 * Toggle rule enabled status
 */
router.post('/:ruleId/toggle', async (req, res, next) => {
  try {
    const rule = await rulesService.toggleRule(req.params.ruleId, req.user.id)
    res.json(rule)
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/rules/:ruleId
 * Delete a rule
 */
router.delete('/:ruleId', async (req, res, next) => {
  try {
    await rulesService.deleteRule(req.params.ruleId, req.user.id)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
