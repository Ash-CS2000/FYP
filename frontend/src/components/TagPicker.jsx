// src/components/TagPicker.jsx
// Grouped multi-select for the specialty-tag taxonomy (data/specialtyTags.js).
// Used on manuscript submission (which specialties does this paper belong
// to) and on reviewer registration/profile (which specialties does this
// person cover) — the same picker on both sides is what makes the two
// comparable for matching.
//
// `collapsible` opts a call site into a closed-by-default trigger (for forms
// where this is one field among many, e.g. registration) instead of the
// panel being permanently open (the default, for screens where picking
// specialties is the main task, e.g. Profile/Submit/Revision).

import { useEffect, useMemo, useRef, useState } from 'react';
import { SPECIALTY_TAGS, SPECIALTY_TAG_LABELS } from '../data/specialtyTags.js';

const Chevron = ({ up }) => (
  <svg className={`tp-chevron ${up ? 'up' : ''}`} viewBox="0 0 24 24" width="15" height="15"
    fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export default function TagPicker({ value = [], onChange, max, collapsible = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(!collapsible);
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  const atMax = Boolean(max) && value.length >= max;

  const toggle = (slug) => {
    if (value.includes(slug)) {
      onChange(value.filter(s => s !== slug));
      return;
    }
    if (atMax) return;
    onChange([...value, slug]);
  };

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? SPECIALTY_TAGS.filter(t =>
          t.label.toLowerCase().includes(q) || t.group.toLowerCase().includes(q))
      : SPECIALTY_TAGS;
    return matched.reduce((acc, tag) => {
      const bucket = acc.find(g => g.name === tag.group);
      if (bucket) bucket.tags.push(tag);
      else acc.push({ name: tag.group, tags: [tag] });
      return acc;
    }, []);
  }, [query]);

  const firstAddable = groups.flatMap(g => g.tags).find(t => !value.includes(t.slug));

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (firstAddable && !atMax) {
        toggle(firstAddable.slug);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (query) setQuery('');
      else if (collapsible) close();
    } else if (e.key === 'Backspace' && query === '' && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  // Collapse on an outside click, and refocus search each time it opens.
  useEffect(() => {
    if (!collapsible || !open) return;
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [collapsible, open]);

  useEffect(() => {
    if (collapsible && open) inputRef.current?.focus();
  }, [open]);

  const sharedStyles = `
    .tag-picker { display: flex; flex-direction: column; gap: 10px; }

    .tp-tray { display: flex; align-items: flex-start; gap: 12px;
      min-height: 44px; padding: 8px 12px; border-radius: var(--r-md);
      background: var(--ink-50); border: 1px solid var(--ink-200); }
    .tp-tray.empty { border-style: dashed; background: transparent; }
    .tp-tray-chips { display: flex; flex-wrap: wrap; gap: 7px; flex: 1; }
    .tp-tray-empty { flex: 1; font-size: 13px; color: var(--ink-500); line-height: 26px; }
    .tp-count { flex-shrink: 0; font-size: 11.5px; font-weight: 600; color: var(--ink-500);
      line-height: 26px; letter-spacing: 0.02em; white-space: nowrap; }
    .tp-count.full { color: var(--amber-800); }

    .tp-collapse-btn { flex-shrink: 0; display: flex; align-items: center; gap: 5px;
      padding: 2px 6px; margin: -2px -6px -2px 0; border-radius: var(--r-sm);
      line-height: 26px; color: var(--ink-500); transition: color var(--t-fast); }
    .tp-collapse-btn:hover { color: var(--navy-700); }
    .tp-collapse-btn .tp-count { color: inherit; }

    .tp-sel { display: inline-flex; align-items: center; gap: 2px;
      background: var(--navy-900); color: var(--white); border-radius: var(--r-pill);
      padding: 4px 5px 4px 12px; font-size: 12.5px; font-weight: 500; line-height: 18px; }
    .tp-sel-x { display: flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border-radius: 50%; color: var(--navy-200);
      font-size: 15px; line-height: 1; transition: all var(--t-fast); }
    .tp-sel-x:hover { background: rgba(255,255,255,.18); color: var(--white); }

    .tp-search { position: relative; display: flex; align-items: center; }
    .tp-search-icon { position: absolute; left: 12px; color: var(--ink-400); pointer-events: none; }
    .tp-search-input { width: 100%; padding: 9px 34px 9px 36px; font-size: 14px;
      border: 1px solid var(--ink-300); border-radius: var(--r-md);
      background: var(--white); color: var(--ink-900); transition: all var(--t-fast); }
    .tp-search-input::placeholder { color: var(--ink-400); }
    .tp-search-input:focus { outline: none; border-color: var(--navy-500);
      box-shadow: 0 0 0 3px var(--navy-100); }
    .tp-search-clear { position: absolute; right: 8px; display: flex; align-items: center;
      justify-content: center; width: 20px; height: 20px; border-radius: 50%;
      color: var(--ink-500); font-size: 16px; line-height: 1; transition: all var(--t-fast); }
    .tp-search-clear:hover { background: var(--ink-100); color: var(--ink-800); }

    .tp-panel { max-height: 300px; overflow-y: auto; overscroll-behavior: contain;
      border: 1px solid var(--ink-200); border-radius: var(--r-md); background: var(--white);
      scrollbar-width: thin; scrollbar-color: var(--ink-300) transparent; }
    .tp-panel::-webkit-scrollbar { width: 8px; }
    .tp-panel::-webkit-scrollbar-track { background: transparent; }
    .tp-panel::-webkit-scrollbar-thumb { background: var(--ink-300); border-radius: var(--r-pill);
      border: 2px solid var(--white); background-clip: padding-box; }
    .tp-panel::-webkit-scrollbar-thumb:hover { background: var(--ink-400); background-clip: padding-box; }
    .tp-group-label { position: sticky; top: 0; z-index: 1;
      display: flex; align-items: center; gap: 8px; padding: 7px 12px;
      background: var(--ink-50); border-bottom: 1px solid var(--ink-200);
      font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em;
      font-weight: 700; color: var(--ink-600); }
    .tp-group-n { font-weight: 500; color: var(--ink-400); letter-spacing: 0; }
    .tp-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 11px 12px 14px; }

    .tag-chip { border: 1.5px solid var(--ink-200); border-radius: var(--r-pill);
      padding: 6px 13px; background: var(--white); cursor: pointer; font-size: 12.5px;
      font-weight: 500; color: var(--ink-700); transition: all var(--t-fast); }
    .tag-chip:hover:not(:disabled) { border-color: var(--navy-700); }
    .tag-chip.selected { border-color: var(--navy-900); background: var(--navy-900); color: var(--white); }
    .tag-chip:disabled { opacity: .4; cursor: not-allowed; }
    .tag-chip:focus-visible, .tp-sel-x:focus-visible, .tp-search-clear:focus-visible,
    .tp-trigger:focus-visible, .tp-collapse-btn:focus-visible {
      outline: 2px solid var(--navy-500); outline-offset: 2px; }

    .tp-empty { padding: 22px 12px; text-align: center; font-size: 13px; color: var(--ink-500); }

    .tp-chevron { transition: transform var(--t-fast); flex-shrink: 0; }
    .tp-chevron.up { transform: rotate(180deg); }

    .tp-trigger { width: 100%; display: flex; align-items: center; justify-content: space-between;
      gap: 10px; padding: 10px 14px; border: 1px solid var(--ink-300); border-radius: var(--r-md);
      background: var(--white); color: var(--ink-400); transition: border-color var(--t-fast); }
    .tp-trigger:hover { border-color: var(--navy-500); }
    .tp-trigger-main { flex: 1; min-width: 0; display: flex; flex-wrap: nowrap; align-items: center;
      gap: 6px; overflow: hidden; }
    .tp-trigger-placeholder { font-size: 14px; color: var(--ink-400); white-space: nowrap; }
    .tp-trigger-chip { flex-shrink: 0; background: var(--ink-100); color: var(--ink-700);
      font-size: 12px; font-weight: 500; padding: 3px 10px; border-radius: var(--r-pill);
      white-space: nowrap; }
    .tp-trigger-chip.more { background: transparent; color: var(--ink-500); padding-left: 0; }
    .tp-trigger-right { flex-shrink: 0; display: flex; align-items: center; gap: 8px;
      color: var(--ink-500); }
    .tp-trigger-count { font-size: 11.5px; font-weight: 600; }
    .tp-trigger-count.full { color: var(--amber-800); }
  `;

  if (collapsible && !open) {
    return (
      <div className="tag-picker" ref={rootRef}>
        <style>{sharedStyles}</style>
        <button
          type="button"
          className="tp-trigger"
          onClick={() => setOpen(true)}
          aria-haspopup="true"
          aria-expanded="false"
        >
          <span className="tp-trigger-main">
            {value.length === 0 ? (
              <span className="tp-trigger-placeholder">Select specialty tags…</span>
            ) : (
              <>
                {value.slice(0, 3).map(slug => (
                  <span className="tp-trigger-chip" key={slug}>{SPECIALTY_TAG_LABELS[slug] || slug}</span>
                ))}
                {value.length > 3 && (
                  <span className="tp-trigger-chip more">+{value.length - 3} more</span>
                )}
              </>
            )}
          </span>
          <span className="tp-trigger-right">
            {value.length > 0 && (
              <span className={`tp-trigger-count ${atMax ? 'full' : ''}`}>
                {max ? `${value.length} of ${max}` : value.length}
              </span>
            )}
            <Chevron />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="tag-picker" ref={rootRef}>
      <style>{sharedStyles}</style>

      <div className={`tp-tray ${value.length ? '' : 'empty'}`}>
        {value.length === 0 ? (
          <span className="tp-tray-empty">No specialties selected yet</span>
        ) : (
          <div className="tp-tray-chips">
            {value.map(slug => {
              const label = SPECIALTY_TAG_LABELS[slug] || slug;
              return (
                <span className="tp-sel" key={slug}>
                  {label}
                  <button
                    type="button"
                    className="tp-sel-x"
                    onClick={() => toggle(slug)}
                    aria-label={`Remove ${label}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
        {collapsible ? (
          <button type="button" className="tp-collapse-btn" onClick={close} aria-label="Collapse specialty tags">
            <span className={`tp-count ${atMax ? 'full' : ''}`}>
              {max ? `${value.length} of ${max}` : `${value.length} selected`}
            </span>
            <Chevron up />
          </button>
        ) : (
          <span className={`tp-count ${atMax ? 'full' : ''}`}>
            {max ? `${value.length} of ${max}` : `${value.length} selected`}
          </span>
        )}
      </div>

      <div className="tp-search">
        <svg className="tp-search-icon" viewBox="0 0 24 24" width="15" height="15"
          fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="tp-search-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Search ${SPECIALTY_TAGS.length} specialties…`}
          aria-label="Search specialties"
        />
        {query && (
          <button
            type="button"
            className="tp-search-clear"
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div className="tp-panel">
        {groups.length === 0 ? (
          <div className="tp-empty">No specialties match “{query.trim()}”</div>
        ) : groups.map(group => (
          <div key={group.name}>
            <div className="tp-group-label">
              {group.name}<span className="tp-group-n">{group.tags.length}</span>
            </div>
            <div className="tp-chips">
              {group.tags.map(t => {
                const selected = value.includes(t.slug);
                return (
                  <button
                    key={t.slug}
                    type="button"
                    className={`tag-chip ${selected ? 'selected' : ''}`}
                    onClick={() => toggle(t.slug)}
                    disabled={!selected && atMax}
                    aria-pressed={selected}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
