/**
 * Attendance Service
 * Handle attendance records and proof operations
 */

import { supabaseAdmin } from '../config/supabase.js'

export const attendanceService = {
  /**
   * Submit attendance with proof URL
   * Note: Image upload happens on frontend to Supabase Storage
   */
  async submitProof(roomId, userId, proofUrl, note = '') {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .upsert({
        room_id: roomId,
        user_id: userId,
        date: today,
        status: 'pending_review',
        proof_url: proofUrl,
        note,
        submitted_at: new Date().toISOString()
      }, {
        onConflict: 'room_id,user_id,date'
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Approve attendance (admin action)
   */
  async approveAttendance(attendanceId, adminId) {
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId
      })
      .eq('id', attendanceId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Reject attendance (admin action)
   */
  async rejectAttendance(attendanceId, adminId, reason = '') {
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId
      })
      .eq('id', attendanceId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Get user's attendance for a specific room
   */
  async getUserAttendance(roomId, userId) {
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  /**
   * Get all user's attendance across all rooms
   */
  async getAllUserAttendance(userId, options = {}) {
    let query = supabaseAdmin
      .from('attendance')
      .select(`
        *,
        room:rooms (
          id, name, emoji
        )
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
    
    if (options.fromDate) {
      query = query.gte('date', options.fromDate)
    }
    
    if (options.toDate) {
      query = query.lte('date', options.toDate)
    }
    
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /**
   * Get today's attendance status for a room
   */
  async getTodayStatus(roomId, userId) {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()
    
    if (error) throw error
    return data
  },

  /**
   * Get pending proofs for a room (admin view)
   */
  async getPendingProofs(roomId) {
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select(`
        *,
        user:profiles!attendance_user_id_fkey (
          id, name, email, avatar_url
        )
      `)
      .eq('room_id', roomId)
      .eq('status', 'pending_review')
      .order('submitted_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  /**
   * Get all pending proofs for an admin (across all their rooms)
   */
  async getAllPendingProofsForAdmin(adminId) {
    // First get all rooms this admin manages
    const { data: invites } = await supabaseAdmin
      .from('room_invites')
      .select('room_id')
      .eq('admin_id', adminId)
      .eq('status', 'accepted')
    
    if (!invites || invites.length === 0) return []
    
    const roomIds = invites.map(i => i.room_id)
    
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select(`
        *,
        room:rooms (
          id, name, emoji
        ),
        user:profiles!attendance_user_id_fkey (
          id, name, email, avatar_url
        )
      `)
      .in('room_id', roomIds)
      .eq('status', 'pending_review')
      .order('submitted_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  /**
   * Get room stats
   */
  async getRoomStats(roomId, userId) {
    const { data: attendance } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
    
    const records = attendance || []
    const approved = records.filter(a => a.status === 'approved').length
    const total = records.length
    
    // Calculate streak
    let streak = 0
    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date))
    for (const record of sorted) {
      if (record.status === 'approved') streak++
      else break
    }
    
    return {
      streak,
      total,
      approved,
      percentage: total > 0 ? Math.round((approved / total) * 100) : 0
    }
  }
}

export default attendanceService
