/**
 * Room Reminder Cron Scheduler
 * 
 * Runs every minute, checks which room reminders should fire,
 * and sends Web Push notifications to users — even if their
 * PWA/browser is closed.
 * 
 * Flow:
 * 1. Every minute, query room_reminders joined with rooms
 * 2. For each reminder, compare current time with (room.time_start - minutes_before)
 *    using the user's stored timezone to correctly interpret room.time_start
 * 3. If the reminder should fire within this minute window, send push
 * 4. Track sent reminders to avoid duplicates (using in-memory dedup)
 */

import cron from 'node-cron'
import { supabaseAdmin } from '../config/supabase.js'
import { pushService } from '../services/pushService.js'
import { pushEnabled } from '../config/webpush.js'

// In-memory dedup: track reminders fired today to avoid re-sends
// Key: `${userId}-${roomId}-${minutesBefore}-${YYYY-MM-DD}`
const firedToday = new Set()

/**
 * Clear the dedup set at midnight
 */
function clearDailyLog() {
  firedToday.clear()
  console.log('🔄 Cleared daily reminder dedup log')
}

/**
 * Convert a TIME string (e.g. "09:00:00") in a given IANA timezone
 * to a UTC Date for today.
 * 
 * E.g. parseTimeInTimezone("09:00:00", "Asia/Kolkata") → Date at 03:30 UTC today
 */
function parseTimeInTimezone(timeStr, timezone) {
  if (!timeStr) return null

  const parts = timeStr.split(':').map(Number)
  const hours = parts[0] || 0
  const minutes = parts[1] || 0

  // Create a date string for today in the user's timezone
  // We use a reference date in the user's timezone to calculate the UTC offset
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')

  try {
    // Build a date-time string and parse it as if it's in the user's timezone
    // Use Intl.DateTimeFormat to find the actual date in the user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const tzParts = formatter.formatToParts(now)
    const tzYear = tzParts.find(p => p.type === 'year').value
    const tzMonth = tzParts.find(p => p.type === 'month').value
    const tzDay = tzParts.find(p => p.type === 'day').value

    // Construct ISO string as if in that timezone, then compute UTC offset
    // by comparing formatted "now" in that timezone to actual UTC
    const localDateStr = `${tzYear}-${tzMonth}-${tzDay}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
    
    // Get the offset for this timezone at this moment
    const tempDate = new Date(localDateStr + 'Z') // treat as UTC first
    const utcStr = tempDate.toLocaleString('en-US', { timeZone: 'UTC' })
    const tzStr = tempDate.toLocaleString('en-US', { timeZone: timezone })
    const utcDate = new Date(utcStr)
    const tzDate = new Date(tzStr)
    const offsetMs = tzDate.getTime() - utcDate.getTime()

    // The actual UTC time for "hours:minutes in timezone" today
    const result = new Date(tempDate.getTime() - offsetMs)
    return result
  } catch (err) {
    // Fallback: treat as server local time
    console.warn(`Invalid timezone "${timezone}", falling back to server time:`, err.message)
    const fallback = new Date()
    fallback.setHours(hours, minutes, 0, 0)
    return fallback
  }
}

/**
 * Core check: find reminders that should fire NOW and send pushes
 */
async function checkAndSendReminders() {
  if (!pushEnabled) return

  try {
    // Fetch all enabled reminders with their room details
    const { data: reminders, error } = await supabaseAdmin
      .from('room_reminders')
      .select('*, rooms(id, name, emoji, time_start, time_end)')
      .eq('enabled', true)

    if (error) {
      console.error('Reminder cron: DB error:', error)
      return
    }

    if (!reminders || reminders.length === 0) return

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
    let sentCount = 0
    let checkedCount = reminders.length

    for (const reminder of reminders) {
      const room = reminder.rooms
      if (!room || !room.time_start) continue

      // Calculate when this reminder should fire, using user's timezone
      const userTz = reminder.timezone || 'UTC'
      const roomOpens = parseTimeInTimezone(room.time_start, userTz)
      if (!roomOpens) continue

      const reminderTime = new Date(roomOpens.getTime() - reminder.minutes_before * 60 * 1000)

      // Check if the reminder should fire within this minute window
      // (current time is within 0-59 seconds of the reminder time)
      const diffMs = now.getTime() - reminderTime.getTime()
      const isInWindow = diffMs >= 0 && diffMs < 60 * 1000 // 0 to 59 seconds after target

      if (!isInWindow) continue

      // Dedup check
      const dedupKey = `${reminder.user_id}-${reminder.room_id}-${reminder.minutes_before}-${todayStr}`
      if (firedToday.has(dedupKey)) continue

      // Send push notification
      try {
        const result = await pushService.sendRoomReminder(
          reminder.user_id,
          room,
          reminder.minutes_before
        )

        // Mark as fired regardless of result (to avoid spam retries)
        firedToday.add(dedupKey)

        if (result.sent > 0) {
          sentCount++

          // Also create an in-app notification record
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: reminder.user_id,
              type: 'room_opening',
              title: `${room.emoji || '📋'} ${room.name} opens soon!`,
              body: `Your room opens in ${reminder.minutes_before} min. Get ready!`,
              data: { roomId: room.id, minutesBefore: reminder.minutes_before },
              push_sent: result.sent > 0
            })
        }
      } catch (err) {
        // Mark as fired to avoid retry-spam
        firedToday.add(dedupKey)
        console.error(`Failed to send reminder for user ${reminder.user_id}, room ${room.id}:`, err)
      }
    }

    if (sentCount > 0) {
      console.log(`🔔 Sent ${sentCount} room reminder(s) [checked ${checkedCount}]`)
    }
  } catch (err) {
    console.error('Reminder cron: unexpected error:', err)
  }
}

/**
 * Start the reminder cron jobs
 */
export function startReminderCron() {
  if (!pushEnabled) {
    console.log('⏭️  Reminder cron skipped (Web Push not configured)')
    console.log('   Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables to enable.')
    return
  }

  // Run every minute
  cron.schedule('* * * * *', checkAndSendReminders, {
    timezone: undefined // Server timezone; room times are converted using user's stored timezone
  })

  // Clear dedup log at midnight
  cron.schedule('0 0 * * *', clearDailyLog)

  console.log('⏰ Room reminder cron started (checks every minute)')
}

export default startReminderCron
