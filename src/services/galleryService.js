/**
 * Gallery Service
 * Fetch approved proof photos organized by room
 */

import { supabaseAdmin } from '../config/supabase.js'

export const galleryService = {
  /**
   * Get all rooms with their approved proof counts for gallery view
   * Returns rooms that have at least one approved proof with a photo
   */
  async getUserGalleryRooms(userId) {
    // Get user's rooms
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, emoji')
      .eq('user_id', userId)

    if (roomsError) throw roomsError
    if (!rooms || rooms.length === 0) return []

    // For each room, count approved proofs with photos
    const roomIds = rooms.map(r => r.id)

    const { data: proofs, error: proofsError } = await supabaseAdmin
      .from('attendance')
      .select('room_id, proof_url, date')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .not('proof_url', 'is', null)
      .in('room_id', roomIds)
      .order('date', { ascending: false })

    if (proofsError) throw proofsError

    // Group proofs by room
    const proofsByRoom = {}
    for (const proof of (proofs || [])) {
      if (!proofsByRoom[proof.room_id]) {
        proofsByRoom[proof.room_id] = []
      }
      proofsByRoom[proof.room_id].push(proof)
    }

    // Build gallery rooms with counts and latest thumbnail
    return rooms
      .map(room => ({
        ...room,
        photoCount: proofsByRoom[room.id]?.length || 0,
        latestPhoto: proofsByRoom[room.id]?.[0]?.proof_url || null,
        latestDate: proofsByRoom[room.id]?.[0]?.date || null
      }))
      .filter(room => room.photoCount > 0)
      .sort((a, b) => b.photoCount - a.photoCount)
  },

  /**
   * Get all approved proof photos for a specific room
   * Returns photos with dates, sorted newest first
   */
  async getRoomGalleryPhotos(roomId, userId, options = {}) {
    let query = supabaseAdmin
      .from('attendance')
      .select(`
        id,
        date,
        proof_url,
        note,
        submitted_at,
        reviewed_at,
        room:rooms (
          id, name, emoji
        )
      `)
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .eq('status', 'approved')
      .not('proof_url', 'is', null)
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
   * Get ALL approved proof photos across all rooms for a user
   * Useful for the "all photos" view
   */
  async getAllGalleryPhotos(userId, options = {}) {
    let query = supabaseAdmin
      .from('attendance')
      .select(`
        id,
        date,
        proof_url,
        note,
        submitted_at,
        reviewed_at,
        room:rooms (
          id, name, emoji
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'approved')
      .not('proof_url', 'is', null)
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
  }
}

export default galleryService
