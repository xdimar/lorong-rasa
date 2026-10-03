'use client'

import { useEffect } from 'react'

export function ConsoleSilence() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Menyaring pesan-pesan bising non-error di development browser console
    const originalInfo = console.info
    const originalWarn = console.warn
    const originalLog = console.log

    const noisyPatterns = [
      'Download the React DevTools',
      'Vercel Web Analytics',
      'Vercel Speed Insights',
      '[Fast Refresh]',
      '[Turbopack]',
      'realtime',
      'websocket connection to',
      'chrome-extension',
      'could not query menu_reviews table',
      'db category insert note',
      'db category delete note',
      'silent voucher sync error',
    ]

    console.info = (...args: unknown[]) => {
      const text = args.map((a) => (typeof a === 'string' ? a : '')).join(' ')
      if (noisyPatterns.some((pattern) => text.toLowerCase().includes(pattern.toLowerCase()))) {
        return
      }
      originalInfo(...args)
    }

    console.warn = (...args: unknown[]) => {
      const text = args.map((a) => (typeof a === 'string' ? a : '')).join(' ')
      if (noisyPatterns.some((pattern) => text.toLowerCase().includes(pattern.toLowerCase()))) {
        return
      }
      originalWarn(...args)
    }

    console.log = (...args: unknown[]) => {
      const text = args.map((a) => (typeof a === 'string' ? a : '')).join(' ')
      if (noisyPatterns.some((pattern) => text.toLowerCase().includes(pattern.toLowerCase()))) {
        return
      }
      originalLog(...args)
    }

    return () => {
      console.info = originalInfo
      console.warn = originalWarn
      console.log = originalLog
    }
  }, [])

  return null
}
