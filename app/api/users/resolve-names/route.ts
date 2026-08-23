import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedRouteContext } from '@/lib/supabase/route-auth'

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json()
    
    if (
      !Array.isArray(userIds) ||
      userIds.length > 100 ||
      userIds.some((id) => typeof id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
    ) {
      return NextResponse.json({ error: 'userIds must contain at most 100 UUIDs' }, { status: 400 })
    }

    const auth = await getAuthenticatedRouteContext(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase, user } = auth

    // Create a map to store user ID to name mappings
    const userNames: Record<string, string> = {}

    // Since we may not have service role access, let's use a simpler approach
    // For now, we'll show user IDs with a more friendly format
    for (const userId of userIds) {
      if (user.id === userId) {
        // For current user, we can get their info
        const currentUserEmail = user.email
        if (currentUserEmail) {
          // Try to find in personnel
          const { data: personnel } = await supabase
            .from('personnel')
            .select('name')
            .eq('email', currentUserEmail)
            .single()
          
          if (personnel?.name) {
            userNames[userId] = personnel.name
          } else {
            userNames[userId] = user.user_metadata?.name ||
                              currentUserEmail.split('@')[0] || 
                              'You'
          }
        } else {
          userNames[userId] = 'You'
        }
      } else {
        // For other users, show a friendly placeholder
        userNames[userId] = `Team Member (${userId.substring(0, 8)})`
      }
    }

    return NextResponse.json({ userNames })
  } catch (error) {
    console.error('Error resolving user names:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
