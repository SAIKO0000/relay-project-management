import { useEffect, useState } from 'react'
import { getPrivateStorageUrl } from '@/lib/workspace'

export function usePrivateStorageUrl(bucket: string, path?: string | null) {
  const [url, setUrl] = useState(() =>
    path && /^(https?:|data:|blob:)/i.test(path) ? path : ''
  )

  useEffect(() => {
    let active = true

    if (!path) {
      return
    }

    void getPrivateStorageUrl(bucket, path).then((resolvedUrl) => {
      if (active) setUrl(resolvedUrl)
    })

    return () => {
      active = false
    }
  }, [bucket, path])

  return path ? url : ''
}
