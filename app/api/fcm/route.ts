import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedRouteContext } from '@/lib/supabase/route-auth'

const unavailableInDemo = () => process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'

export async function POST(request: NextRequest) {
  if (unavailableInDemo()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const auth = await getAuthenticatedRouteContext(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token } = await request.json();
    
    if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
      return NextResponse.json({ error: 'FCM token is required' }, { status: 400 });
    }

    const { error } = await auth.supabase
      .from('fcm_tokens')
      .upsert({ user_id: auth.user.id, token }, { onConflict: 'user_id' })

    if (error) {
      return NextResponse.json({ error: 'Unable to save push subscription' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'FCM token received successfully'
    });
  } catch (error) {
    console.error('FCM token storage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (unavailableInDemo()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const auth = await getAuthenticatedRouteContext(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { error } = await auth.supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', auth.user.id)

    if (error) {
      return NextResponse.json({ error: 'Unable to remove push subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Push subscription removed' });
  } catch (error) {
    console.error('FCM token deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
