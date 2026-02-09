/**
 * Analytics Service
 * Compute stats, trends, streaks for user & admin dashboards
 */

import { supabaseAdmin } from '../config/supabase.js'

export const analyticsService = {
  // ─── USER ANALYTICS ────────────────────────────────────────────

  /**
   * Full analytics payload for a user
   */
  async getUserAnalytics(userId) {
    // 1. All attendance records with room info
    const { data: records, error } = await supabaseAdmin
      .from('attendance')
      .select(`
        id, room_id, date, status, submitted_at, reviewed_at,
        room:rooms ( id, name, emoji )
      `)
      .eq('user_id', userId)
      .order('date', { ascending: true })

    if (error) throw error
    const all = records || []

    // 2. All rooms
    const { data: rooms } = await supabaseAdmin
      .from('rooms')
      .select('id, name, emoji')
      .eq('user_id', userId)

    // ── Overall stats ──
    const totalDays = all.length
    const approved = all.filter(r => r.status === 'approved').length
    const rejected = all.filter(r => r.status === 'rejected').length
    const missed = all.filter(r => r.status === 'missed').length
    const pending = all.filter(r => r.status === 'pending_review').length
    const overallRate = totalDays > 0 ? Math.round((approved / totalDays) * 100) : 0

    // ── Streaks ──
    const approvedDates = all
      .filter(r => r.status === 'approved')
      .map(r => r.date)
      .sort()
    const { currentStreak, bestStreak } = computeStreaks(approvedDates)

    // ── Weekly trend (last 12 weeks) ──
    const weeklyTrend = computeWeeklyTrend(all, 12)

    // ── Monthly trend (last 6 months) ──
    const monthlyTrend = computeMonthlyTrend(all, 6)

    // ── Room breakdown (for pie chart) ──
    const roomBreakdown = (rooms || []).map(room => {
      const roomRecords = all.filter(r => r.room_id === room.id)
      const roomApproved = roomRecords.filter(r => r.status === 'approved').length
      const roomTotal = roomRecords.length
      return {
        roomId: room.id,
        name: room.name,
        emoji: room.emoji,
        total: roomTotal,
        approved: roomApproved,
        rate: roomTotal > 0 ? Math.round((roomApproved / roomTotal) * 100) : 0
      }
    })

    // ── Daily heatmap data (last 90 days) ──
    const heatmap = computeHeatmap(all, 90)

    // ── Status distribution (for donut) ──
    const statusDistribution = [
      { name: 'Approved', value: approved, color: '#22c55e' },
      { name: 'Rejected', value: rejected, color: '#ef4444' },
      { name: 'Missed', value: missed, color: '#f59e0b' },
      { name: 'Pending', value: pending, color: '#6366f1' },
    ].filter(s => s.value > 0)

    return {
      overview: { totalDays, approved, rejected, missed, pending, overallRate },
      streaks: { currentStreak, bestStreak },
      weeklyTrend,
      monthlyTrend,
      roomBreakdown,
      heatmap,
      statusDistribution,
      totalRooms: (rooms || []).length,
      records: all  // raw records for export
    }
  },

  // ─── ADMIN ANALYTICS ──────────────────────────────────────────

  /**
   * Full analytics for an admin across all managed rooms/users
   */
  async getAdminAnalytics(adminId) {
    // 1. Get rooms this admin manages
    const { data: invites } = await supabaseAdmin
      .from('room_invites')
      .select(`
        room_id,
        room:rooms (
          id, name, emoji,
          user:profiles!rooms_user_id_fkey ( id, name, email, avatar_url )
        )
      `)
      .eq('admin_id', adminId)
      .eq('status', 'accepted')

    if (!invites || invites.length === 0) {
      return { rooms: [], users: [], overview: {}, weeklyTrend: [], userPerformance: [], records: [] }
    }

    const roomIds = invites.map(i => i.room_id)
    const roomMap = {}
    const userMap = {}
    for (const inv of invites) {
      if (inv.room) {
        roomMap[inv.room.id] = inv.room
        if (inv.room.user) userMap[inv.room.user.id] = inv.room.user
      }
    }

    // 2. All attendance across managed rooms
    const { data: records, error } = await supabaseAdmin
      .from('attendance')
      .select(`
        id, room_id, user_id, date, status, submitted_at, reviewed_at,
        user:profiles!attendance_user_id_fkey ( id, name, email, avatar_url )
      `)
      .in('room_id', roomIds)
      .order('date', { ascending: true })

    if (error) throw error
    const all = records || []

    // ── Overview ──
    const totalRecords = all.length
    const approved = all.filter(r => r.status === 'approved').length
    const rejected = all.filter(r => r.status === 'rejected').length
    const missed = all.filter(r => r.status === 'missed').length
    const pendingReview = all.filter(r => r.status === 'pending_review').length
    const overallRate = totalRecords > 0 ? Math.round((approved / totalRecords) * 100) : 0

    // ── Per-user performance ──
    const userGroups = {}
    for (const rec of all) {
      if (!userGroups[rec.user_id]) {
        userGroups[rec.user_id] = { user: rec.user || userMap[rec.user_id], records: [] }
      }
      userGroups[rec.user_id].records.push(rec)
    }

    const userPerformance = Object.values(userGroups).map(({ user, records: recs }) => {
      const total = recs.length
      const app = recs.filter(r => r.status === 'approved').length
      const rej = recs.filter(r => r.status === 'rejected').length
      const mis = recs.filter(r => r.status === 'missed').length
      const rate = total > 0 ? Math.round((app / total) * 100) : 0

      // streak
      const approvedDates = recs
        .filter(r => r.status === 'approved')
        .map(r => r.date)
        .sort()
      const { currentStreak, bestStreak } = computeStreaks(approvedDates)

      return {
        userId: user?.id,
        name: user?.name || user?.email || 'Unknown',
        avatar_url: user?.avatar_url,
        total, approved: app, rejected: rej, missed: mis, rate,
        currentStreak, bestStreak
      }
    })

    // ── Per-room stats ──
    const roomStats = Object.values(roomMap).map(room => {
      const recs = all.filter(r => r.room_id === room.id)
      const total = recs.length
      const app = recs.filter(r => r.status === 'approved').length
      return {
        roomId: room.id,
        name: room.name,
        emoji: room.emoji,
        userName: room.user?.name || 'Unknown',
        total,
        approved: app,
        rate: total > 0 ? Math.round((app / total) * 100) : 0
      }
    })

    // ── Weekly trend ──
    const weeklyTrend = computeWeeklyTrend(all, 12)

    // ── Status distribution ──
    const statusDistribution = [
      { name: 'Approved', value: approved, color: '#22c55e' },
      { name: 'Rejected', value: rejected, color: '#ef4444' },
      { name: 'Missed', value: missed, color: '#f59e0b' },
      { name: 'Pending', value: pendingReview, color: '#6366f1' },
    ].filter(s => s.value > 0)

    return {
      overview: { totalRecords, approved, rejected, missed, pendingReview, overallRate },
      totalRooms: roomIds.length,
      totalUsers: Object.keys(userGroups).length,
      userPerformance: userPerformance.sort((a, b) => b.rate - a.rate),
      roomStats,
      weeklyTrend,
      statusDistribution,
      records: all
    }
  },

  // ─── ADMIN → SINGLE USER ANALYTICS ────────────────────────────

  /**
   * Full personal analytics for a specific user, scoped to admin's managed rooms
   */
  async getAdminUserAnalytics(adminId, targetUserId) {
    // 1. Get rooms this admin manages
    const { data: invites } = await supabaseAdmin
      .from('room_invites')
      .select(`
        room_id,
        room:rooms ( id, name, emoji, user_id )
      `)
      .eq('admin_id', adminId)
      .eq('status', 'accepted')

    if (!invites || invites.length === 0) {
      return null
    }

    // Filter rooms that belong to this target user
    const userRooms = invites
      .filter(i => i.room?.user_id === targetUserId)
      .map(i => i.room)

    if (userRooms.length === 0) return null

    const roomIds = userRooms.map(r => r.id)

    // 2. Get all attendance for this user in those rooms
    const { data: records, error } = await supabaseAdmin
      .from('attendance')
      .select(`
        id, room_id, user_id, date, status, submitted_at, reviewed_at,
        room:rooms ( id, name, emoji )
      `)
      .eq('user_id', targetUserId)
      .in('room_id', roomIds)
      .order('date', { ascending: true })

    if (error) throw error
    const all = records || []

    // 3. Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, avatar_url')
      .eq('id', targetUserId)
      .single()

    // ── Overall stats ──
    const totalDays = all.length
    const approved = all.filter(r => r.status === 'approved').length
    const rejected = all.filter(r => r.status === 'rejected').length
    const missed = all.filter(r => r.status === 'missed').length
    const pending = all.filter(r => r.status === 'pending_review').length
    const overallRate = totalDays > 0 ? Math.round((approved / totalDays) * 100) : 0

    // ── Streaks ──
    const approvedDates = all
      .filter(r => r.status === 'approved')
      .map(r => r.date)
      .sort()
    const { currentStreak, bestStreak } = computeStreaks(approvedDates)

    // ── Weekly trend (last 12 weeks) ──
    const weeklyTrend = computeWeeklyTrend(all, 12)

    // ── Monthly trend (last 6 months) ──
    const monthlyTrend = computeMonthlyTrend(all, 6)

    // ── Room breakdown ──
    const roomBreakdown = userRooms.map(room => {
      const roomRecords = all.filter(r => r.room_id === room.id)
      const roomApproved = roomRecords.filter(r => r.status === 'approved').length
      const roomTotal = roomRecords.length
      return {
        roomId: room.id,
        name: room.name,
        emoji: room.emoji,
        total: roomTotal,
        approved: roomApproved,
        rejected: roomRecords.filter(r => r.status === 'rejected').length,
        missed: roomRecords.filter(r => r.status === 'missed').length,
        rate: roomTotal > 0 ? Math.round((roomApproved / roomTotal) * 100) : 0
      }
    })

    // ── Heatmap (last 90 days) ──
    const heatmap = computeHeatmap(all, 90)

    // ── Status distribution ──
    const statusDistribution = [
      { name: 'Approved', value: approved, color: '#22c55e' },
      { name: 'Rejected', value: rejected, color: '#ef4444' },
      { name: 'Missed', value: missed, color: '#f59e0b' },
      { name: 'Pending', value: pending, color: '#6366f1' },
    ].filter(s => s.value > 0)

    return {
      user: profile,
      overview: { totalDays, approved, rejected, missed, pending, overallRate },
      streaks: { currentStreak, bestStreak },
      weeklyTrend,
      monthlyTrend,
      roomBreakdown,
      heatmap,
      statusDistribution,
      totalRooms: userRooms.length,
      records: all
    }
  }
}


