// src/components/Drawer.jsx
// A panel that slides in from the right over a dimmed page. Closes on Escape,
// on the backdrop, and on its close button; focus moves into the panel when it
// opens and returns to whatever opened it when it closes.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Drawer({ open, onClose, title, eyebrow, children, footer, width = 460 }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      // Keep Tab inside the panel while it is open.
      const focusable = panelRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  // Rendered into <body>: the page's cards keep a transform from their entrance
  // animation, and a transformed ancestor would trap position:fixed inside it.
  return createPortal(
    <div className="drawer-root">
      <style>{`
        .drawer-root { position:fixed; inset:0; z-index:200; }
        .drawer-backdrop { position:absolute; inset:0; background:rgba(2,26,51,0.42);
          backdrop-filter:blur(2px); animation:drawerFade var(--t-base) both; }
        .drawer-panel { position:absolute; top:0; right:0; bottom:0; width:min(var(--drawer-w), 100vw);
          background:var(--white); box-shadow:var(--shadow-xl); display:flex; flex-direction:column;
          animation:drawerIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .drawer-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px;
          padding:22px 24px 18px; border-bottom:1px solid var(--ink-100); }
        .drawer-eyebrow { font-family:var(--font-mono); font-size:10.5px; letter-spacing:0.12em;
          text-transform:uppercase; color:var(--ink-500); }
        .drawer-title { font-family:var(--font-display); font-size:24px; font-weight:500;
          letter-spacing:-0.02em; color:var(--navy-900); line-height:1.15; margin-top:4px; }
        .drawer-close { width:34px; height:34px; border-radius:var(--r-md); display:flex; align-items:center;
          justify-content:center; color:var(--ink-600); flex-shrink:0; transition:all var(--t-fast); }
        .drawer-close:hover { background:var(--ink-100); color:var(--navy-900); }
        .drawer-close:focus-visible { outline:2px solid var(--navy-500); outline-offset:2px; }
        .drawer-body { flex:1; overflow-y:auto; overscroll-behavior:contain;
          scrollbar-width:thin; scrollbar-color:var(--ink-300) transparent; }
        .drawer-foot { border-top:1px solid var(--ink-100); padding:14px 24px; background:var(--ink-50); }
        @keyframes drawerFade { from { opacity:0; } to { opacity:1; } }
        @keyframes drawerIn { from { transform:translateX(24px); opacity:0; } to { transform:none; opacity:1; } }
        @media (prefers-reduced-motion: reduce) { .drawer-backdrop, .drawer-panel { animation:none; } }
      `}</style>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="drawer-panel"
        style={{ '--drawer-w': `${width}px` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <header className="drawer-head">
          <div>
            {eyebrow && <div className="drawer-eyebrow">{eyebrow}</div>}
            <h2 id="drawer-title" className="drawer-title">{title}</h2>
          </div>
          <button ref={closeRef} type="button" className="drawer-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}
