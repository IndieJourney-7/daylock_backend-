/**
 * Rooms Service
 * CRUD operations for rooms
 */

import { supabaseAdmin } from '../config/supabase.js'

export const roomsService = {
  /**
   * Get all rooms for a user
   */
  async getUserRooms(userId) {
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select(`
        *,
        room_invites (
          id,
          invite_code,
          status,
          admin_id,
          admin:profiles!room_invites_admin_id_fkey (
            id, name, email
          )
        ),
        room_rules (
          id, text, enabled, sort_order
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Transform room_invites into convenient properties
    return (data || []).map(room => {
      const invites = room.room_invites || []
      const acceptedInvite = invites.find(i => i.status === 'accepted')
      const pendingInvite = invites.find(i => i.status === 'pending')
      
      return {
        ...room,
        admin_id: acceptedInvite?.admin_id || null,
        admin: acceptedInvite?.admin || null,
        pending_invite: pendingInvite || null
      }
    })
  },

  /**
   * Get single room by ID
   */
  async getRoom(roomId) {
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select(`
        *,
        room_invites (
          id,
          invite_code,
          status,
          admin_id,
          admin:profiles!room_invites_admin_id_fkey (
            id, name, email
          )
        ),
        room_rules (
          id, text, enabled, sort_order
        )
      `)
      .eq('id', roomId)
      .single()
    
    if (error) throw error
    
    const invites = data.room_invites || []
    const acceptedInvite = invites.find(i => i.status === 'accepted')
    const pendingInvite = invites.find(i => i.status === 'pending')
    
    return {
      ...data,
      admin_id: acceptedInvite?.admin_id || null,
      admin: acceptedInvite?.admin || null,
      pending_invite: pendingInvite || null
    }
  },

  /**
   * Get room with stats
   */
  async getRoomWithStats(roomId, userId) {
    const room = await this.getRoom(roomId)
    
    // Get attendance stats
    const { data: attendance } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
    
    const approvedDays = (attendance || []).filter(a => a.status === 'approved').length
    const totalDays = (attendance || []).length || 1
    
    // Calculate streak
    let streak = 0
    const sortedAttendance = [...(attendance || [])].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    )
    for (const record of sortedAttendance) {
      if (record.status === 'approved') streak++
      else break
    }
    
    return {
      ...room,
      stats: {
        streak,
        approvedDays,
        totalDays,
        attendanceRate: Math.round((approvedDays / totalDays) * 100)
      }
    }
  },

  /**
   * Create a new room
   */
  async createRoom(userId, roomData) {
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .insert({
        user_id: userId,
        name: roomData.name,
        emoji: roomData.emoji || '📋',
        time_start: roomData.time_start || roomData.timeStart,
        time_end: roomData.time_end || roomData.timeEnd
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Update a room
   */
  async updateRoom(roomId, userId, updates) {
    // Verify ownership
    const room = await this.getRoom(roomId)
    if (room.user_id !== userId) {
      throw new Error('Unauthorized to update this room')
    }
    
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Delete a room
   */
  async deleteRoom(roomId, userId) {
    // Verify ownership
    const room = await this.getRoom(roomId)
    if (room.user_id !== userId) {
      throw new Error('Unauthorized to delete this room')
    }
    
    const { error } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('id', roomId)
    
    if (error) throw error
    return { success: true }
  },

  /**
   * Get rooms where user is admin
   */
  async getAdminRooms(adminId) {
    const { data, error } = await supabaseAdmin
      .from('room_invites')
      .select(`
        id,
        invite_code,
        status,
        room:rooms (
          *,
          user:profiles!rooms_user_id_fkey (
            id, name, email, avatar_url
          )
        )
      `)
      .eq('admin_id', adminId)
      .eq('status', 'accepted')
    
    if (error) throw error
    
    // Get today's attendance for each room
    const today = new Date().toISOString().split('T')[0]
    const rooms = await Promise.all((data || []).map(async (invite) => {
      const room = invite.room
      if (!room) return null
      
      const { data: todayAttendance } = await supabaseAdmin
        .from('attendance')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', room.user_id)
        .eq('date', today)
        .maybeSingle()
      
      return {
        ...room,
        invite_code: invite.invite_code,
        assignedBy: room.user,
        today_attendance: todayAttendance
      }
    }))
    
    return rooms.filter(Boolean)
  }
}

export default roomsService
