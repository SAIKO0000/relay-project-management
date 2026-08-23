import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedRouteContext } from '@/lib/supabase/route-auth'

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedRouteContext(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase } = auth

    const { taskId, notes } = await request.json()

    if (typeof taskId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(taskId)) {
      return NextResponse.json(
        { error: 'A valid task ID is required' },
        { status: 400 }
      )
    }

    if (notes !== null && (typeof notes !== 'string' || notes.length > 10000)) {
      return NextResponse.json({ error: 'Notes must be 10,000 characters or fewer' }, { status: 400 })
    }

    // Update task notes
    const { error } = await supabase
      .from('tasks')
      .update({ notes })
      .eq('id', taskId)

    if (error) {
      console.error('Error updating task notes:', error)
      return NextResponse.json(
        { error: 'Failed to update task notes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in task notes update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
