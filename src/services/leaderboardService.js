/**
 * Leaderboard Service
 * Phase 3: Rankings by discipline score, streak, attendance rate
 */

import { supabaseAdmin } from '../config/supabase.js'

export const leaderboardService = {
  /**
   * Get global leaderboard
   * @param {string} sortBy - discipline_score | current_streak | attendance_rate | achievements_count
   * @param {string} period - all | month | week
   * @param {number} limit
   */
  async getGlobal(sortBy = 'discipline_score', period = 'all', limit = 50) {
    let query = supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url, current_streak, longest_streak, total_discipline_points')

    // For period-based, we need attendance data
    if (period === 'all') {
      // Use the leaderboard view for comprehensive stats
      const { data, error } = await supabaseAdmin
        .from('leaderboard_view')
        .select('*')
        .order(sortBy, { ascending: false, nullsFirst: false })
        .limit(limit)
      
      if (error) {
        // Fallback: simple query from profiles
        const { data: profiles, error: pErr } = await supabaseAdmin
          .from('profiles')
          .select('id, name, avatar_url, current_streak, longest_streak, total_discipline_points')
          .order('total_discipline_points', { ascending: false, nullsFirst: false })
          .limit(limit)
        if (pErr) throw pErr
        return (profiles || []).map((p, i) => ({
          rank: i + 1,
          user_id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
          discipline_score: p.total_discipline_points || 0,
          current_streak: p.current_streak || 0,
          longest_streak: p.longest_streak || 0,
          attendance_rate: 0,
          achievements_count: 0
        }))
      }

      return (data || []).map((row, i) => ({
        rank: i + 1,
        ...row
      }))
    }

    // Period-based: filter attendance by date range
    const now = new Date()
    let fromDate
    if (period === 'week') {
      fromDate = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]
    } else {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    }

    const { data: attendance, error } = await supabaseAdmin
      .from('attendance')
      .select('user_id, status, quality_rating')
      .gte('date', fromDate)

    if (error) throw error

    // Aggregate per user
    const userMap = {}
    for (const record of (attendance || [])) {
      if (!userMap[record.user_id]) {
        userMap[record.user_id] = { approved: 0, total: 0, qualitySum: 0, qualityCount: 0 }
      }
      userMap[record.user_id].total++
      if (record.status === 'approved') userMap[record.user_id].approved++
      if (record.quality_rating) {
        userMap[record.user_id].qualitySum += record.quality_rating
        userMap[record.user_id].qualityCount++
      }
    }

    // Get user profiles
    const userIds = Object.keys(userMap)
    if (userIds.length === 0) return []

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url, current_streak, total_discipline_points')
      .in('id', userIds)

    const results = (profiles || []).map(p => {
      const stats = userMap[p.id] || { approved: 0, total: 0 }
      return {
        user_id: p.id,
        name: p.name,
        avatar_url: p.avatar_url,
        discipline_score: p.total_discipline_points || 0,
        current_streak: p.current_streak || 0,
        attendance_rate: stats.total > 0 ? Math.round(stats.approved / stats.total * 100) : 0,
        total_approved: stats.approved,
        avg_quality: stats.qualityCount > 0 ? Math.round(stats.qualitySum / stats.qualityCount * 10) / 10 : null
      }
    })

    results.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))
    return results.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r }))
  },

  /**
   * Get room-specific leaderboard
   */
  async getForRoom(roomId, limit = 20) {
    const { data, error } = await supabaseAdmin
      .from('room_leaderboard_view')
      .select('*')
      .eq('room_id', roomId)
      .order('attendance_rate', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) {
      // Fallback
      const { data: attendance, error: aErr } = await supabaseAdmin
        .from('attendance')
        .select('user_id, status, quality_rating')
        .eq('room_id', roomId)
      if (aErr) throw aErr

      const userMap = {}
      for (const r of (attendance || [])) {
        if (!userMap[r.user_id]) userMap[r.user_id] = { approved: 0, total: 0 }
        userMap[r.user_id].total++
        if (r.status === 'approved') userMap[r.user_id].approved++
      }

      const userIds = Object.keys(userMap)
      if (userIds.length === 0) return []

      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, name, avatar_url, current_streak')
        .in('id', userIds)

      return (profiles || []).map((p, i) => {
        const stats = userMap[p.id]
        return {
          rank: i + 1,
          user_id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
          approved_count: stats.approved,
          total_count: stats.total,
          attendance_rate: stats.total > 0 ? Math.round(stats.approved / stats.total * 100) : 0,
          current_streak: p.current_streak || 0
        }
      }).sort((a, b) => b.attendance_rate - a.attendance_rate)
        .map((r, i) => ({ ...r, rank: i + 1 }))
        .slice(0, limit)
    }

    return (data || []).map((row, i) => ({ rank: i + 1, ...row }))
  },

  /**
   * Get user's rank position
   */
  async getUserRank(userId) {
    const { data } = await supabaseAdmin
      .from('leaderboard_view')
      .select('user_id, discipline_score')
      .order('discipline_score', { ascending: false, nullsFirst: false })

    if (!data) return { rank: 0, total: 0 }
    const idx = data.findIndex(r => r.user_id === userId)
    return { rank: idx >= 0 ? idx + 1 : data.length + 1, total: data.length }
  }
}
