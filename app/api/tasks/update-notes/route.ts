import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId, notes } = await request.json()

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
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
