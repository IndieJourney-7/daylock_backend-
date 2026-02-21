/**
 * Notifications Routes
 * /api/notifications
 */

import { Router } from 'express'
import { notificationsService } from '../services/notificationsService.js'

const router = Router()

/**
 * GET /api/notifications
 * Get notifications for current user
 */
router.get('/', async (req, res, next) => {
  try {
    const { limit = 30, unreadOnly = false } = req.query
    const data = await notificationsService.getNotifications(req.user.id, {
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    })
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await notificationsService.getUnreadCount(req.user.id)
    res.json({ count })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/notifications/:id/read
 * Mark a notification as read
 */
router.post('/:id/read', async (req, res, next) => {
  try {
    await notificationsService.markRead(req.user.id, req.params.id)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', async (req, res, next) => {
  try {
    await notificationsService.markAllRead(req.user.id)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/notifications/preferences
 * Get notification preferences
 */
router.get('/preferences', async (req, res, next) => {
  try {
    const data = await notificationsService.getPreferences(req.user.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put('/preferences', async (req, res, next) => {
  try {
    const data = await notificationsService.updatePreferences(req.user.id, req.body)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/notifications/push/subscribe
 * Save push subscription
 */
router.post('/push/subscribe', async (req, res, next) => {
  try {
    const data = await notificationsService.savePushSubscription(req.user.id, req.body)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/notifications/push/subscribe
 * Remove push subscription
 */
router.delete('/push/subscribe', async (req, res, next) => {
  try {
    await notificationsService.removePushSubscription(req.user.id, req.body.endpoint)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
