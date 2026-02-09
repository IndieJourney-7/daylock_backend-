/**
 * Rooms Service
 * CRUD operations for rooms
 */

import { supabaseAdmin } from '../config/supabase.js'

/**
 * Generate a unique room code from the room name
 * e.g. "Gym" -> "gym-878", "Morning Study" -> "morning-study-342"
 */
async function generateRoomCode(name) {
  // Sanitize name: lowercase, replace spaces with dashes, remove special chars
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'room'

  // Try up to 10 times to find a unique code
  for (let attempt = 0; attempt < 10; attempt++) {
    const num = Math.floor(100 + Math.random() * 900) // 3-digit number 100-999
    const code = `${slug}-${num}`

    // Check uniqueness
    const { data } = await supabaseAdmin
      .from('rooms')
      .select('id')
      .eq('room_code', code)
      .maybeSingle()

    if (!data) return code // unique!
  }

  // Fallback: use slug + timestamp fragment for guaranteed uniqueness
  const ts = Date.now().toString(36).slice(-4)
  return `${slug}-${ts}`
}

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
   * Room code is auto-generated from the name (e.g. gym-878)
   * Timing is NOT set by user — admin does it later
   */
  async createRoom(userId, roomData) {
    const room_code = await generateRoomCode(roomData.name)

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .insert({
        user_id: userId,
        name: roomData.name,
        emoji: roomData.emoji || '📋',
        description: roomData.description || '',
        room_code,
        time_start: null,
        time_end: null
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Update a room (owner only)
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
   * Admin update a room (admin can update time, toggle, etc.)
   * Verifies user is admin of the room via room_invites
   */
  async adminUpdateRoom(roomId, adminId, updates) {
    // Verify admin access
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('room_invites')
      .select('id')
      .eq('room_id', roomId)
      .eq('admin_id', adminId)
      .eq('status', 'accepted')
      .maybeSingle()
    
    if (inviteError) throw inviteError
    if (!invite) {
      throw new Error('Unauthorized: you are not an admin of this room')
    }
    
    // Only allow specific fields for admin updates
    const allowedFields = ['time_start', 'time_end', 'is_paused', 'allow_late_upload', 'description']
    const sanitized = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key]
      }
    }
    
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .update({
        ...sanitized,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Toggle room pause status (admin)
   */
  async toggleRoomPause(roomId, adminId) {
    // Verify admin access
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('room_invites')
      .select('id')
      .eq('room_id', roomId)
      .eq('admin_id', adminId)
      .eq('status', 'accepted')
      .maybeSingle()
    
    if (inviteError) throw inviteError
    if (!invite) {
      throw new Error('Unauthorized: you are not an admin of this room')
    }
    
    // Get current state
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('is_paused')
      .eq('id', roomId)
      .single()
    
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .update({
        is_paused: !room.is_paused,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Toggle allow late upload (admin)
   */
  async toggleLateUpload(roomId, adminId) {
    // Verify admin access
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('room_invites')
      .select('id')
      .eq('room_id', roomId)
      .eq('admin_id', adminId)
      .eq('status', 'accepted')
      .maybeSingle()
    
    if (inviteError) throw inviteError
    if (!invite) {
      throw new Error('Unauthorized: you are not an admin of this room')
    }
    
    // Get current state
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('allow_late_upload')
      .eq('id', roomId)
      .single()
    
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .update({
        allow_late_upload: !room.allow_late_upload,
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
