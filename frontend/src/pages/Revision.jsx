// src/pages/Revision.jsx
// Where an author acts on a minor/major decision: read what the editor
// asked for, respond to it, and upload the revised manuscript. Submitting
// here reopens the manuscript for a fresh editor decision — see
// api/revisions.js for the full contract.

import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { loadDrafts, saveDraft, deleteDraft, formatSavedAt } from '../data/drafts.js';
import { saveDraftRemote } from '../api/submissions.js';
import { getManuscript } from '../api/manuscripts.js';
import { getDecision } from '../api/editorial.js';
import { submitRevision } from '../api/revisions.js';
import { DECISION_LABELS, DECISION_TONE, formatDecidedAt } from '../data/editorial.js';
import DecisionHistory from '../components/DecisionHistory.jsx';

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024; // 20 MB — mirrors UserSubmit.jsx

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Revision() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [manuscript, setManuscript] = useState(null);
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    Promise.all([
      getManuscript(id),
      getDecision(id).catch(err => (err.status === 404 ? null : Promise.reject(err))),
    ])
      .then(([m, d]) => { if (!cancelled) { setManuscript(m); setDecision(d); } })
      .catch(err => { if (!cancelled) setLoadError(err.message || 'Could not load this paper.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // One revision draft per manuscript, so saving repeatedly updates in place
  // rather than piling up entries in My Papers.
  const existing = loadDrafts().find(d => d.kind === 'revision' && d.payload?.manuscript_id === id);
  const [draftId, setDraftId] = useState(existing?.id || null);
  const [response, setResponse] = useState(existing?.payload?.response ?? '');
  const [savedAt, setSavedAt] = useState(existing?.updated_at || '');
  const [saveError, setSaveError] = useState('');

  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pickFile = (selected) => {
    if (!selected) return;
    const isPdf = selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setUploadError('Manuscript must be a PDF file.');
      return;
    }
    if (selected.size > MAX_UPLOAD_SIZE) {
      setUploadError('Manuscript exceeds the 20MB size limit.');
      return;
    }
    setUploadError('');
    setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleSaveDraft = async () => {
    setSaveError('');
    const record = {
      id: draftId,
      kind: 'revision',
      title: manuscript?.title || '',
      step: 1,
      payload: { manuscript_id: id, response },
    };
    try {
      await saveDraftRemote(draftId, record);
    } catch {
      setSaveError('Saved on this device only — the draft service is unavailable.');
    }
    const saved = saveDraft(record);
    setDraftId(saved.id);
    setSavedAt(saved.updated_at);
  };

  const handleSubmit = async () => {
    if (!file) {
      setUploadError('Please upload your revised manuscript PDF before submitting.');
      return;
    }
    setSubmitting(true);
    setUploadError('');
    try {
      await submitRevision(id, { file, responseLetter: response });
    } catch (err) {
      setUploadError(err.message || 'Could not submit your revision. Please try again.');
      setSubmitting(false);
      return;
    }
    if (draftId) deleteDraft(draftId);
    navigate(`/author/papers/${id}`);
  };

  if (loading) {
    return (
      <AppShell role="author" searchPlaceholder="Search...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Revision</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>Loading…</h1>
          </div>
        </div>
      </AppShell>
    );
  }

  if (loadError || !manuscript) {
    return (
      <AppShell role="author" searchPlaceholder="Search...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Revision</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>Paper not found.</h1>
            <p className="page-subtitle">{loadError || 'No submission of yours matches that reference.'}</p>
          </div>
          <Link to="/author/papers" className="btn btn-ghost btn-sm">Back to my papers</Link>
        </div>
      </AppShell>
    );
  }

  if (manuscript.status !== 'revisions_requested') {
    return (
      <AppShell role="author" searchPlaceholder="Search...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Revision · #{id}</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>
              <em className="serif-italic">{manuscript.title}</em>.
            </h1>
            <p className="page-subtitle">This paper is not currently awaiting a revision.</p>
          </div>
          <Link to={`/author/papers/${id}`} className="btn btn-ghost btn-sm">Back to paper</Link>
        </div>
      </AppShell>
    );
  }

  const tone = decision ? DECISION_TONE[decision.type] : null;

  return (
    <AppShell role="author" searchPlaceholder="Search...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Revision Required · #{id}</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            <em className="serif-italic">{manuscript.title}</em>.
          </h1>
          <p className="page-subtitle">The editor has requested changes before this can be accepted.</p>
        </div>
        {decision && (
          <span className="md-rec" style={{ background: tone?.bg, color: tone?.fg }}>
            {DECISION_LABELS[decision.type]}
          </span>
        )}
      </div>

      <div className="split-grid fade-up delay-1" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <div className="gap-grid">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">What the editor asked for</div>
                {decision && (
                  <div className="card-meta">{decision.decided_by} · {formatDecidedAt(decision.decided_at)}</div>
                )}
              </div>
            </div>
            <div className="md-letter">{decision?.letter || 'No decision letter on file.'}</div>
          </div>

          <div className="card">
            <div className="card-header"><div><div className="card-title">Your Response</div><div className="card-meta">Address the editor&apos;s feedback in your response letter.</div></div></div>
            <div className="field">
              <label className="field-label">Response to the editor <span className="muted">(optional)</span></label>
              <textarea
                className="field-textarea"
                rows="8"
                value={response}
                onChange={e => setResponse(e.target.value)}
              />
              <div className="field-hint">Be specific about what you changed and why.</div>
            </div>
            <div className="field">
              <label className="field-label">Upload revised manuscript <span className="req">*</span></label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              {file ? (
                <div className="upload-area" style={{ borderStyle: 'solid', cursor: 'default' }}>
                  <div className="upload-area-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--green-800)" strokeWidth="2" width="22" height="22"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div className="upload-area-title">{file.name}</div>
                  <div className="upload-area-meta">{formatSize(file.size)} · ready to submit</div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      setFile(null);
                      setUploadError('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  className="upload-area"
                  style={{ cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <div className="upload-area-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                  </div>
                  <div className="upload-area-title">Drop your revised PDF here</div>
                  <div className="upload-area-meta">PDF only · Max 20MB · or click to browse</div>
                </div>
              )}
              {uploadError && (
                <div className="field-hint" style={{ color: 'var(--red-700, #b42318)' }}>{uploadError}</div>
              )}
            </div>
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--ink-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="row" style={{ gap: 12 }}>
                <button className="btn btn-ghost" onClick={handleSaveDraft}>Save Draft</button>
                {savedAt && !saveError && (
                  <span style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>Saved {formatSavedAt(savedAt)}</span>
                )}
                {saveError && (
                  <span style={{ fontSize: 12.5, color: 'var(--amber-800)' }}>{saveError}</span>
                )}
              </div>
              <button onClick={handleSubmit} className="btn btn-accent" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Revision →'}
              </button>
            </div>
          </div>
        </div>

        <div className="gap-grid">
          <DecisionHistory manuscriptId={id} />
        </div>
      </div>
    </AppShell>
  );
}
