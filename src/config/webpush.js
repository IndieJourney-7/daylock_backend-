/**
 * Web Push Configuration
 * Requires VAPID keys in environment variables.
 * Generate keys: node generate-vapid-keys.js
 */

import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:daylock@example.com'

let pushEnabled = false

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  pushEnabled = true
  console.log('✅ Web Push configured with VAPID keys')
} else {
  console.warn('⚠️  VAPID keys not set — Web Push disabled. Run: node generate-vapid-keys.js')
}

export { webpush, pushEnabled, VAPID_PUBLIC_KEY }
