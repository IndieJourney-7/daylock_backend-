/**
 * Rules Service
 * Handle room rules CRUD operations
 */

import { supabaseAdmin } from '../config/supabase.js'

export const rulesService = {
  /**
   * Get rules for a room
   */
  async getRoomRules(roomId) {
    const { data, error } = await supabaseAdmin
      .from('room_rules')
      .select('*')
      .eq('room_id', roomId)
      .order('sort_order', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  /**
   * Add a rule to a room
   */
  async addRule(roomId, text, adminId) {
    // Verify admin has access to this room
    const { data: invite } = await supabaseAdmin
      .from('room_invites')
      .select('id')
      .eq('room_id', roomId)
      .eq('admin_id', adminId)
      .eq('status', 'accepted')
      .maybeSingle()
    
    if (!invite) {
      throw new Error('Unauthorized to add rules to this room')
    }
    
    // Get max sort_order
    const { data: existing } = await supabaseAdmin
      .from('room_rules')
      .select('sort_order')
      .eq('room_id', roomId)
      .order('sort_order', { ascending: false })
      .limit(1)
    
    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1
    
    const { data, error } = await supabaseAdmin
      .from('room_rules')
      .insert({
        room_id: roomId,
        text,
        sort_order: nextOrder
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Update a rule
   */
  async updateRule(ruleId, updates, adminId) {
    // Verify admin has access
    const { data: rule } = await supabaseAdmin
      .from('room_rules')
      .select('room_id')
      .eq('id', ruleId)
      .single()
    
    if (!rule) throw new Error('Rule not found')
    
    const { data: invite } = await supabaseAdmin
      .from('room_invites')
      .select('id')
      .eq('room_id', rule.room_id)
      .eq('admin_id', adminId)
      .eq('status', 'accepted')
      .maybeSingle()
    
    if (!invite) {
      throw new Error('Unauthorized to update this rule')
    }
    
    const { data, error } = await supabaseAdmin
      .from('room_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Toggle rule enabled status
   */
  async toggleRule(ruleId, adminId) {
    // Get current state
    const { data: rule } = await supabaseAdmin
      .from('room_rules')
      .select('enabled, room_id')
      .eq('id', ruleId)
      .single()
    
    if (!rule) throw new Error('Rule not found')
    
    // Verify admin access
    const { data: invite } = await supabaseAdmin
      .from('room_invites')
      .select('id')
      .eq('room_id', rule.room_id)
      .eq('admin_id', adminId)
      .eq('status', 'accepted')
      .maybeSingle()
    
    if (!invite) {
      throw new Error('Unauthorized to toggle this rule')
    }
    
    const { data, error } = await supabaseAdmin
      .from('room_rules')
      .update({ enabled: !rule.enabled })
      .eq('id', ruleId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Delete a rule
   */
  async deleteRule(ruleId, adminId) {
    // Get rule and verify admin access
    const { data: rule } = await supabaseAdmin
      .from('room_rules')
      .select('room_id')
      .eq('id', ruleId)
      .single()
    
    if (!rule) throw new Error('Rule not found')
    
    const { data: invite } = await supabaseAdmin
      .from('room_invites')
      .select('id')
      .eq('room_id', rule.room_id)
      .eq('admin_id', adminId)
      .eq('status', 'accepted')
      .maybeSingle()
    
    if (!invite) {
      throw new Error('Unauthorized to delete this rule')
    }
    
    const { error } = await supabaseAdmin
      .from('room_rules')
      .delete()
      .eq('id', ruleId)
    
    if (error) throw error
    return { success: true }
  }
}

export default rulesService
