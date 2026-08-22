import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before running this manual test',
  )
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEmailConfirmation() {
  console.log('Testing Supabase email confirmation setup...\n')

  try {
    await supabase.auth.getSession()
    console.log('Supabase connection: OK')
  } catch (error) {
    console.log('Supabase connection failed:', error.message)
    return
  }

  try {
    const { data: settings } = await supabase.auth.getSettings()
    console.log('Auth settings accessible')
    console.log('Settings:', JSON.stringify(settings, null, 2))
  } catch (error) {
    console.log('Could not fetch auth settings (normal for a client):', error.message)
  }

  console.log('\nTesting signup with a disposable example address...')

  const testEmail = `test+${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `${appUrl}/auth/confirm`,
      },
    })

    if (error) {
      console.log('Signup error:', error.message)
      console.log('Error details:', JSON.stringify(error, null, 2))
      return
    }

    console.log('Signup request successful')
    console.log('User ID:', data.user?.id)
    console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No')
    console.log('Confirmation sent:', data.user?.confirmation_sent_at ? 'Yes' : 'No')
  } catch (error) {
    console.log('Signup failed:', error.message)
  }

  console.log('\nEmail confirmation checklist:')
  console.log('1. Go to Supabase Dashboard > Authentication > Settings')
  console.log('2. Check that email confirmation is enabled')
  console.log(`3. Set Site URL to: ${appUrl}`)
  console.log('4. Add only the required production and localhost redirect URLs')
  console.log('5. Check that email templates are configured')
  console.log('6. Verify SMTP settings if using a custom email provider')
}

testEmailConfirmation().catch(console.error)
