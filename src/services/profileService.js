/**
 * Profile Service
 * Handle user profile operations
 */

import { supabaseAdmin } from '../config/supabase.js'

export const profileService = {
  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Create or update profile
   */
  async upsertProfile(userId, profileData) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Update profile
   */
  async updateProfile(userId, updates) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Ensure profile exists (create if not)
   */
  async ensureProfile(userId, userData) {
    const existing = await this.getProfile(userId)
    
    if (existing) return existing
    
    return this.upsertProfile(userId, {
      email: userData.email,
      name: userData.name || userData.email?.split('@')[0],
      avatar_url: userData.avatar_url
    })
  }
}

export default profileService
