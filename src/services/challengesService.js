/**
 * Challenges Service
 * Phase 3: Friend competitions / challenges between users
 */

import { supabaseAdmin } from '../config/supabase.js'

export const challengesService = {
  // ============ CRUD ============

  async create(creatorId, { title, description, type, targetDays, roomId = null }) {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + targetDays)

    const { data, error } = await supabaseAdmin
      .from('challenges')
      .insert({
        creator_id: creatorId,
        room_id: roomId,
        title,
        description,
        type,
        goal: targetDays,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active'
      })
      .select()
      .single()
    if (error) throw error

    // Auto-join the creator
    await this.join(data.id, creatorId)

    return data
  },

  async getById(challengeId) {
    const { data, error } = await supabaseAdmin
      .from('challenges')
      .select('*, challenge_participants(*)')
      .eq('id', challengeId)
      .single()
    if (error) throw error
    return data
  },

  async getActive(userId) {
    // Get challenges the user is part of
    const { data: participantRows, error: pErr } = await supabaseAdmin
      .from('challenge_participants')
      .select('challenge_id')
      .eq('user_id', userId)
    if (pErr) throw pErr

    if (!participantRows || participantRows.length === 0) return []

    const ids = participantRows.map(p => p.challenge_id)

    const { data, error } = await supabaseAdmin
      .from('challenges')
      .select('*, challenge_participants(*)')
      .in('id', ids)
      .in('status', ['active', 'pending'])
      .order('start_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getForRoom(roomId) {
    const { data, error } = await supabaseAdmin
      .from('challenges')
      .select('*, challenge_participants(*)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  // ============ PARTICIPANTS ============

  async join(challengeId, userId) {
    const { data, error } = await supabaseAdmin
      .from('challenge_participants')
      .upsert({
        challenge_id: challengeId,
        user_id: userId,
        progress: 0,
        current_streak: 0,
        status: 'joined'
      }, { onConflict: 'challenge_id, user_id' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async leave(challengeId, userId) {
    const { error } = await supabaseAdmin
      .from('challenge_participants')
      .update({ status: 'withdrawn' })
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
    if (error) throw error
  },

  async getParticipants(challengeId) {
    const { data, error } = await supabaseAdmin
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('progress', { ascending: false })
    if (error) throw error
    return data || []
  },

  // ============ DAILY LOG ============

  async logDay(challengeId, userId) {
    const today = new Date().toISOString().split('T')[0]

    // Check if already logged today
    const { data: existing } = await supabaseAdmin
      .from('challenge_daily_log')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (existing) return existing // Already logged

    // Insert log
    const { data, error } = await supabaseAdmin
      .from('challenge_daily_log')
      .insert({ challenge_id: challengeId, user_id: userId, date: today, completed: true })
      .select()
      .single()
    if (error) throw error

    // Update participant stats
    const { data: participant } = await supabaseAdmin
      .from('challenge_participants')
      .select('progress, current_streak')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .single()

    if (participant) {
      await supabaseAdmin
        .from('challenge_participants')
        .update({
          progress: (participant.progress || 0) + 1,
          current_streak: (participant.current_streak || 0) + 1
        })
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
    }

    return data
  },

  async getDailyLog(challengeId, userId) {
    const { data, error } = await supabaseAdmin
      .from('challenge_daily_log')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .order('date', { ascending: false })
    if (error) throw error
    return data || []
  },

  // ============ STATUS MANAGEMENT ============

  async complete(challengeId) {
    const participants = await this.getParticipants(challengeId)

    // Determine winner (most completed days, then highest streak)
    const sorted = participants
      .filter(p => p.status === 'joined')
      .sort((a, b) => {
        if (b.progress !== a.progress) return b.progress - a.progress
        return b.current_streak - a.current_streak
      })

    if (sorted.length > 0) {
      // Mark winner
      await supabaseAdmin
        .from('challenge_participants')
        .update({ status: 'won', completed_at: new Date().toISOString() })
        .eq('challenge_id', challengeId)
        .eq('user_id', sorted[0].user_id)

      // Mark others as completed
      await supabaseAdmin
        .from('challenge_participants')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('challenge_id', challengeId)
        .neq('user_id', sorted[0].user_id)
        .eq('status', 'joined')
    }

    const { data, error } = await supabaseAdmin
      .from('challenges')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', challengeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Check and complete challenges that have passed their end date
   */
  async completeExpired() {
    const { data: expired, error } = await supabaseAdmin
      .from('challenges')
      .select('id')
      .eq('status', 'active')
      .lt('end_date', new Date().toISOString().split('T')[0])
    if (error) throw error

    const results = []
    for (const challenge of (expired || [])) {
      const result = await this.complete(challenge.id)
      results.push(result)
    }
    return results
  }
}
