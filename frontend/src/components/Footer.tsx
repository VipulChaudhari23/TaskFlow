export default function Footer() {
  return (
    <footer
      className="mt-auto w-full"
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">

        {/* Brand */}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h8M2 12h10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            TaskFlow
          </span>
        </div>

        {/* Centre — tagline */}
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Built for teams who deserve better than Excel reports &nbsp;·&nbsp; © {new Date().getFullYear()} TaskFlow
        </p>

        {/* Contact */}
        <a
          href="mailto:ttaskfflow@gmail.com"
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          ttaskfflow@gmail.com
        </a>
      </div>
    </footer>
  );
}