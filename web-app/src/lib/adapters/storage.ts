export interface StorageAdapter {
  upload(
    bucket: string,
    path: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string>
  getSignedUrl(
    bucket: string,
    path: string,
    expiresIn?: number,
  ): Promise<string>
  getPublicUrl(bucket: string, path: string): string
  delete(bucket: string, path: string): Promise<void>
  list(
    bucket: string,
    prefix: string,
  ): Promise<Array<{ name: string; size: number }>>
}

// ---------------------------------------------------------------------------
// Supabase Storage — production file storage
// ---------------------------------------------------------------------------

export class SupabaseStorageAdapter implements StorageAdapter {
  private supabaseUrl: string
  private serviceRoleKey: string

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error(
        'SupabaseStorageAdapter requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      )
    }
    this.supabaseUrl = url
    this.serviceRoleKey = key
  }

  private async getClient() {
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(this.supabaseUrl, this.serviceRoleKey, {
      auth: { persistSession: false },
    })
  }

  async upload(
    bucket: string,
    path: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const supabase = await this.getClient()
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true })

    if (error) {
      throw new Error(`Storage upload error: ${error.message}`)
    }

    return this.getPublicUrl(bucket, path)
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn = 3600,
  ): Promise<string> {
    const supabase = await this.getClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error || !data?.signedUrl) {
      throw new Error(
        `Storage signed URL error: ${error?.message ?? 'no URL returned'}`,
      )
    }

    return data.signedUrl
  }

  getPublicUrl(bucket: string, path: string): string {
    return `${this.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
  }

  async delete(bucket: string, path: string): Promise<void> {
    const supabase = await this.getClient()
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      throw new Error(`Storage delete error: ${error.message}`)
    }
  }

  async list(
    bucket: string,
    prefix: string,
  ): Promise<Array<{ name: string; size: number }>> {
    const supabase = await this.getClient()
    const { data, error } = await supabase.storage.from(bucket).list(prefix)

    if (error) {
      throw new Error(`Storage list error: ${error.message}`)
    }

    return (data ?? []).map((f) => ({
      name: f.name,
      size: (f.metadata as Record<string, number>)?.size ?? 0,
    }))
  }
}

// ---------------------------------------------------------------------------
// Stub — in-memory storage for development
// ---------------------------------------------------------------------------

export class StubStorageAdapter implements StorageAdapter {
  private store = new Map<string, { buffer: Buffer; contentType: string }>()

  async upload(
    bucket: string,
    path: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const key = `${bucket}/${path}`
    this.store.set(key, { buffer, contentType })
    console.log(`[Storage stub] Uploaded ${key} (${buffer.length} bytes)`)
    return `stub://${key}`
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    _expiresIn?: number,
  ): Promise<string> {
    return `stub://${bucket}/${path}?signed=true`
  }

  getPublicUrl(bucket: string, path: string): string {
    return `stub://${bucket}/${path}`
  }

  async delete(bucket: string, path: string): Promise<void> {
    const key = `${bucket}/${path}`
    this.store.delete(key)
    console.log(`[Storage stub] Deleted ${key}`)
  }

  async list(
    bucket: string,
    prefix: string,
  ): Promise<Array<{ name: string; size: number }>> {
    const matchPrefix = `${bucket}/${prefix}`
    const results: Array<{ name: string; size: number }> = []

    for (const [key, { buffer }] of this.store) {
      if (key.startsWith(matchPrefix)) {
        results.push({
          name: key.slice(`${bucket}/`.length),
          size: buffer.length,
        })
      }
    }

    return results
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getStorageAdapter(): StorageAdapter {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return new SupabaseStorageAdapter()
  }
  console.warn(
    '[Storage] Supabase credentials not set — using in-memory stub adapter.',
  )
  return new StubStorageAdapter()
}