// ──── HELPER FUNCTIONS ────────────────────────────────────────────

function computeStreaks(sortedDates) {
  if (!sortedDates.length) return { currentStreak: 0, bestStreak: 0 }

  let currentStreak = 1
  let bestStreak = 1
  let tempStreak = 1

  // Check if most recent date is today or yesterday (for "current" streak)
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const lastDate = sortedDates[sortedDates.length - 1]
  const isActive = lastDate === today || lastDate === yesterday

  for (let i = sortedDates.length - 2; i >= 0; i--) {
    const curr = new Date(sortedDates[i + 1])
    const prev = new Date(sortedDates[i])
    const diffDays = (curr - prev) / 86400000

    if (diffDays === 1) {
      tempStreak++
    } else {
      if (tempStreak > bestStreak) bestStreak = tempStreak
      tempStreak = 1
    }
  }
  if (tempStreak > bestStreak) bestStreak = tempStreak

  // Current streak = count backwards from the end
  currentStreak = 1
  for (let i = sortedDates.length - 2; i >= 0; i--) {
    const curr = new Date(sortedDates[i + 1])
    const prev = new Date(sortedDates[i])
    if ((curr - prev) / 86400000 === 1) currentStreak++
    else break
  }

  return {
    currentStreak: isActive ? currentStreak : 0,
    bestStreak
  }
}

