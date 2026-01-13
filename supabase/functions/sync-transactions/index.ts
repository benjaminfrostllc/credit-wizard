import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Decrypt access token
async function decryptToken(encryptedToken: string, key: string): Promise<string> {
  // Handle unencrypted tokens (for testing)
  if (encryptedToken.startsWith('unencrypted:')) {
    return encryptedToken.replace('unencrypted:', '')
  }

  const encoder = new TextEncoder()
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32))

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  )

  return new TextDecoder().decode(decrypted)
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

  try {
    console.log('=== Sync Transactions Request Started ===')

    // Check configuration
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Plaid not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Supabase not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Parse request body for optional connection_id
    let connectionId: string | null = null
    try {
      const body = await req.json()
      connectionId = body.connection_id || null
    } catch {
      // No body is fine
    }

    // Get user's bank connections with encrypted access tokens
    let query = supabase
      .from('bank_connections')
      .select('id, item_id, institution_name, access_token_encrypted')
      .eq('user_id', user.id)
      .eq('status', 'connected')

    if (connectionId) {
      query = query.eq('id', connectionId)
    }

    const { data: connections, error: connError } = await query

    if (connError) {
      console.error('Error fetching connections:', connError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch connections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No connected banks', transactions_synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${connections.length} connections to sync`)

    // Plaid API base URL
    const plaidBaseUrl =
      PLAID_ENV === 'sandbox'
        ? 'https://sandbox.plaid.com'
        : PLAID_ENV === 'development'
          ? 'https://development.plaid.com'
          : 'https://production.plaid.com'

    // Date range: last 30 days
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    let totalTransactions = 0
    const errors: string[] = []

    // Fetch transactions for each connection
    for (const conn of connections) {
      try {
        console.log(`Syncing transactions for ${conn.institution_name}...`)

        // Decrypt access token
        let accessToken: string
        try {
          if (!PLAID_ENCRYPTION_KEY && !conn.access_token_encrypted.startsWith('unencrypted:')) {
            console.warn('No encryption key, skipping connection')
            continue
          }
          accessToken = await decryptToken(
            conn.access_token_encrypted,
            PLAID_ENCRYPTION_KEY || ''
          )
        } catch (decryptError) {
          console.error('Failed to decrypt token:', decryptError)
          errors.push(`${conn.institution_name}: Failed to decrypt token`)
          continue
        }

        // Get accounts for this connection
        const { data: accounts, error: accError } = await supabase
          .from('bank_accounts')
          .select('id, plaid_account_id')
          .eq('connection_id', conn.id)

        if (accError || !accounts) {
          console.error('Failed to get accounts:', accError)
          continue
        }

        // Create mapping from plaid_account_id to our account id
        const accountMap = new Map(accounts.map(a => [a.plaid_account_id, a.id]))

        // Fetch transactions from Plaid
        const response = await fetch(`${plaidBaseUrl}/transactions/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: accessToken,
            start_date: startDate,
            end_date: endDate,
            options: {
              count: 500,
              offset: 0,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Plaid transactions error:', errorData)
          errors.push(`${conn.institution_name}: ${errorData.error_message || 'Failed to fetch'}`)
          continue
        }

        const data = await response.json()
        const transactions = data.transactions || []

        console.log(`Got ${transactions.length} transactions from ${conn.institution_name}`)

        // Transform and upsert transactions
        const transactionsToUpsert = transactions
          .filter((tx: { account_id: string }) => accountMap.has(tx.account_id))
          .map((tx: {
            transaction_id: string
            account_id: string
            name: string
            merchant_name?: string
            amount: number
            iso_currency_code?: string
            category?: string[]
            category_id?: string
            personal_finance_category?: {
              primary?: string
            }
            date: string
            datetime?: string
            authorized_date?: string
            pending?: boolean
            payment_channel?: string
            location?: {
              city?: string
              region?: string
              country?: string
            }
          }) => {
            const categoryHint = tx.personal_finance_category?.primary || tx.category?.[0] || null

            return {
            user_id: user.id,
            account_id: accountMap.get(tx.account_id),
            plaid_transaction_id: tx.transaction_id,
            name: tx.name,
            merchant_name: tx.merchant_name || null,
            amount: tx.amount,
            currency: tx.iso_currency_code || 'USD',
            currency_code: tx.iso_currency_code || 'USD',
            category: tx.category || [],
            category_id: tx.category_id || null,
            category_hint: categoryHint,
            primary_category: categoryHint || 'Other',
            date: tx.date,
            datetime: tx.datetime || null,
            authorized_date: tx.authorized_date || null,
            pending: tx.pending || false,
            payment_channel: tx.payment_channel || null,
            location_city: tx.location?.city || null,
            location_region: tx.location?.region || null,
            location_country: tx.location?.country || null,
            raw_json: tx,
          }
          })

        if (transactionsToUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('transactions')
            .upsert(transactionsToUpsert, {
              onConflict: 'account_id,plaid_transaction_id',
            })

          if (upsertError) {
            console.error('Upsert error:', upsertError)
            errors.push(`${conn.institution_name}: Failed to save transactions`)
          } else {
            totalTransactions += transactionsToUpsert.length
            console.log(`Saved ${transactionsToUpsert.length} transactions for ${conn.institution_name}`)
          }
        }
      } catch (err) {
        console.error(`Error syncing ${conn.institution_name}:`, err)
        errors.push(`${conn.institution_name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    console.log('=== Sync Transactions Completed ===')
    return new Response(
      JSON.stringify({
        success: true,
        transactions_synced: totalTransactions,
        connections_processed: connections.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Sync transactions error:', err.message)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
