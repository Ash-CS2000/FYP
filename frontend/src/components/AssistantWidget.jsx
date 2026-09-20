// src/components/AssistantWidget.jsx
// Floating chat bubble for every workspace (author, reviewer, editor, admin),
// backed by the per-role endpoints in api/assistant.js.
//
// Session-only by design: conversation lives in a module-level variable (same
// trick Sidebar.jsx uses for its scroll position) so it survives navigating
// between pages of a workspace — AppShell remounts on every route change — but
// a full page reload clears it. Kept per role so someone who holds both roles
// never sees one assistant's chat in the other. Nothing is sent to, or read
// from, the backend except each chat turn itself.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sendAssistantMessage } from '../api/assistant.js';

const CONFIG = {
  author: {
    title: 'Author Assistant',
    subtitle: 'Ask about your submissions',
    welcome: "Hi! I'm the PaperBridge Author Assistant. How can I help you today?",
  },
  reviewer: {
    title: 'Reviewer Assistant',
    subtitle: 'Ask about your reviews',
    welcome: "Hi! I'm the PaperBridge Reviewer Assistant. What would you like to know?",
  },
  editor: {
    title: 'Editor Assistant',
    subtitle: 'Ask about the editorial queue',
    welcome: "Hi! I'm the PaperBridge Editor Assistant. What would you like to know?",
  },
  admin: {
    title: 'Admin Assistant',
    subtitle: 'Ask about the platform',
    welcome: "Hi! I'm the PaperBridge Admin Assistant. What would you like to know?",
  },
};

const saved = Object.fromEntries(Object.keys(CONFIG).map((r) => [r, { messages: [], open: false }]));

export default function AssistantWidget({ role }) {
  const { title, subtitle, welcome } = CONFIG[role];
  const store = saved[role];
  const [open, setOpen] = useState(store.open);
  const [messages, setMessages] = useState(
    store.messages.length ? store.messages : [{ role: 'assistant', content: welcome }],
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => { store.open = open; }, [store, open]);
  useEffect(() => { store.messages = messages; }, [store, messages]);

  useEffect(() => {
    if (!open) return;
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [open, messages, sending]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setError('');
    setSending(true);

    try {
      const reply = await sendAssistantMessage(next, role);
      setMessages((cur) => [...cur, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message || 'Could not reach the assistant.');
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <div className="assistant-root">
      <style>{`
        .assistant-root { position:fixed; right:24px; bottom:24px; z-index:190;
          display:flex; flex-direction:column; align-items:flex-end; gap:12px; }
        .assistant-bubble { width:52px; height:52px; border-radius:var(--r-pill); border:none;
          background:var(--navy-700); color:var(--on-fill); display:flex; align-items:center;
          justify-content:center; box-shadow:var(--shadow-lg); cursor:pointer;
          transition:transform var(--t-fast), background var(--t-fast); }
        .assistant-bubble:hover { background:var(--navy-800); transform:translateY(-1px); }
        .assistant-bubble:focus-visible { outline:2px solid var(--navy-500); outline-offset:2px; }
        .assistant-panel { width:min(360px, calc(100vw - 32px)); height:min(520px, calc(100vh - 120px));
          background:var(--white); border-radius:var(--r-lg); box-shadow:var(--shadow-xl);
          display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--ink-200);
          animation:assistantIn 200ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .assistant-head { padding:14px 16px; background:var(--navy-900); color:var(--white);
          display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
        .assistant-head-title { font-weight:600; font-size:14px; }
        .assistant-head-sub { font-size:11px; color:var(--navy-200); margin-top:2px; }
        .assistant-close { width:28px; height:28px; border-radius:var(--r-sm); border:none;
          background:transparent; color:var(--navy-200); display:flex; align-items:center;
          justify-content:center; cursor:pointer; transition:background var(--t-fast); }
        .assistant-close:hover { background:rgba(255,255,255,0.12); color:var(--white); }
        .assistant-body { flex:1; overflow-y:auto; padding:14px 16px; display:flex;
          flex-direction:column; gap:10px; background:var(--ink-50); }
        .assistant-msg { max-width:85%; padding:9px 12px; border-radius:var(--r-md); font-size:13.5px;
          line-height:1.45; white-space:pre-wrap; }
        .assistant-msg.user { align-self:flex-end; background:var(--navy-700); color:var(--on-fill);
          border-bottom-right-radius:4px; }
        .assistant-msg.assistant { align-self:flex-start; background:var(--white); color:var(--ink-800);
          border:1px solid var(--ink-200); border-bottom-left-radius:4px; }
        .assistant-typing { align-self:flex-start; font-size:12px; color:var(--ink-500); padding:0 4px; }
        .assistant-error { align-self:flex-start; font-size:12px; color:var(--red-700);
          background:var(--red-50); border:1px solid var(--red-200); border-radius:var(--r-sm);
          padding:6px 10px; }
        .assistant-form { flex-shrink:0; display:flex; gap:8px; padding:10px; border-top:1px solid var(--ink-200);
          background:var(--white); }
        .assistant-input { flex:1; border:1px solid var(--ink-300); border-radius:var(--r-pill);
          padding:9px 14px; font-size:13.5px; font-family:var(--font-body); color:var(--ink-900);
          background:var(--white); outline:none; transition:border-color var(--t-fast); }
        .assistant-input:focus { border-color:var(--navy-500); }
        .assistant-send { width:36px; height:36px; border-radius:var(--r-pill); border:none;
          background:var(--navy-700); color:var(--on-fill); display:flex; align-items:center;
          justify-content:center; cursor:pointer; flex-shrink:0; transition:background var(--t-fast); }
        .assistant-send:hover:not(:disabled) { background:var(--navy-800); }
        .assistant-send:disabled { background:var(--ink-300); cursor:not-allowed; }
        @keyframes assistantIn { from { opacity:0; transform:translateY(8px) scale(0.98); } to { opacity:1; transform:none; } }
        @media (prefers-reduced-motion: reduce) { .assistant-panel { animation:none; } }
      `}</style>

      {open && (
        <div className="assistant-panel" role="dialog" aria-label={title}>
          <div className="assistant-head">
            <div>
              <div className="assistant-head-title">{title}</div>
              <div className="assistant-head-sub">{subtitle}</div>
            </div>
            <button type="button" className="assistant-close" aria-label="Close" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="assistant-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={`assistant-msg ${m.role}`}>{m.content}</div>
            ))}
            {sending && <div className="assistant-typing">Thinking…</div>}
            {error && <div className="assistant-error">{error}</div>}
          </div>

          <form className="assistant-form" onSubmit={handleSend}>
            <input
              className="assistant-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              disabled={sending}
              aria-label="Message"
            />
            <button type="submit" className="assistant-send" disabled={sending || !input.trim()} aria-label="Send">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="assistant-bubble"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
        )}
      </button>
    </div>,
    document.body,
  );
}
