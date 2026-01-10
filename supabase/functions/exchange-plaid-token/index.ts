import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExchangeRequest {
  public_token: string
  institution: {
    institution_id: string
    name: string
  }
}

// Simple AES-GCM encryption for access token storage
async function encryptToken(token: string, key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32))

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  )

  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Get environment variables
  const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')
  const PLAID_SECRET = Deno.env.get('PLAID_SECRET')
  const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox'
  const PLAID_ENCRYPTION_KEY = Deno.env.get('PLAID_ENCRYPTION_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  // Debug endpoint - check configuration without auth
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        config: {
          plaid_client_id: PLAID_CLIENT_ID ? 'set' : 'MISSING',
          plaid_secret: PLAID_SECRET ? 'set' : 'MISSING',
          plaid_env: PLAID_ENV,
          plaid_encryption_key: PLAID_ENCRYPTION_KEY ? 'set' : 'not set (optional)',
          supabase_url: SUPABASE_URL ? 'set' : 'MISSING',
          supabase_service_role_key: SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('=== Exchange Token Request Started ===')

    // Check configuration
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      console.error('Missing Plaid credentials')
      return new Response(
        JSON.stringify({ error: 'Plaid not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials')
      return new Response(
        JSON.stringify({ error: 'Supabase not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Config check passed')

    // Warn if encryption key not set (but don't block - for testing)
    if (!PLAID_ENCRYPTION_KEY) {
      console.warn('PLAID_ENCRYPTION_KEY not set - using placeholder for access token')
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No Authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating Supabase client...')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')

    console.log('Verifying user token...')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      console.error('Auth error:', userError?.message)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Parse request body
    let requestBody: ExchangeRequest
    try {
      requestBody = await req.json()
      console.log('Request body parsed:', JSON.stringify(requestBody))
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { public_token, institution } = requestBody

    if (!public_token || !institution?.institution_id || !institution?.name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: public_token, institution' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Exchanging token for user ${user.id}, institution: ${institution.name}`)

    // Determine Plaid API base URL
    const plaidBaseUrl =
      PLAID_ENV === 'sandbox'
        ? 'https://sandbox.plaid.com'
        : PLAID_ENV === 'development'
          ? 'https://development.plaid.com'
          : 'https://production.plaid.com'

    console.log(`Using Plaid environment: ${PLAID_ENV}, base URL: ${plaidBaseUrl}`)

    // Exchange public token for access token
    console.log('Calling Plaid /item/public_token/exchange...')
    let exchangeResponse
    try {
      exchangeResponse = await fetch(`${plaidBaseUrl}/item/public_token/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          public_token,
        }),
      })
      console.log(`Plaid exchange response status: ${exchangeResponse.status}`)
    } catch (fetchError) {
      console.error('Fetch error during token exchange:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Network error calling Plaid', details: String(fetchError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let exchangeData
    try {
      exchangeData = await exchangeResponse.json()
      console.log('Plaid exchange response received')
    } catch (jsonError) {
      console.error('Failed to parse Plaid response:', jsonError)
      return new Response(
        JSON.stringify({ error: 'Invalid response from Plaid' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!exchangeResponse.ok) {
      console.error('Plaid exchange error:', JSON.stringify(exchangeData))
      return new Response(
        JSON.stringify({
          error: 'Failed to exchange token',
          details: exchangeData.error_message || JSON.stringify(exchangeData),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { access_token, item_id } = exchangeData
    console.log(`Got access token and item_id: ${item_id}`)

    // Fetch accounts using the access token
    console.log(`Fetching accounts for item ${item_id}`)
    let accounts: Array<{
      account_id: string
      name: string
      official_name: string | null
      type: string
      subtype: string | null
      mask: string | null
      balances: {
        available: number | null
        current: number | null
        limit: number | null
      }
    }> = []

    try {
      const accountsResponse = await fetch(`${plaidBaseUrl}/accounts/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token,
        }),
      })

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        accounts = accountsData.accounts || []
        console.log(`Found ${accounts.length} accounts`)
      } else {
        const errorData = await accountsResponse.json()
        console.warn('Could not fetch accounts:', errorData)
      }
    } catch (err) {
      console.warn('Error fetching accounts:', err)
    }

    // Get institution details for logo and color
    let logoUrl: string | null = null
    let primaryColor: string | null = null

    try {
      const institutionResponse = await fetch(`${plaidBaseUrl}/institutions/get_by_id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          institution_id: institution.institution_id,
          country_codes: ['US'],
          options: { include_optional_metadata: true },
        }),
      })

      if (institutionResponse.ok) {
        const institutionData = await institutionResponse.json()
        const inst = institutionData.institution || {}
        logoUrl = inst.logo || null
        primaryColor = inst.primary_color || null
      }
    } catch (err) {
      console.warn('Could not fetch institution details:', err)
    }

    // Check for existing treasury bank mapping
    console.log('Checking for treasury bank mapping...')
    const { data: mapping, error: mappingError } = await supabase
      .from('plaid_institution_mapping')
      .select('treasury_bank_prefix')
      .eq('plaid_institution_id', institution.institution_id)
      .single()

    if (mappingError && mappingError.code !== 'PGRST116') {
      console.warn('Mapping lookup error (non-fatal):', mappingError.message)
    }
    console.log('Treasury mapping:', mapping?.treasury_bank_prefix || 'none')

    // Encrypt access token before storing (or use placeholder if no key)
    console.log('Encrypting access token...')
    let encryptedToken: string
    try {
      encryptedToken = PLAID_ENCRYPTION_KEY
        ? await encryptToken(access_token, PLAID_ENCRYPTION_KEY)
        : `unencrypted:${access_token}` // For testing only - set PLAID_ENCRYPTION_KEY in production!
      console.log('Token encrypted successfully')
    } catch (encryptError) {
      console.error('Encryption error:', encryptError)
      return new Response(
        JSON.stringify({ error: 'Failed to encrypt token', details: String(encryptError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if connection already exists
    console.log('Checking for existing connection...')
    const { data: existingConn, error: existingError } = await supabase
      .from('bank_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('institution_id', institution.institution_id)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing connection:', existingError)
    }

    let connection
    let dbError

    if (existingConn) {
      // Update existing connection
      console.log('Updating existing connection:', existingConn.id)
      const { data, error } = await supabase
        .from('bank_connections')
        .update({
          item_id,
          institution_name: institution.name,
          logo_url: logoUrl,
          primary_color: primaryColor,
          access_token_encrypted: encryptedToken,
          treasury_bank_prefix: mapping?.treasury_bank_prefix || null,
          status: 'connected',
          accounts_count: accounts.length,
          linked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConn.id)
        .select('id, institution_id, institution_name, logo_url, primary_color, treasury_bank_prefix, status, accounts_count, linked_at')
        .single()
      connection = data
      dbError = error
      console.log('Update result:', data ? 'success' : 'no data', error ? error.message : 'no error')
    } else {
      // Insert new connection
      console.log('Creating new connection...')
      const { data, error } = await supabase
        .from('bank_connections')
        .insert({
          user_id: user.id,
          item_id,
          institution_id: institution.institution_id,
          institution_name: institution.name,
          logo_url: logoUrl,
          primary_color: primaryColor,
          access_token_encrypted: encryptedToken,
          treasury_bank_prefix: mapping?.treasury_bank_prefix || null,
          status: 'connected',
          accounts_count: accounts.length,
          linked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, institution_id, institution_name, logo_url, primary_color, treasury_bank_prefix, status, accounts_count, linked_at')
        .single()
      connection = data
      dbError = error
      console.log('Insert result:', data ? 'success' : 'no data', error ? error.message : 'no error')
    }

    if (dbError) {
      console.error('Database error saving connection:', dbError.message, dbError.code, dbError.details)
      return new Response(
        JSON.stringify({ error: 'Failed to save connection', details: dbError.message, code: dbError.code }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Bank connection saved for user ${user.id}: ${institution.name} with ${accounts.length} accounts`)

    // Store individual accounts
    if (accounts.length > 0 && connection?.id) {
      console.log(`Storing ${accounts.length} accounts for connection ${connection.id}`)

      const accountsToInsert = accounts.map((acc) => ({
        user_id: user.id,
        connection_id: connection.id,
        plaid_account_id: acc.account_id,
        name: acc.name,
        official_name: acc.official_name,
        type: acc.type,
        subtype: acc.subtype,
        mask: acc.mask,
        balance_available: acc.balances?.available,
        balance_current: acc.balances?.current,
        balance_limit: acc.balances?.limit,
      }))

      // Delete existing accounts for this connection and insert fresh
      const { error: deleteError } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('connection_id', connection.id)

      if (deleteError) {
        console.warn('Error deleting old accounts:', deleteError)
      }

      const { error: accountsError } = await supabase
        .from('bank_accounts')
        .insert(accountsToInsert)

      if (accountsError) {
        console.error('Error saving accounts:', accountsError)
        // Don't fail the whole request, just log the error
      } else {
        console.log(`Saved ${accounts.length} accounts for connection ${connection.id}`)
      }
    } else {
      console.log(`No accounts to store (accounts: ${accounts.length}, connection.id: ${connection?.id})`)
    }

    console.log('=== Exchange Token Request Completed Successfully ===')
    return new Response(
      JSON.stringify({ success: true, connection }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string }
    console.error('=== Edge function UNCAUGHT error ===')
    console.error('Error message:', err.message)
    console.error('Error stack:', err.stack)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
