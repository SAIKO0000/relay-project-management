import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.SUPABASE_URL
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) {
    return NextResponse.json({ error: 'Keepalive is not configured' }, { status: 503 })
  }

  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const probes = await Promise.all([
    client.from('portfolio_keepalive').select('id', { count: 'exact', head: true }),
    client.from('portfolio_keepalive').select('id', { count: 'exact', head: true }),
    client.from('portfolio_keepalive').select('id', { count: 'exact', head: true }),
  ])

  if (probes.some(probe => probe.error)) {
    return NextResponse.json({ error: 'Database health check failed' }, { status: 503 })
  }

  return new NextResponse(null, { status: 204 })
}
