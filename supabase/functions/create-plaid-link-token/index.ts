import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET')
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox'
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Check Plaid configuration
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      console.error('Plaid credentials not configured')
      return new Response(
        JSON.stringify({
          error: 'Plaid not configured',
          details: 'PLAID_CLIENT_ID and PLAID_SECRET must be set in Edge Function secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client and verify user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating Plaid link token for user ${user.id}`)

    // Determine Plaid API base URL
    const plaidBaseUrl =
      PLAID_ENV === 'sandbox'
        ? 'https://sandbox.plaid.com'
        : PLAID_ENV === 'development'
          ? 'https://development.plaid.com'
          : 'https://production.plaid.com'

    // Create Plaid Link token
    const linkTokenResponse = await fetch(`${plaidBaseUrl}/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        user: { client_user_id: user.id },
        client_name: 'Credit Wizard',
        products: ['auth', 'transactions'],
        country_codes: ['US'],
        language: 'en',
      }),
    })

    const linkTokenData = await linkTokenResponse.json()

    if (!linkTokenResponse.ok) {
      console.error('Plaid API error:', linkTokenData)
      return new Response(
        JSON.stringify({
          error: 'Failed to create link token',
          details: linkTokenData.error_message || linkTokenData,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Link token created successfully for user ${user.id}`)

    return new Response(
      JSON.stringify({ link_token: linkTokenData.link_token }),
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
