import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  generatePushHTTPRequest,
  type PushSubscription,
  type VapidKeys,
} from 'jsr:@negrel/webpush'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  notification_id: string
  recipient_id: string
  title: string
  message: string
  type: string
}

// Helper to decode base64url to Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@creditwizard.com'

    // Check VAPID configuration
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('VAPID keys not configured')
      return new Response(
        JSON.stringify({
          error: 'Push notifications not configured',
          details: 'VAPID keys are missing. Please configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Supabase Edge Function secrets.',
          help: 'Generate VAPID keys using: npx web-push generate-vapid-keys'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare VAPID keys for the library
    const vapidKeys: VapidKeys = {
      publicKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
      privateKey: base64UrlToUint8Array(VAPID_PRIVATE_KEY),
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parse request body
    const payload: NotificationPayload = await req.json()
    const { recipient_id, title, message, type, notification_id } = payload

    console.log(`Processing push notification for user ${recipient_id}: "${title}"`)

    if (!recipient_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: recipient_id, title, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all push subscriptions for the recipient
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', recipient_id)

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions', details: subError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${recipient_id}`)
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found for this user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user ${recipient_id}`)

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      message,
      body: message,
      type,
      notification_id,
      tag: `notif-${notification_id}`,
      timestamp: Date.now(),
    })

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        // Convert database subscription to PushSubscription format
        const pushSubscription: PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        }

        console.log(`Sending push to endpoint: ${sub.endpoint.substring(0, 60)}...`)

        try {
          // Generate the push request using @negrel/webpush
          const { headers, body, endpoint } = await generatePushHTTPRequest({
            applicationServerKeys: vapidKeys,
            payload: new TextEncoder().encode(notificationPayload),
            target: pushSubscription,
            adminContact: VAPID_SUBJECT,
            ttl: 86400, // 24 hours
            urgency: 'high',
          })

          // Send the push notification
          const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
          })

          if (response.ok || response.status === 201) {
            console.log(`Successfully sent push to ${sub.endpoint.substring(0, 40)}...`)
            return { success: true, endpoint: sub.endpoint }
          } else {
            const errorText = await response.text()
            console.error(`Push failed with status ${response.status}: ${errorText}`)

            // If subscription is expired/invalid (410 Gone or 404 Not Found), remove it
            if (response.status === 404 || response.status === 410) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', sub.id)
              console.log(`Removed expired subscription ${sub.id}`)
            }

            return { success: false, endpoint: sub.endpoint, error: `HTTP ${response.status}: ${errorText}`, statusCode: response.status }
          }
        } catch (error: unknown) {
          const err = error as Error
          console.error(`Push exception for ${sub.endpoint.substring(0, 40)}:`, err.message)
          return { success: false, endpoint: sub.endpoint, error: err.message }
        }
      })
    )

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length

    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    )

    console.log(`Sent ${successful}/${subscriptions.length} push notifications for user ${recipient_id}`)

    if (failed.length > 0) {
      const failedDetails = failed.map(f => {
        if (f.status === 'fulfilled') {
          return { endpoint: f.value.endpoint?.substring(0, 40), error: f.value.error, statusCode: f.value.statusCode }
        }
        return { error: 'Promise rejected' }
      })
      console.log(`Failed attempts:`, JSON.stringify(failedDetails))
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed: failed.length,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string }
    console.error('Edge function error:', err.message, err.stack)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
