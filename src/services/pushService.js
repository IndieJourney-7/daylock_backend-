/**
 * Web Push Service
 * Handles sending push notifications to user subscriptions.
 * Works even when the PWA is closed because the service worker
 * receives the push event independently of the React app.
 */

import { webpush, pushEnabled } from '../config/webpush.js'
import { supabaseAdmin } from '../config/supabase.js'

export const pushService = {
  /**
   * Send a push notification to a specific user (all their active subscriptions)
   */
  async sendToUser(userId, payload) {
    if (!pushEnabled) {
      console.warn('Push disabled — skipping notification for user', userId)
      return { sent: 0, failed: 0 }
    }

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)

    if (error) {
      console.error('Failed to fetch push subscriptions:', error)
      return { sent: 0, failed: 0, error }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0 }
    }

    const payloadStr = JSON.stringify(payload)
    let sent = 0
    let failed = 0

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys
            },
            payloadStr
          )
          sent++
        } catch (err) {
          failed++
          // If subscription is expired/invalid (410 Gone or 404), deactivate it
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabaseAdmin
              .from('push_subscriptions')
              .update({ active: false })
              .eq('id', sub.id)
            console.log(`Deactivated expired subscription ${sub.id}`)
          } else {
            console.error(`Push failed for sub ${sub.id}:`, err.statusCode, err.body)
          }
        }
      })
    )

    return { sent, failed }
  },

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds, payload) {
    if (!pushEnabled || !userIds.length) return { sent: 0, failed: 0 }

    let totalSent = 0
    let totalFailed = 0

    // Process in batches of 10 to avoid overwhelming
    const batchSize = 10
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map(uid => this.sendToUser(uid, payload))
      )

      results.forEach(r => {
        if (r.status === 'fulfilled') {
          totalSent += r.value.sent
          totalFailed += r.value.failed
        }
      })
    }

    return { sent: totalSent, failed: totalFailed }
  },

  /**
   * Send a room reminder push notification
   */
  async sendRoomReminder(userId, room, minutesBefore) {
    const minLabel = minutesBefore < 60
      ? `${minutesBefore} min`
      : `${Math.floor(minutesBefore / 60)}h${minutesBefore % 60 ? ` ${minutesBefore % 60}m` : ''}`

    return this.sendToUser(userId, {
      type: 'room_reminder',
      title: `${room.emoji || '📋'} ${room.name} opens soon!`,
      body: `Your room opens in ${minLabel}. Get ready!`,
      data: {
        roomId: room.id,
        url: `/rooms/${room.id}`,
        minutesBefore
      },
      tag: `room-reminder-${room.id}-${minutesBefore}`,
      icon: '/Assets/daylock_logo.png',
      badge: '/favicon.svg'
    })
  }
}