function computeWeeklyTrend(records, weeks) {
  const now = new Date()
  const trend = []

  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (w * 7) - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const startStr = weekStart.toISOString().split('T')[0]
    const endStr = weekEnd.toISOString().split('T')[0]

    const weekRecords = records.filter(r => r.date >= startStr && r.date <= endStr)
    const approved = weekRecords.filter(r => r.status === 'approved').length
    const total = weekRecords.length

    const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`

    trend.push({
      week: label,
      approved,
      total,
      rate: total > 0 ? Math.round((approved / total) * 100) : 0
    })
  }

  return trend
}

function computeMonthlyTrend(records, months) {
  const now = new Date()
  const trend = []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  for (let m = months - 1; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endDate = new Date(year, month + 1, 0)
    const endStr = endDate.toISOString().split('T')[0]

    const monthRecords = records.filter(r => r.date >= startStr && r.date <= endStr)
    const approved = monthRecords.filter(r => r.status === 'approved').length
    const total = monthRecords.length

    trend.push({
      month: monthNames[month],
      approved,
      rejected: monthRecords.filter(r => r.status === 'rejected').length,
      missed: monthRecords.filter(r => r.status === 'missed').length,
      total,
      rate: total > 0 ? Math.round((approved / total) * 100) : 0
    })
  }

  return trend
}

function computeHeatmap(records, days) {
  const now = new Date()
  const heatmap = []

  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(now)
    date.setDate(now.getDate() - d)
    const dateStr = date.toISOString().split('T')[0]
    const dayRecords = records.filter(r => r.date === dateStr)
    const approved = dayRecords.filter(r => r.status === 'approved').length
    const total = dayRecords.length

    heatmap.push({
      date: dateStr,
      day: date.getDay(),
      approved,
      total,
      level: total === 0 ? 0 : approved === total ? 3 : approved > 0 ? 2 : 1
    })
  }

  return heatmap
}

export default analyticsService
