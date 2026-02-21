/**
 * Notifications Service
 * Phase 3: Push notifications, in-app notifications, preferences
 */

import { supabaseAdmin } from '../config/supabase.js'

export const notificationsService = {
  // ============ PREFERENCES ============

  async getPreferences(userId) {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    // Return defaults if no row exists
    return data || {
      user_id: userId,
      room_opening: true,
      room_closing: true,
      streak_at_risk: true,
      proof_reviewed: true,
      achievement_earned: true,
      challenge_updates: true,
      weekly_digest: true,
      quiet_hours_start: null,
      quiet_hours_end: null
    }
  },

  async updatePreferences(userId, prefs) {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // ============ PUSH SUBSCRIPTIONS ============

  async savePushSubscription(userId, subscription) {
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_agent: subscription.userAgent || null,
        active: true
      }, { onConflict: 'user_id, endpoint' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async removePushSubscription(userId, endpoint) {
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
    if (error) throw error
  },

  async getActiveSubscriptions(userId) {
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
    if (error) throw error
    return data || []
  },

  // ============ IN-APP NOTIFICATIONS ============

  async getNotifications(userId, { limit = 30, unreadOnly = false } = {}) {
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getUnreadCount(userId) {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (error) throw error
    return count || 0
  },

  async markRead(userId, notificationId) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
    if (error) throw error
  },

  async markAllRead(userId) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (error) throw error
  },

  /**
   * Create an in-app notification (and optionally push)
   */
  async create(userId, { type, title, body, data = {} }) {
    const { data: notif, error } = await supabaseAdmin
      .from('notifications')
      .insert({ user_id: userId, type, title, body, data })
      .select()
      .single()
    if (error) throw error

    // TODO: Send web push notification here if user has subscriptions
    // This would use web-push library with VAPID keys in production

    return notif
  },

  /**
   * Send notifications to multiple users
   */
  async createBulk(userIds, { type, title, body, data = {} }) {
    const rows = userIds.map(uid => ({
      user_id: uid, type, title, body, data
    }))
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert(rows)
    if (error) throw error
  }
}
