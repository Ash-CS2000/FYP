// src/components/TagPicker.jsx
// Grouped multi-select for the specialty-tag taxonomy (data/specialtyTags.js).
// Used on manuscript submission (which specialties does this paper belong
// to) and on reviewer registration/profile (which specialties does this
// person cover) — the same picker on both sides is what makes the two
// comparable for matching.

import { TAGS_BY_GROUP } from '../data/specialtyTags.js';

export default function TagPicker({ value = [], onChange, max }) {
  const toggle = (slug) => {
    if (value.includes(slug)) {
      onChange(value.filter(s => s !== slug));
      return;
    }
    if (max && value.length >= max) return;
    onChange([...value, slug]);
  };

  return (
    <div className="tag-picker">
      <style>{`
        .tag-picker-group { margin-bottom: 14px; }
        .tag-picker-group:last-child { margin-bottom: 0; }
        .tag-picker-group-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--ink-600); font-weight: 700; margin-bottom: 8px; }
        .tag-picker-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .tag-chip { border: 1.5px solid var(--ink-200); border-radius: var(--r-pill); padding: 6px 13px;
          background: var(--white); cursor: pointer; font-size: 12.5px; font-weight: 500;
          color: var(--ink-700); transition: all var(--t-fast); }
        .tag-chip:hover { border-color: var(--navy-700); }
        .tag-chip.selected { border-color: var(--navy-900); background: var(--navy-900); color: var(--white); }
        .tag-chip:disabled { opacity: .45; cursor: not-allowed; }
      `}</style>
      {max && (
        <div className="field-hint" style={{ marginTop: 0, marginBottom: 12 }}>
          {value.length} of {max} selected
        </div>
      )}
      {Object.entries(TAGS_BY_GROUP).map(([group, tags]) => (
        <div className="tag-picker-group" key={group}>
          <div className="tag-picker-group-label">{group}</div>
          <div className="tag-picker-chips">
            {tags.map(t => {
              const selected = value.includes(t.slug);
              return (
                <button
                  key={t.slug}
                  type="button"
                  className={`tag-chip ${selected ? 'selected' : ''}`}
                  onClick={() => toggle(t.slug)}
                  disabled={!selected && max && value.length >= max}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
