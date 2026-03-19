import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024 // 2 MB

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
  }
  return map[mime] ?? 'png'
}

/** POST /api/settings/stationery/logo – upload org logo */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return serverError('No file provided', 400)
    if (!ALLOWED_TYPES.includes(file.type)) {
      return serverError('File must be PNG, JPG, SVG, or WebP', 400)
    }
    if (file.size > MAX_SIZE) {
      return serverError('File must be under 2 MB', 400)
    }

    const ext = extFromMime(file.type)
    const path = `org/${orgId}/logo.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('org-assets')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from('org-assets').getPublicUrl(path)
    const logoUrl = `${urlData.publicUrl}?v=${Date.now()}`

    const { error: dbError } = await supabase
      .from('organisations')
      .update({ logo_url: logoUrl, stationery_updated_at: new Date().toISOString() })
      .eq('id', orgId)

    if (dbError) throw dbError

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      action: 'ORG_LOGO_UPLOADED',
      details: { path },
    })

    return NextResponse.json({ logo_url: logoUrl })
  } catch (err: any) {
    return serverError(err.message)
  }
}

/** DELETE /api/settings/stationery/logo – remove org logo */
export async function DELETE() {
  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const extensions = ['jpg', 'png', 'svg', 'webp']
    const paths = extensions.map((ext) => `org/${orgId}/logo.${ext}`)

    await supabase.storage.from('org-assets').remove(paths)

    const { error: dbError } = await supabase
      .from('organisations')
      .update({ logo_url: null, stationery_updated_at: new Date().toISOString() })
      .eq('id', orgId)

    if (dbError) throw dbError

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      action: 'ORG_LOGO_REMOVED',
      details: {},
    })

    return NextResponse.json({ logo_url: null })
  } catch (err: any) {
    return serverError(err.message)
  }
}
