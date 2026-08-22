import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } }
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const params = await context.params
    // Get the report details
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('file_path, file_name')
      .eq('id', params.id)
      .single()

    if (reportError || !report) {
      return new NextResponse('Report not found', { status: 404 })
    }

    // Get the file from Supabase storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('project-documents')
      .download(report.file_path)

    if (fileError || !fileData) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Convert blob to arrayBuffer
    const arrayBuffer = await fileData.arrayBuffer()

    // Set appropriate headers for inline viewing (especially for PDFs)
    const headers = new Headers()
    headers.set('Content-Type', fileData.type || 'application/octet-stream')
    headers.set('Content-Disposition', `inline; filename="${report.file_name}"`)
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Error viewing file:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
