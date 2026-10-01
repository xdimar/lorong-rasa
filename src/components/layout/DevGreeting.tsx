'use client'

import { useEffect } from 'react'

export function DevGreeting() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const win = window as unknown as { __DEV_GREETING_PRINTED__?: boolean }
    if (win.__DEV_GREETING_PRINTED__) return
    win.__DEV_GREETING_PRINTED__ = true

    const headerBadge = [
      'font-family: system-ui, -apple-system, sans-serif',
      'font-size: 11px',
      'font-weight: 700',
      'letter-spacing: 2px',
      'text-transform: uppercase',
      'color: #d4a04a',
      'background: rgba(212, 160, 74, 0.12)',
      'border: 1px solid rgba(212, 160, 74, 0.4)',
      'border-radius: 9999px',
      'padding: 4px 14px',
      'line-height: 2',
    ].join(';')

    const mainTitle = [
      'font-family: "Playfair Display", Georgia, serif',
      'font-size: 19px',
      'font-weight: 800',
      'letter-spacing: 0.5px',
      'color: #fff9f0',
      'background: linear-gradient(135deg, #2b1704 0%, #7c3a1d 30%, #c45a2c 65%, #d4a04a 100%)',
      'border: 2px solid #e8b86d',
      'border-radius: 12px',
      'padding: 10px 22px',
      'box-shadow: 0 4px 20px rgba(212, 160, 74, 0.35)',
      'text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5)',
      'line-height: 2.2',
    ].join(';')

    const quoteStyle = [
      'font-family: Georgia, serif',
      'font-style: italic',
      'font-size: 13.5px',
      'color: #e8b86d',
      'line-height: 1.8',
    ].join(';')

    const messageBody = [
      'font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-size: 13px',
      'font-weight: 500',
      'color: #d4a04a',
      'line-height: 1.8',
    ].join(';')

    const footerBadge = [
      'font-family: system-ui, -apple-system, sans-serif',
      'font-size: 11px',
      'font-weight: 600',
      'color: #b5884d',
      'letter-spacing: 1px',
      'line-height: 1.8',
    ].join(';')

    // Output artistic greeting to console
    console.log(
      '\n' +
      '%c☕ LORONG RASA • SPECIAL DEDICATION%c\n' +
      '%c✨ Dari Dev untuk Ratna cantik 💖%c\n\n' +
      '%c"Dibuat dengan sepenuh hati, racikan rasa terbaik, dan secangkir cinta untuk Ratna yang selalu manis & mempesona." ☕🌸\n' +
      '%c— Semoga harimu selalu penuh senyuman, kehangatan, dan kebahagiaan! ✨\n' +
      '%c✦ Crafted with passion by Developer for Ratna Cantik ✦\n',
      headerBadge,
      '',
      mainTitle,
      '',
      quoteStyle,
      messageBody,
      footerBadge
    )
  }, [])

  return null
}
