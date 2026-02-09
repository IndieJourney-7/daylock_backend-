/**
 * Invites Service
 * Handle room invite codes for admin assignment
 */

import { supabaseAdmin } from '../config/supabase.js'

/**
 * Generate an invite code from the room name + unique number
 * e.g. "Gym" -> "gym-482", "Morning Study" -> "morning-study-731"
 */
async function generateInviteCode(roomName) {
  const slug = (roomName || 'room')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'room'

  // Try up to 10 times to find a unique code
  for (let attempt = 0; attempt < 10; attempt++) {
    const num = Math.floor(100 + Math.random() * 900) // 3-digit: 100-999
    const code = `${slug}-${num}`

    const { data } = await supabaseAdmin
      .from('room_invites')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle()

    if (!data) return code // unique
  }

  // Fallback: slug + timestamp fragment
  const ts = Date.now().toString(36).slice(-4)
  return `${slug}-${ts}`
}

export const invitesService = {
  /**
   * Create a new invite for a room
   */
  /**
   * Create a new invite for a room
   * roomName is used to generate the invite code (e.g. gym-482)
   */
  async createInvite(roomId, userId, roomName) {
    // Verify user owns the room
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('user_id, name')
      .eq('id', roomId)
      .single()
    
    if (!room || room.user_id !== userId) {
      throw new Error('Unauthorized to create invite for this room')
    }
    
    const code = await generateInviteCode(roomName || room.name)
    
    const { data, error } = await supabaseAdmin
      .from('room_invites')
      .insert({
        room_id: roomId,
        invite_code: code,
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) {
      // If code collision, retry
      if (error.code === '23505') {
        return this.createInvite(roomId, userId, roomName)
      }
      throw error
    }
    
    return data
  },

  /**
   * Get invite by code
   */
  async getInviteByCode(code) {
    const { data, error } = await supabaseAdmin
      .from('room_invites')
      .select(`
        *,
        room:rooms (
          id, name, emoji, time_start, time_end,
          user:profiles!rooms_user_id_fkey (
            id, name, email
          )
        )
      `)
      .eq('invite_code', code.toLowerCase())
      .maybeSingle()
    
    if (error) throw error
    return data
  },

  /**
   * Accept an invite (admin joins room)
   */
  async acceptInvite(inviteCode, adminId) {
    const invite = await this.getInviteByCode(inviteCode)
    
    if (!invite) {
      throw new Error('Invalid invite code')
    }
    
    if (invite.status !== 'pending') {
      throw new Error('This invite has already been used')
    }
    
    // Check if admin already manages this room
    const { data: existing } = await supabaseAdmin
      .from('room_invites')
      .select('id')
      .eq('room_id', invite.room_id)
      .eq('admin_id', adminId)
      .eq('status', 'accepted')
      .maybeSingle()
    
    if (existing) {
      throw new Error('You are already managing this room')
    }
    
    // Check if admin is the room owner
    if (invite.room?.user?.id === adminId) {
      throw new Error('You cannot be admin of your own room')
    }
    
    // Update invite with admin
    const { data, error } = await supabaseAdmin
      .from('room_invites')
      .update({
        admin_id: adminId,
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id)
      .select(`
        *,
        room:rooms (
          id, name, emoji
        )
      `)
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Revoke an invite
   */
  async revokeInvite(inviteId, userId) {
    // Verify user owns the room
    const { data: invite } = await supabaseAdmin
      .from('room_invites')
      .select('room_id, room:rooms(user_id)')
      .eq('id', inviteId)
      .single()
    
    if (!invite || invite.room?.user_id !== userId) {
      throw new Error('Unauthorized to revoke this invite')
    }
    
    const { data, error } = await supabaseAdmin
      .from('room_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Get invites for a room
   */
  async getRoomInvites(roomId) {
    const { data, error } = await supabaseAdmin
      .from('room_invites')
      .select(`
        *,
        admin:profiles!room_invites_admin_id_fkey (
          id, name, email
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }
}

export default invitesService
