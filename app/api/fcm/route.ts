import { NextRequest, NextResponse } from 'next/server';

const unavailableInDemo = () => process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'

export async function POST(request: NextRequest) {
  if (unavailableInDemo()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'FCM token is required' }, { status: 400 });
    }

    // For now, we'll just acknowledge the token
    // In production, you would store this in a database
    // TODO: Store token in fcm_tokens table when database migration is run
    // Never log push tokens; they are credentials for a specific browser installation.

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
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // For now, we'll just acknowledge the deletion
    // TODO: Delete token from fcm_tokens table when database migration is run
    return NextResponse.json({ success: true, message: 'FCM token deletion acknowledged' });
  } catch (error) {
    console.error('FCM token deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
