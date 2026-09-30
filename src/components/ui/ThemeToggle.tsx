'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: '50px',
        padding: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.3s ease',
        position: 'relative',
        width: '64px',
        height: '34px',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: theme === 'light' ? '4px' : '30px',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          borderRadius: '50%',
          width: '26px',
          height: '26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px var(--color-primary-glow)',
        }}
      >
        {theme === 'light' ? (
          <Sun size={14} color="white" />
        ) : (
          <Moon size={14} color="white" />
        )}
      </span>
    </button>
  )
}
