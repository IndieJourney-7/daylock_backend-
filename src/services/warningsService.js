/**
 * Warnings & Consequences Service
 * Handle warnings, auto-triggers, and consequence escalation
 */

import { supabaseAdmin } from '../config/supabase.js'

export const warningsService = {
  /**
   * Get all active warnings for rooms an admin manages
   */
  async getAdminWarnings(adminId) {
    // Get rooms this admin manages
    const { data: invites } = await supabaseAdmin
      .from('room_invites')
      .select('room_id')
      .eq('admin_id', adminId)
      .eq('status', 'accepted')

    if (!invites || invites.length === 0) return []

    const roomIds = invites.map(i => i.room_id)

    const { data, error } = await supabaseAdmin
      .from('warnings')
      .select(`
        *,
        room:rooms (id, name, emoji),
        user:profiles!warnings_user_id_fkey (id, name, avatar_url)
      `)
      .in('room_id', roomIds)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Get warnings for a specific room
   */
  async getWarnings(roomId) {
    const { data, error } = await supabaseAdmin
      .from('warnings')
      .select(`
        *,
        user:profiles!warnings_user_id_fkey (id, name, avatar_url)
      `)
      .eq('room_id', roomId)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Create a manual warning
   */
  async createWarning({ room_id, user_id, admin_id, severity, message }) {
    const { data, error } = await supabaseAdmin
      .from('warnings')
      .insert({
        room_id,
        user_id,
        admin_id,
        type: 'manual',
        severity: severity || 'warning',
        message
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create an auto-detected warning (deduplicates by trigger_reason)
   */
  async createAutoWarning({ room_id, user_id, admin_id, trigger_reason, severity, message }) {
    // Check if already exists and is active
    const { data: existing } = await supabaseAdmin
      .from('warnings')
      .select('id')
      .eq('room_id', room_id)
      .eq('user_id', user_id)
      .eq('trigger_reason', trigger_reason)
      .eq('active', true)
      .maybeSingle()

    if (existing) return existing // Already warned for this trigger

    const { data, error } = await supabaseAdmin
      .from('warnings')
      .insert({
        room_id,
        user_id,
        admin_id,
        type: 'auto',
        trigger_reason,
        severity: severity || 'warning',
        message
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Acknowledge a warning (user action)
   */
  async acknowledgeWarning(warningId) {
    const { data, error } = await supabaseAdmin
      .from('warnings')
      .update({ acknowledged: true, updated_at: new Date().toISOString() })
      .eq('id', warningId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Dismiss/deactivate a warning (admin action)
   */
  async dismissWarning(warningId) {
    const { data, error } = await supabaseAdmin
      .from('warnings')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', warningId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get consequences for a room
   */
  async getConsequences(roomId) {
    const { data, error } = await supabaseAdmin
      .from('consequences')
      .select(`
        *,
        user:profiles!consequences_user_id_fkey (id, name, avatar_url)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Issue a consequence
   */
  async issueConsequence({ room_id, user_id, admin_id, level, reason, notes, expires_at }) {
    const { data, error } = await supabaseAdmin
      .from('consequences')
      .insert({
        room_id,
        user_id,
        admin_id,
        level: level || 'warning',
        reason,
        notes,
        expires_at
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Resolve a consequence
   */
  async resolveConsequence(consequenceId) {
    const { data, error } = await supabaseAdmin
      .from('consequences')
      .update({ active: false, resolved_at: new Date().toISOString() })
      .eq('id', consequenceId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export default warningsService
