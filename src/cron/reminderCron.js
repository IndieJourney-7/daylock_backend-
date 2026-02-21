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
 * 3. If the reminder should fire within this minute window, send push
 * 4. Track sent reminders to avoid duplicates (using notification_log in DB)
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
 * Parse a TIME string (e.g. "09:00:00" or "09:00") into today's Date object
 */
function parseTimeToday(timeStr) {
  if (!timeStr) return null
  const parts = timeStr.split(':').map(Number)
  const now = new Date()
  now.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0)
  return now
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

    for (const reminder of reminders) {
      const room = reminder.rooms
      if (!room || !room.time_start) continue

      // Calculate when this reminder should fire
      const roomOpens = parseTimeToday(room.time_start)
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
      console.log(`🔔 Sent ${sentCount} room reminder(s)`)
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
    return
  }

  // Run every minute
  cron.schedule('* * * * *', checkAndSendReminders, {
    timezone: undefined // Uses server timezone; reminders are computed against user's local time
  })

  // Clear dedup log at midnight
  cron.schedule('0 0 * * *', clearDailyLog)

  console.log('⏰ Room reminder cron started (checks every minute)')
}

export default startReminderCron
