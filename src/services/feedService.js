/**
 * Activity Feed Service
 * Phase 3: Social timeline — attendance events, achievements, challenge updates
 */

import { supabaseAdmin } from '../config/supabase.js'

export const feedService = {
  /**
   * Get feed for a specific room
   */
  async getForRoom(roomId, { limit = 50, before = null } = {}) {
    let query = supabaseAdmin
      .from('activity_feed')
      .select('*')
      .eq('room_id', roomId)
      .eq('visibility', 'room')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /**
   * Get global public feed
   */
  async getGlobal({ limit = 50, before = null } = {}) {
    let query = supabaseAdmin
      .from('activity_feed')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /**
   * Get feed for a user (from all their rooms)
   */
  async getForUser(userId, { limit = 50, before = null } = {}) {
    // Get rooms user belongs to
    const { data: memberships, error: mErr } = await supabaseAdmin
      .from('room_members')
      .select('room_id')
      .eq('user_id', userId)
    if (mErr) throw mErr

    const roomIds = (memberships || []).map(m => m.room_id)
    if (roomIds.length === 0) return []

    let query = supabaseAdmin
      .from('activity_feed')
      .select('*')
      .in('room_id', roomIds)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /**
   * Create a feed event
   */
  async createEvent({ userId, roomId = null, eventType, title, description = null, data = {}, visibility = 'room' }) {
    // Look up display name
    let actorName = 'Someone'
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single()
      if (profile) actorName = profile.display_name || 'Someone'
    }

    const { data: event, error } = await supabaseAdmin
      .from('activity_feed')
      .insert({
        user_id: userId,
        room_id: roomId,
        event_type: eventType,
        actor_name: actorName,
        title,
        description,
        data,
        visibility
      })
      .select()
      .single()
    if (error) throw error
    return event
  },

  /**
   * Convenience: log attendance event
   */
  async logAttendance(userId, roomId, { status, streak }) {
    const titles = {
      present: `marked attendance — Day ${streak || 1} streak 🔥`,
      late: `showed up late — streak at ${streak || 0}`,
      missed: `missed today ❌`
    }
    return this.createEvent({
      userId,
      roomId,
      eventType: 'attendance',
      title: titles[status] || `attendance: ${status}`,
      data: { status, streak },
      visibility: 'room'
    })
  },

  /**
   * Convenience: log achievement unlock
   */
  async logAchievement(userId, roomId, achievement) {
    return this.createEvent({
      userId,
      roomId,
      eventType: 'achievement',
      title: `unlocked "${achievement.name}" ${achievement.icon || '🏆'}`,
      data: { achievement_id: achievement.id, achievement_name: achievement.name },
      visibility: 'room'
    })
  },

  /**
   * Convenience: log challenge event
   */
  async logChallengeEvent(userId, roomId, { challengeTitle, action }) {
    const titles = {
      created: `created challenge "${challengeTitle}"`,
      joined: `joined challenge "${challengeTitle}"`,
      completed: `completed challenge "${challengeTitle}" 🎉`,
      won: `won challenge "${challengeTitle}" 👑`
    }
    return this.createEvent({
      userId,
      roomId,
      eventType: 'challenge',
      title: titles[action] || `challenge: ${action}`,
      data: { challenge_title: challengeTitle, action },
      visibility: 'room'
    })
  }
}
