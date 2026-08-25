import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { getScreeningSettings, patchScreeningSettings } from '../api/similarity.js';
import { loadLocalSettings, saveLocalSettings } from '../data/editorScreeningMock.js';

// Screening thresholds are platform policy, so only an admin sets them — see the
// role model: editors act on the bands, admins define them. Every other screen
// re-bands its existing reports from these numbers; changing one never re-runs a
// check.
function ScreeningSettingsCard() {
  const [settings, setSettings] = useState(loadLocalSettings);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    getScreeningSettings()
      .then((server) => { if (!cancelled) setSettings((prev) => ({ ...prev, ...server })); })
      // Backend not up yet — the locally persisted values stand in, so the rest of
      // the app still re-bands correctly.
      .catch(() => { if (!cancelled) setStatus('offline'); });
    return () => { cancelled = true; };
  }, []);

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveLocalSettings(next);
    setStatus('');
    patchScreeningSettings(patch).catch(() => setStatus('offline'));
  };

  const invalid = Number(settings.review_threshold) >= Number(settings.high_threshold);

  const toggles = [
    ['exclude_quotes', 'Exclude quotations', 'Text inside quotation marks is not counted towards the score.'],
    ['exclude_bibliography', 'Exclude bibliography', 'Reference lists overlap heavily by nature and would inflate every score.'],
    ['auto_flag', 'Auto-flag above the high threshold', 'Flagged manuscripts appear in the editor’s screening queue automatically.'],
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Similarity screening</div>
          <div className="card-meta">
            Thresholds and exclusions applied to every submission.
            {status === 'offline' && ' Saved locally — the analysis service is unavailable.'}
          </div>
        </div>
      </div>

      <div className="field-grid">
        <div className="field">
          <label className="field-label">Review threshold (%)</label>
          <input
            className="field-input"
            type="number"
            min="0"
            max="100"
            value={settings.review_threshold}
            onChange={(e) => update({ review_threshold: Number(e.target.value) })}
          />
          <div className="field-hint">At or above this, the score is shown in amber for the editor’s attention.</div>
        </div>
        <div className="field">
          <label className="field-label">Flag threshold (%)</label>
          <input
            className="field-input"
            type="number"
            min="0"
            max="100"
            value={settings.high_threshold}
            onChange={(e) => update({ high_threshold: Number(e.target.value) })}
          />
          <div className="field-hint">At or above this, the manuscript is flagged for screening before review.</div>
        </div>
      </div>

      {invalid && (
        <div className="field-hint" style={{ color: 'var(--red-800)' }}>
          The review threshold must be lower than the flag threshold.
        </div>
      )}

      <div className="field">
        <label className="field-label">Ignore matches shorter than</label>
        <input
          className="field-input"
          type="number"
          min="1"
          max="60"
          style={{ maxWidth: 140 }}
          value={settings.min_words}
          onChange={(e) => update({ min_words: Number(e.target.value) })}
        />
        <div className="field-hint">Words. Short common phrases match everywhere and are rarely meaningful.</div>
      </div>

      {toggles.map(([key, label, desc]) => (
        <div key={key} style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '14px 0', borderBottom: '1px solid var(--ink-100)'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy-900)' }}>{label}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-600)', marginTop: 2 }}>{desc}</div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: 42, height: 24 }}>
            <input
              type="checkbox"
              checked={Boolean(settings[key])}
              onChange={(e) => update({ [key]: e.target.checked })}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute', cursor: 'pointer', inset: 0,
              background: settings[key] ? 'var(--navy-900)' : 'var(--ink-300)',
              borderRadius: 999, transition: 'all .2s',
            }}>
              <span style={{
                position: 'absolute', top: 3, left: settings[key] ? 21 : 3,
                width: 18, height: 18, background: 'var(--white)', borderRadius: '50%',
                transition: 'all .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}></span>
            </span>
          </label>
        </div>
      ))}

      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.55 }}>
        The engine matches verbatim and near-verbatim reuse. Paraphrased and translated text is not
        detected, so a low score is not evidence of originality and a high score is not a finding of
        misconduct — both are prompts for an editor to read the matched passages.
      </div>
    </div>
  );
}

// Journal categories drive the submission wizard's category picker, the reviewer
// pool's expertise matching, and the editor's filters. Because they are
// referenced by existing manuscripts, renaming a category must rename it
// everywhere rather than orphan the papers filed under it, and removing one that
// is in use has to be refused rather than silently detaching them.
//
//   GET   /api/settings/categories/            → Category[]
//   POST  /api/settings/categories/            { name, subcategories }
//   PATCH /api/settings/categories/:id/        { name, subcategories }
//   DELETE /api/settings/categories/:id/       409 if any manuscript uses it
const CATEGORIES_KEY = 'paperbridge-journal-categories';

