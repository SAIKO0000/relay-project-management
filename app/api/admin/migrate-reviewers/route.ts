import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET
  if (!adminSecret || request.headers.get('authorization') !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    // Check if the report_reviewers table exists and is accessible
    const { error } = await supabase
      .from('report_reviewers')
      .select('count(*)')
      .limit(1)

    if (error) {
      return NextResponse.json({
        tableExists: false,
        error: error.message,
        instructions: `
The report_reviewers table doesn't exist yet. Please run the migration SQL manually:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of /sql/migrate_to_multiple_reviewers.sql
4. Execute the script
5. Refresh this page to verify the migration worked

The SQL file contains all necessary table creation, indexes, RLS policies, and data migration.
        `
      })
    }

    // If we get here, the table exists
    const { data: reportCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })

    const { data: reviewerCount } = await supabase
      .from('report_reviewers')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      tableExists: true,
      message: 'Migration successful! Multiple reviewer feature is ready to use.',
      stats: {
        totalReports: reportCount || 0,
        totalReviewerAssignments: reviewerCount || 0
      },
      note: 'You can now assign multiple reviewers to reports using the new upload modal.'
    })

  } catch (error) {
    console.error('Migration check error:', error)
    return NextResponse.json({ 
      error: 'Failed to check migration status', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
