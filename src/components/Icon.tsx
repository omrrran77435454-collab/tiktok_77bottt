/** أيقونات SVG بسيطة (بدون مكتبة أيقونات خارجية). */

export type IconName =
  | 'clipboard'
  | 'chart'
  | 'user'
  | 'layout'
  | 'palette'
  | 'shield'
  | 'book'
  | 'check'
  | 'link'
  | 'help'
  | 'settings'
  | 'logout'
  | 'home'
  | 'tools'
  | 'calendar'
  | 'plus'
  | 'search'
  | 'doc'
  | 'star'
  | 'clock'
  | 'target'
  | 'sparkle';

const PATHS: Record<IconName, string> = {
  clipboard: 'M9 4h6v2H9zM7 6h2v1h6V6h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm2 6h6m-6 4h4',
  chart: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8a8 8 0 0 1 16 0',
  layout: 'M4 5h16v14H4zM4 9h16M10 9v10',
  palette: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.9-.8-1.4-.8-2.3 0-.7.6-1.2 1.3-1.2H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8zM7.5 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3-3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  shield: 'M12 3l8 3v6c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V6l8-3z',
  book: 'M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2V5zm9-2h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5V3z',
  check: 'M5 13l4 4L19 7',
  link: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1m-1 9a5 5 0 0 1-7 0 5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 0',
  help: 'M12 17h.01M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1L15 3H9l-.3 2.6c-.6.2-1.2.6-1.7 1l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.4 2.3-1c.5.4 1.1.8 1.7 1L9 21h6l.3-2.6c.6-.2 1.2-.6 1.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z',
  logout: 'M15 12H4m0 0l3-3m-3 3l3 3m5-8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1',
  home: 'M4 11l8-7 8 7M6 10v9h12v-9',
  tools: 'M14.7 6.3a4 4 0 0 1 5 5l-3.6 3.6-5-5L14.7 6.3zM10 12l-6 6v2h2l6-6',
  calendar: 'M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm5.5-1.5L21 21',
  doc: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zm0 0v5h5M9 13h6m-6 4h4',
  star: 'M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8L12 4z',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM18 16l.9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9L18 16z',
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** شعار Google الرسمي بألوانه (مطلوب في زر تسجيل الدخول). */
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.9 35.9 44 30.5 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}