const DEFAULT_CATEGORIES = [
  { id: 'cs',   name: 'Computer Science', subcategories: ['AI & ML', 'Systems', 'Security', 'HCI'] },
  { id: 'eng',  name: 'Engineering',      subcategories: ['Civil', 'Electrical', 'Mechanical'] },
  { id: 'med',  name: 'Medicine',         subcategories: ['Clinical', 'Public Health'] },
  { id: 'bus',  name: 'Business',         subcategories: ['Finance', 'Operations', 'Strategy'] },
  { id: 'soc',  name: 'Social Sciences',  subcategories: ['Education', 'Linguistics', 'Psychology'] },
  { id: 'env',  name: 'Environmental',    subcategories: ['Climate', 'Sustainability'] },
];

function loadCategories() {
  try {
    const raw = window.localStorage.getItem(CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function persistCategories(next) {
  try {
    window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the in-memory value still applies this session */
  }
  return next;
}

function CategoriesCard() {
  const [categories, setCategories] = useState(loadCategories);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [draftSubs, setDraftSubs] = useState('');

  const commit = (next) => { setCategories(next); persistCategories(next); };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
    commit([...categories, { id: `c-${Date.now()}`, name, subcategories: [] }]);
    setNewName('');
  };

  const startEdit = (cat) => {
    setEditing(cat.id);
    setDraftSubs(cat.subcategories.join(', '));
  };

  const saveSubs = (cat) => {
    const subs = draftSubs.split(',').map(s => s.trim()).filter(Boolean);
    commit(categories.map(c => (c.id === cat.id ? { ...c, subcategories: subs } : c)));
    setEditing(null);
  };

  const remove = (cat) => commit(categories.filter(c => c.id !== cat.id));

  return (
    <div className="card">
      <style>{`
        .cat-row { padding: 13px 0; border-bottom: 1px solid var(--ink-100); }
        .cat-row:last-of-type { border-bottom: none; }
        .cat-head { display: flex; align-items: center; gap: 12px; }
        .cat-name { font-weight: 600; font-size: 14px; color: var(--navy-900); }
        .cat-subs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
        .cat-sub { background: var(--ink-100); color: var(--ink-700); font-size: 11.5px; padding: 3px 9px; border-radius: var(--r-pill); }
        .cat-actions { margin-left: auto; display: flex; gap: 12px; }
        .cat-link { background: none; border: none; padding: 0; cursor: pointer; font-weight: 600; font-size: 12.5px; color: var(--navy-700); }
        .cat-link.danger { color: var(--red-700); }
      `}</style>

      <div className="card-header">
        <div>
          <div className="card-title">Journal categories</div>
          <div className="card-meta">
            Used by the submission wizard, reviewer matching and the editor&apos;s filters.
            Renaming one renames it on every manuscript already filed under it.
          </div>
        </div>
      </div>

      {categories.map(cat => (
        <div className="cat-row" key={cat.id}>
          <div className="cat-head">
            <span className="cat-name">{cat.name}</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {cat.subcategories.length} subcategor{cat.subcategories.length === 1 ? 'y' : 'ies'}
            </span>
            <span className="cat-actions">
              <button className="cat-link" onClick={() => (editing === cat.id ? saveSubs(cat) : startEdit(cat))}>
                {editing === cat.id ? 'Save' : 'Edit'}
              </button>
              <button className="cat-link danger" onClick={() => remove(cat)}>Remove</button>
            </span>
          </div>

          {editing === cat.id ? (
            <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
              <input
                className="field-input"
                value={draftSubs}
                onChange={e => setDraftSubs(e.target.value)}
                placeholder="Comma-separated subcategories"
              />
            </div>
          ) : cat.subcategories.length > 0 && (
            <div className="cat-subs">
              {cat.subcategories.map(s => <span className="cat-sub" key={s}>{s}</span>)}
            </div>
          )}
        </div>
      ))}

      <div className="row" style={{ marginTop: 16, gap: 10 }}>
        <input
          className="field-input"
          style={{ maxWidth: 280 }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add(); }}
          placeholder="New category name"
        />
        <button className="btn btn-ghost btn-sm" onClick={add} disabled={!newName.trim()}>
          Add category
        </button>
      </div>

      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.55 }}>
        Removing a category that manuscripts are filed under must be refused by the
        server, not silently detach them.
      </div>
    </div>
  );
}

