/**
 * Notifications Routes
 * /api/notifications
 */

import { Router } from 'express'
import { notificationsService } from '../services/notificationsService.js'
import { VAPID_PUBLIC_KEY, pushEnabled } from '../config/webpush.js'
import { pushService } from '../services/pushService.js'

const router = Router()

/**
 * GET /api/notifications/vapid-public-key
 * Returns the VAPID public key for push subscription on the client
 */
router.get('/vapid-public-key', (req, res) => {
  if (!pushEnabled || !VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Push notifications not configured' })
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY })
})

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

/**
 * POST /api/notifications/push/test
 * Send a test push notification to the current user
 */
router.post('/push/test', async (req, res, next) => {
  try {
    if (!pushEnabled) {
      return res.status(503).json({ error: 'Push notifications not configured on server' })
    }

    const result = await pushService.sendToUser(req.user.id, {
      type: 'test',
      title: '🔔 Daylock Test Notification',
      body: 'Push notifications are working! You\'ll receive room reminders here.',
      data: { url: '/dashboard' },
      tag: 'test-push',
      icon: '/Assets/daylock_logo.png',
      badge: '/favicon.svg'
    })

    if (result.sent === 0) {
      return res.status(404).json({
        error: 'No active push subscriptions found. Please enable push notifications first.'
      })
    }

    res.json({ success: true, sent: result.sent })
  } catch (error) {
    next(error)
  }
})

export default router
