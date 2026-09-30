import { ImageResponse } from 'next/og'

export const size = {
  width: 48,
  height: 48,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2a1500 0%, #150a00 100%)',
          borderRadius: '12px',
          border: '2px solid #c47a2e',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e8a04a"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Steam waves */}
          <path d="M9 2c0 1.5-1 2-1 3" stroke="#f5ede0" strokeWidth="1.8" />
          <path d="M12 1c0 1.5-1 2-1 3" stroke="#f5ede0" strokeWidth="1.8" />
          <path d="M15 2c0 1.5-1 2-1 3" stroke="#f5ede0" strokeWidth="1.8" />
          {/* Cup */}
          <path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
          <path d="M17 10h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2" />
          {/* Base saucer */}
          <line x1="3" y1="22" x2="18" y2="22" stroke="#c47a2e" strokeWidth="2.2" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