export default function Settings({ role = 'author' }) {
  const isAdmin = role === 'admin';
  return (
    <AppShell role={role} searchPlaceholder="Search settings...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Account</span>
          <h1 className="page-title" style={{ marginTop: 8 }}><em className="serif-italic">Settings</em>.</h1>
          <p className="page-subtitle">Manage how PaperBridge works for you.</p>
        </div>
        <button className="btn btn-primary btn-sm">Save Changes</button>
      </div>

      <div className="gap-grid fade-up delay-1">
        {isAdmin && <ScreeningSettingsCard />}
        {isAdmin && <CategoriesCard />}

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Account preferences</div>
              <div className="card-meta">Language, timezone and display options.</div>
            </div>
          </div>
          <div className="field-grid">
            <div className="field">
              <label className="field-label">Language</label>
              <select className="field-select" defaultValue="en">
                <option value="en">English</option>
                <option value="ms">Bahasa Malaysia</option>
                <option value="zh">中文 (简体)</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Timezone</label>
              <select className="field-select" defaultValue="kl">
                <option value="kl">(GMT+8) Kuala Lumpur</option>
                <option value="sg">(GMT+8) Singapore</option>
                <option value="ja">(GMT+9) Tokyo</option>
                <option value="lo">(GMT+0) London</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Date format</label>
              <select className="field-select" defaultValue="dmy">
                <option value="dmy">DD MMM YYYY (12 Jan 2026)</option>
                <option value="mdy">MMM DD, YYYY (Jan 12, 2026)</option>
                <option value="iso">YYYY-MM-DD (2026-01-12)</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Theme</label>
              <select className="field-select" defaultValue="light">
                <option value="light">Light</option>
                <option value="dark">Dark (coming soon)</option>
                <option value="system">Match system</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Notifications</div>
              <div className="card-meta">Choose how you want to be alerted.</div>
            </div>
          </div>
          {[
            { label: 'Email digest', desc: 'A daily summary delivered to your inbox.', checked: true },
            { label: 'In-app notifications', desc: 'Real-time alerts in the PaperBridge notification bell.', checked: true },
            { label: 'Weekly summary', desc: 'A roll-up of all activity every Monday morning.', checked: false },
            { label: 'Reviewer reminders', desc: 'Gentle nudges as deadlines approach.', checked: true },
          ].map((row) => (
            <div key={row.label} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 0', borderBottom: '1px solid var(--ink-100)'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy-900)' }}>{row.label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-600)', marginTop: 2 }}>{row.desc}</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 42, height: 24 }}>
                <input type="checkbox" defaultChecked={row.checked} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', cursor: 'pointer', inset: 0,
                  background: row.checked ? 'var(--navy-900)' : 'var(--ink-300)',
                  borderRadius: 999, transition: 'all .2s',
                }}>
                  <span style={{
                    position: 'absolute', top: 3, left: row.checked ? 21 : 3,
                    width: 18, height: 18, background: 'var(--white)', borderRadius: '50%',
                    transition: 'all .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}></span>
                </span>
              </label>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Privacy</div>
              <div className="card-meta">Control what others can see.</div>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Profile visibility</label>
            <select className="field-select" defaultValue="community">
              <option value="public">Public — anyone can see my profile</option>
              <option value="community">Community — only PaperBridge users</option>
              <option value="private">Private — only editors and admins</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Anonymous review participation</label>
            <select className="field-select" defaultValue="anon">
              <option value="anon">Yes — keep my reviews anonymous (recommended)</option>
              <option value="signed">No — sign my reviews with my name</option>
            </select>
            <div className="field-hint">PaperBridge uses double-blind review by default. Authors will not see your name regardless of this setting.</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Security</div>
              <div className="card-meta">Keep your account safe.</div>
            </div>
          </div>
          <div className="field-grid">
            <div className="field">
              <label className="field-label">Current password</label>
              <input className="field-input" type="password" placeholder="••••••••" />
            </div>
            <div className="field">
              <label className="field-label">New password</label>
              <input className="field-input" type="password" placeholder="At least 8 characters" />
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '14px 0', borderTop: '1px solid var(--ink-100)', marginTop: 8
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy-900)' }}>Two-factor authentication</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-600)', marginTop: 2 }}>Add an extra layer of security with an authenticator app.</div>
            </div>
            <button className="btn btn-ghost btn-sm">Enable 2FA</button>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '14px 0', borderTop: '1px solid var(--ink-100)'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy-900)' }}>Active sessions</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-600)', marginTop: 2 }}>You're signed in on 2 devices.</div>
            </div>
            <button className="btn btn-ghost btn-sm">View sessions</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
