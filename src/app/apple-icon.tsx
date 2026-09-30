import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e1200 0%, #0f0800 100%)',
          borderRadius: '42px',
        }}
      >
        <div
          style={{
            width: '124px',
            height: '124px',
            borderRadius: '32px',
            background: 'linear-gradient(135deg, #c47a2e 0%, #9e5f1a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 36px rgba(196, 122, 46, 0.45)',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="72"
            height="72"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 2c0 1.5-1 2-1 3" stroke="#fdf0dc" strokeWidth="2" />
            <path d="M12 1c0 1.5-1 2-1 3" stroke="#fdf0dc" strokeWidth="2" />
            <path d="M15 2c0 1.5-1 2-1 3" stroke="#fdf0dc" strokeWidth="2" />
            <path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
            <path d="M17 10h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2" />
            <line x1="3" y1="22" x2="18" y2="22" stroke="#ffffff" strokeWidth="2.2" />
          </svg>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
