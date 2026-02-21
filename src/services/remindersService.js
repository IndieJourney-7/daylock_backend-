/**
 * Room Reminders Service
 * Per-user, per-room custom alert timings
 */

import { supabaseAdmin } from '../config/supabase.js'

export const remindersService = {
  /**
   * Get all reminders for a user (across all rooms)
   */
  async getAll(userId) {
    const { data, error } = await supabaseAdmin
      .from('room_reminders')
      .select('*, rooms(id, name, emoji, time_start, time_end)')
      .eq('user_id', userId)
      .eq('enabled', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  /**
   * Get reminders for a specific room
   */
  async getForRoom(userId, roomId) {
    const { data, error } = await supabaseAdmin
      .from('room_reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('room_id', roomId)
      .order('minutes_before', { ascending: true })
    if (error) throw error
    return data || []
  },

  /**
   * Set reminders for a room (replaces all existing)
   * @param {string} userId
   * @param {string} roomId
   * @param {number[]} minutesBefore - array of minutes, e.g. [5, 10, 15]
   */
  async setForRoom(userId, roomId, minutesBefore = []) {
    // Delete existing reminders for this user+room
    const { error: delError } = await supabaseAdmin
      .from('room_reminders')
      .delete()
      .eq('user_id', userId)
      .eq('room_id', roomId)
    if (delError) throw delError

    // If no reminders requested, we're done
    if (!minutesBefore || minutesBefore.length === 0) {
      return []
    }

    // Insert new reminders
    const rows = minutesBefore.map(min => ({
      user_id: userId,
      room_id: roomId,
      minutes_before: min,
      enabled: true
    }))

    const { data, error } = await supabaseAdmin
      .from('room_reminders')
      .insert(rows)
      .select()
    if (error) throw error
    return data || []
  },

  /**
   * Add a single reminder
   */
  async add(userId, roomId, minutesBefore) {
    const { data, error } = await supabaseAdmin
      .from('room_reminders')
      .upsert({
        user_id: userId,
        room_id: roomId,
        minutes_before: minutesBefore,
        enabled: true
      }, { onConflict: 'user_id, room_id, minutes_before' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Remove a single reminder
   */
  async remove(userId, reminderId) {
    const { error } = await supabaseAdmin
      .from('room_reminders')
      .delete()
      .eq('id', reminderId)
      .eq('user_id', userId)
    if (error) throw error
  },

  /**
   * Toggle a reminder on/off
   */
  async toggle(userId, reminderId, enabled) {
    const { data, error } = await supabaseAdmin
      .from('room_reminders')
      .update({ enabled })
      .eq('id', reminderId)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
