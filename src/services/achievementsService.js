/**
 * Achievements Service
 * Phase 3: Server-side achievement tracking and auto-unlock
 */

import { supabaseAdmin } from '../config/supabase.js'

export const achievementsService = {
  /**
   * Get all achievement definitions
   */
  async getAll() {
    const { data, error } = await supabaseAdmin
      .from('achievements')
      .select('*')
      .order('sort_order')
    if (error) throw error
    return data || []
  },

  /**
   * Get user's earned achievements
   */
  async getUserAchievements(userId) {
    const { data, error } = await supabaseAdmin
      .from('user_achievements')
      .select('*, achievement:achievements(*)')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  /**
   * Get unnotified achievements for toast display
   */
  async getUnnotified(userId) {
    const { data, error } = await supabaseAdmin
      .from('user_achievements')
      .select('*, achievement:achievements(*)')
      .eq('user_id', userId)
      .eq('notified', false)
      .order('earned_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  /**
   * Mark achievements as notified
   */
  async markNotified(userId, achievementIds) {
    const { error } = await supabaseAdmin
      .from('user_achievements')
      .update({ notified: true })
      .eq('user_id', userId)
      .in('achievement_id', achievementIds)
    if (error) throw error
  },

  /**
   * Award an achievement to a user
   */
  async award(userId, achievementId, metadata = {}) {
    // Check if already earned
    const { data: existing } = await supabaseAdmin
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single()

    if (existing) return null // already earned

    const { data, error } = await supabaseAdmin
      .from('user_achievements')
      .insert({ user_id: userId, achievement_id: achievementId, metadata })
      .select('*, achievement:achievements(*)')
      .single()
    if (error) throw error

    // Add XP to profile
    const { data: achievement } = await supabaseAdmin
      .from('achievements')
      .select('xp_reward')
      .eq('id', achievementId)
      .single()

    if (achievement?.xp_reward) {
      await supabaseAdmin.rpc('increment_discipline_points', {
        p_user_id: userId,
        p_points: achievement.xp_reward
      }).catch(() => {
        // Fallback: direct update if RPC doesn't exist
        return supabaseAdmin
          .from('profiles')
          .update({ total_discipline_points: supabaseAdmin.raw(`COALESCE(total_discipline_points, 0) + ${achievement.xp_reward}`) })
          .eq('id', userId)
      })
    }

    // Add to activity feed
    if (data?.achievement) {
      await supabaseAdmin.from('activity_feed').insert({
        user_id: userId,
        event_type: 'achievement_earned',
        title: `Earned: ${data.achievement.name}`,
        description: data.achievement.description,
        metadata: { achievement_id: achievementId, icon: data.achievement.icon },
        visibility: 'public'
      }).catch(() => {})
    }

    return data
  },

  /**
   * Check and auto-award achievements based on user stats
   * Called after attendance submission, proof approval, etc.
   */
  async checkAndAward(userId) {
    const awarded = []

    // Get user stats
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('current_streak, longest_streak')
      .eq('id', userId)
      .single()

    const { data: attendance } = await supabaseAdmin
      .from('attendance')
      .select('id, status, quality_rating, date, created_at, room_id')
      .eq('user_id', userId)

    const { data: existing } = await supabaseAdmin
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)

    const earned = new Set((existing || []).map(e => e.achievement_id))
    const records = attendance || []
    const approved = records.filter(r => r.status === 'approved')
    const streak = Math.max(profile?.current_streak || 0, profile?.longest_streak || 0)

    // Streak achievements
    const streakChecks = [
      { id: 'streak_3', threshold: 3 },
      { id: 'streak_7', threshold: 7 },
      { id: 'streak_14', threshold: 14 },
      { id: 'streak_30', threshold: 30 },
      { id: 'streak_60', threshold: 60 },
      { id: 'streak_100', threshold: 100 },
    ]
    for (const check of streakChecks) {
      if (!earned.has(check.id) && streak >= check.threshold) {
        const result = await this.award(userId, check.id, { streak })
        if (result) awarded.push(result)
      }
    }

    // Attendance count achievements
    const attendanceChecks = [
      { id: 'first_room', threshold: 1 },
      { id: 'rooms_10', threshold: 10 },
      { id: 'rooms_50', threshold: 50 },
      { id: 'rooms_100', threshold: 100 },
      { id: 'rooms_500', threshold: 500 },
    ]
    for (const check of attendanceChecks) {
      if (!earned.has(check.id) && approved.length >= check.threshold) {
        const result = await this.award(userId, check.id, { count: approved.length })
        if (result) awarded.push(result)
      }
    }

    // Perfect day check
    if (!earned.has('perfect_day')) {
      const { data: rooms } = await supabaseAdmin
        .from('rooms')
        .select('id')
        .eq('user_id', userId)
      
      if (rooms?.length > 0) {
        const today = new Date().toISOString().split('T')[0]
        const todayApproved = records.filter(r => r.date === today && r.status === 'approved')
        const uniqueRooms = new Set(todayApproved.map(r => r.room_id))
        if (uniqueRooms.size >= rooms.length) {
          const result = await this.award(userId, 'perfect_day', { date: today })
          if (result) awarded.push(result)
        }
      }
    }

    // Quality achievements
    if (!earned.has('quality_5') && approved.some(r => r.quality_rating === 5)) {
      const result = await this.award(userId, 'quality_5')
      if (result) awarded.push(result)
    }

    if (!earned.has('quality_avg_4') && approved.length >= 10) {
      const rated = approved.filter(r => r.quality_rating)
      if (rated.length >= 10) {
        const avg = rated.reduce((sum, r) => sum + r.quality_rating, 0) / rated.length
        if (avg >= 4) {
          const result = await this.award(userId, 'quality_avg_4', { avg })
          if (result) awarded.push(result)
        }
      }
    }

    // Comeback: missed yesterday, approved today
    if (!earned.has('comeback')) {
      const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date))
      if (sorted.length >= 2) {
        const latest = sorted[0]
        const prev = sorted[1]
        if (latest.status === 'approved' && (prev.status === 'missed' || prev.status === 'rejected')) {
          const result = await this.award(userId, 'comeback')
          if (result) awarded.push(result)
        }
      }
    }

    return awarded
  }
}
