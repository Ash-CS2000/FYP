import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { getScreeningSettings, patchScreeningSettings } from '../api/similarity.js';
import { loadLocalSettings, saveLocalSettings } from '../data/similarity.js';

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
