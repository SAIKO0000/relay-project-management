import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedRouteContext } from '@/lib/supabase/route-auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedRouteContext(request)
    if (!auth) return new NextResponse('Unauthorized', { status: 401 })
    const { supabase } = auth

    const params = await context.params
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(params.id)) {
      return new NextResponse('Invalid report ID', { status: 400 })
    }
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
    const safeFileName = report.file_name.replace(/[\r\n"]/g, '_')
    headers.set('Content-Disposition', `inline; filename="${safeFileName}"`)
    headers.set('Cache-Control', 'private, no-store')
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Error viewing file:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
