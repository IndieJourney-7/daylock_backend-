/**
 * VAPID Key Generator
 * Run once: node generate-vapid-keys.js
 * 
 * Copy the output values into your .env file:
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *   VAPID_SUBJECT=mailto:your-email@example.com
 */

import webpush from 'web-push'

const vapidKeys = webpush.generateVAPIDKeys()

console.log('\n🔑 VAPID Keys Generated!\n')
console.log('Add these to your .env file:\n')
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:your-email@example.com`)
console.log('\n⚠️  Keep the private key SECRET. The public key goes in the frontend too.\n')
