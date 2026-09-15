// src/components/Pagination.jsx
// "21–40 of 269" with Previous / page numbers / Next, for server-paged lists.

function pageList(current, last) {
  // Always the first and last page, the current one and its neighbours, with a
  // gap marker wherever pages are skipped: 1 … 4 5 6 … 14
  const pages = new Set([1, last, current - 1, current, current + 1]);
  const sorted = [...pages].filter(p => p >= 1 && p <= last).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, pageSize, total, onChange, busy = false }) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav className="pager" aria-label="Pagination">
      <style>{`
        .pager { display:flex; align-items:center; justify-content:space-between; gap:12px;
          flex-wrap:wrap; padding-top:14px; margin-top:4px; border-top:1px solid var(--ink-100); }
        .pager-range { font-size:12.5px; color:var(--ink-600); }
        .pager-range strong { color:var(--navy-900); font-weight:600; }
        .pager-controls { display:flex; align-items:center; gap:4px; }
        .pager-btn { min-width:32px; height:32px; padding:0 10px; border-radius:var(--r-sm);
          border:1px solid var(--ink-200); background:var(--white); color:var(--ink-700);
          font-size:12.5px; font-weight:500; transition:all var(--t-fast); }
        .pager-btn:hover:not(:disabled) { border-color:var(--navy-500); color:var(--navy-900); }
        .pager-btn:disabled { opacity:.45; cursor:not-allowed; }
        .pager-btn.current { background:var(--navy-900); border-color:var(--navy-900); color:var(--white); cursor:default; }
        .pager-btn:focus-visible { outline:2px solid var(--navy-500); outline-offset:2px; }
        .pager-gap { min-width:20px; text-align:center; color:var(--ink-400); font-size:12.5px; }
      `}</style>
      <span className="pager-range">
        <strong>{from.toLocaleString()}–{to.toLocaleString()}</strong> of {total.toLocaleString()}
      </span>
      {last > 1 && (
        <div className="pager-controls">
          <button type="button" className="pager-btn" disabled={busy || page <= 1} onClick={() => onChange(page - 1)}>
            Previous
          </button>
          {pageList(page, last).map(p => (typeof p === 'string'
            ? <span key={p} className="pager-gap" aria-hidden="true">…</span>
            : (
              <button
                key={p}
                type="button"
                className={`pager-btn ${p === page ? 'current' : ''}`}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                disabled={busy && p !== page}
                onClick={() => p !== page && onChange(p)}
              >
                {p}
              </button>
            )))}
          <button type="button" className="pager-btn" disabled={busy || page >= last} onClick={() => onChange(page + 1)}>
            Next
          </button>
        </div>
      )}
    </nav>
  );
}
