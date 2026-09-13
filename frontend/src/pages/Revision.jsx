// src/pages/Revision.jsx
// Where an author acts on a minor/major decision: read what the editor asked
// for, then resubmit. The resubmission form mirrors UserSubmit.jsx field for
// field — same type/details, authors, files, declarations, agreement — since
// a revision is a full resubmission, not just a file swap. Two differences
// from a fresh submission:
//   - every field starts prefilled from the manuscript's current answers
//     (the author edits what's there rather than starting blank)
//   - the manuscript PDF itself is never prefilled — a fresh upload is
//     always required, even if its content is unchanged
// Submitting here reopens the manuscript for a fresh editor decision and
// overwrites every field below server-side — see api/revisions.js.

import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import TagPicker from '../components/TagPicker.jsx';
import { loadDrafts, saveDraft, deleteDraft, formatSavedAt } from '../data/drafts.js';
import { saveDraftRemote } from '../api/submissions.js';
import { getManuscript } from '../api/manuscripts.js';
import { getDecision } from '../api/editorial.js';
import { submitRevision } from '../api/revisions.js';
import { DECISION_LABELS, DECISION_TONE, formatDecidedAt } from '../data/editorial.js';
import DecisionHistory from '../components/DecisionHistory.jsx';

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024; // 20 MB — mirrors UserSubmit.jsx

// Standard journal manuscript types — mirrors UserSubmit.jsx.
const ARTICLE_TYPES = [
  'Research article',
  'Review article',
  'Case study',
  'Short communication',
  'Methods / Protocol',
  'Perspective / Opinion',
];

const TITLES = ['', 'Dr', 'Prof', 'Mr', 'Ms', 'Mx'];
const DEGREES = ['', 'Student', 'BSc', 'MSc', 'MD', 'PhD', 'Professor', 'Other'];

function emptyAffiliation(overrides = {}) {
  return { department: '', institution: '', city: '', country: '', ...overrides };
}

function emptyAuthor(overrides = {}) {
  return {
    title: '',
    givenName: '',
    familyName: '',
    degree: '',
    email: '',
    orcid: '',
    corresponding: false,
    affiliations: [emptyAffiliation()],
    ...overrides,
  };
}

// The manuscript's current authors (ManuscriptAuthorSerializer shape) into
// the form's editable shape.
function authorsFromManuscript(manuscript) {
  const rows = manuscript?.authors || [];
  if (rows.length === 0) return [emptyAuthor({ corresponding: true })];
  return rows.map((a) => ({
    title: a.title || '',
    givenName: a.given_name || '',
    familyName: a.family_name || '',
    degree: a.degree || '',
    email: a.email || '',
    orcid: a.orcid || '',
    corresponding: !!a.corresponding,
    affiliations: a.affiliations?.length
      ? a.affiliations.map((af) => emptyAffiliation(af))
      : [emptyAffiliation()],
  }));
}

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
  // rather than piling up entries in My Papers. Only the response letter is
  // drafted locally — everything else is prefilled straight from the server
  // once the manuscript loads, below.
  const existing = loadDrafts().find(d => d.kind === 'revision' && d.payload?.manuscript_id === id);
  const [draftId, setDraftId] = useState(existing?.id || null);
  const [response, setResponse] = useState(existing?.payload?.response ?? '');
  const [savedAt, setSavedAt] = useState(existing?.updated_at || '');
  const [saveError, setSaveError] = useState('');

  // ── Prefilled fields — populated once, when the manuscript first loads ────
  const prefilledRef = useRef(false);
  const [articleType, setArticleType] = useState(ARTICLE_TYPES[0]);
  const [title, setTitle] = useState('');
  const [runningTitle, setRunningTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [specialtyTags, setSpecialtyTags] = useState([]);
  const [authors, setAuthors] = useState([emptyAuthor({ corresponding: true })]);
  const [coverLetter, setCoverLetter] = useState('');
  const [noFunding, setNoFunding] = useState(false);
  const [funder, setFunder] = useState('');
  const [grantNo, setGrantNo] = useState('');
  const [noCompeting, setNoCompeting] = useState(false);
  const [competing, setCompeting] = useState('');
  const [ethicsNA, setEthicsNA] = useState(false);
  const [ethics, setEthics] = useState('');
  const [dataStatement, setDataStatement] = useState('');

  useEffect(() => {
    if (!manuscript || prefilledRef.current) return;
    prefilledRef.current = true;
    setArticleType(manuscript.article_type || ARTICLE_TYPES[0]);
    setTitle(manuscript.title || '');
    setRunningTitle(manuscript.running_title || '');
    setAbstract(manuscript.abstract || '');
    setCategory(manuscript.category || '');
    setSubCategory(manuscript.sub_category || '');
    setKeywords(manuscript.keywords || '');
    setSpecialtyTags(manuscript.specialty_tags || []);
    setAuthors(authorsFromManuscript(manuscript));
    setCoverLetter(manuscript.cover_letter || '');
    setNoFunding(!!manuscript.no_funding);
    setFunder(manuscript.funder || '');
    setGrantNo(manuscript.grant_no || '');
    setNoCompeting(!!manuscript.no_competing);
    setCompeting(manuscript.competing || '');
    setEthicsNA(!!manuscript.ethics_na);
    setEthics(manuscript.ethics || '');
    setDataStatement(manuscript.data_statement || '');
  }, [manuscript]);

  // ── Files — never prefilled, always a fresh upload ────────────────────────
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const suppInputRef = useRef(null);
  const [supplementary, setSupplementary] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Agreement checklist — must be reaffirmed on every resubmission ────────
  const [agreements, setAgreements] = useState({
    original: false,
    notUnderReview: false,
    allApprove: false,
    policies: false,
  });
  const allAgreed = Object.values(agreements).every(Boolean);
  const [formError, setFormError] = useState('');

  // ── Author helpers — mirrors UserSubmit.jsx ───────────────────────────────
  const updateAuthor = (index, patch) =>
    setAuthors((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const addAuthor = () => setAuthors((prev) => [...prev, emptyAuthor()]);

  const removeAuthor = (index) =>
    setAuthors((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const moveAuthor = (index, dir) =>
    setAuthors((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const updateAffiliation = (ai, fi, patch) =>
    setAuthors((prev) =>
      prev.map((a, i) =>
        i === ai
          ? { ...a, affiliations: a.affiliations.map((af, j) => (j === fi ? { ...af, ...patch } : af)) }
          : a,
      ),
    );

  const addAffiliation = (ai) =>
    setAuthors((prev) =>
      prev.map((a, i) => (i === ai ? { ...a, affiliations: [...a.affiliations, emptyAffiliation()] } : a)),
    );

  const removeAffiliation = (ai, fi) =>
    setAuthors((prev) =>
      prev.map((a, i) =>
        i === ai && a.affiliations.length > 1
          ? { ...a, affiliations: a.affiliations.filter((_, j) => j !== fi) }
          : a,
      ),
    );

  // ── File helpers ───────────────────────────────────────────────────────────
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

  const addSupplementary = (fileList) => {
    const picked = Array.from(fileList || []);
    if (picked.length) setSupplementary((prev) => [...prev, ...picked]);
  };

  const removeSupplementary = (index) =>
    setSupplementary((prev) => prev.filter((_, i) => i !== index));

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
    if (!title.trim() || !abstract.trim()) {
      setFormError('Title and abstract are required.');
      return;
    }
    if (!authors.some((a) => a.givenName.trim() && a.familyName.trim())) {
      setFormError('Add at least one author with a given and family name.');
      return;
    }
    if (!authors.some((a) => a.corresponding)) {
      setFormError('Mark one author as the corresponding author.');
      return;
    }
    if (!file) {
      setFormError('Please upload your revised manuscript PDF before submitting.');
      setUploadError('Please upload your revised manuscript PDF before submitting.');
      return;
    }
    if (!allAgreed) {
      setFormError('Please accept all submission terms before submitting.');
      return;
    }

    setFormError('');
    setSubmitting(true);
    try {
      await submitRevision(id, {
        file, responseLetter: response, supplementary,
        articleType, title, runningTitle, abstract, category, subCategory, keywords, specialtyTags,
        authors, coverLetter,
        noFunding, funder, grantNo, noCompeting, competing, ethicsNA, ethics, dataStatement,
        agreements,
      });
    } catch (err) {
      setFormError(err.message || 'Could not submit your revision. Please try again.');
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
          <p className="page-subtitle">
            The editor has requested changes. Everything below is prefilled from your last
            submission — edit anything that needs to change, then re-attach your manuscript.
          </p>
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
            <div className="card-header"><div><div className="card-title">Your response</div><div className="card-meta">Address the editor&apos;s feedback in your response letter.</div></div></div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">Response to the editor <span className="muted">(optional)</span></label>
              <textarea
                className="field-textarea"
                rows="6"
                value={response}
                onChange={e => setResponse(e.target.value)}
              />
              <div className="field-hint">Be specific about what you changed and why.</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Type & Details</div></div>
            <div className="field">
              <label className="field-label">Article type <span className="req">*</span></label>
              <select className="field-select" value={articleType} onChange={(e) => setArticleType(e.target.value)}>
                {ARTICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Paper title <span className="req">*</span></label>
              <input className="field-input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Running / short title</label>
              <input className="field-input" type="text" maxLength={100} value={runningTitle} onChange={(e) => setRunningTitle(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Abstract <span className="req">*</span></label>
              <textarea className="field-textarea" rows="6" value={abstract} onChange={(e) => setAbstract(e.target.value)} />
            </div>
            <div className="field-grid">
              <div className="field">
                <label className="field-label">Research category</label>
                <input className="field-input" type="text" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">Sub-category</label>
                <input className="field-input" type="text" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Keywords</label>
              <input className="field-input" type="text" placeholder="4–6 keywords, comma separated" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">Specialty tags</label>
              <div className="field-hint" style={{ marginTop: 0, marginBottom: 10 }}>
                Pick 1–3.
              </div>
              <TagPicker value={specialtyTags} onChange={setSpecialtyTags} max={3} collapsible />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Authors</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {authors.map((author, i) => (
                <div key={i} style={{ padding: 16, border: '1px solid var(--ink-200)', borderRadius: 'var(--r-md)', background: 'var(--ink-50)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div className="label">Author {i + 1}{author.corresponding ? ' · Corresponding' : ''}</div>
                    <div className="row" style={{ gap: 6 }}>
                      <button type="button" className="btn btn-ghost btn-sm" title="Move up" disabled={i === 0} onClick={() => moveAuthor(i, -1)}>↑</button>
                      <button type="button" className="btn btn-ghost btn-sm" title="Move down" disabled={i === authors.length - 1} onClick={() => moveAuthor(i, 1)}>↓</button>
                      {authors.length > 1 && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeAuthor(i)}>Remove</button>
                      )}
                    </div>
                  </div>
                  <div className="field-grid" style={{ gridTemplateColumns: '0.7fr 1.3fr 1.3fr' }}>
                    <div className="field">
                      <label className="field-label">Title</label>
                      <select className="field-select" value={author.title} onChange={(e) => updateAuthor(i, { title: e.target.value })}>
                        {TITLES.map((t) => <option key={t} value={t}>{t || '—'}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Given name <span className="req">*</span></label>
                      <input className="field-input" type="text" value={author.givenName} onChange={(e) => updateAuthor(i, { givenName: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="field-label">Family name <span className="req">*</span></label>
                      <input className="field-input" type="text" value={author.familyName} onChange={(e) => updateAuthor(i, { familyName: e.target.value })} />
                    </div>
                  </div>
                  <div className="field-grid">
                    <div className="field">
                      <label className="field-label">Academic degree</label>
                      <select className="field-select" value={author.degree} onChange={(e) => updateAuthor(i, { degree: e.target.value })}>
                        {DEGREES.map((d) => <option key={d} value={d}>{d || '—'}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Email</label>
                      <input className="field-input" type="email" value={author.email} onChange={(e) => updateAuthor(i, { email: e.target.value })} />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">ORCID iD</label>
                    <input className="field-input" type="text" value={author.orcid} onChange={(e) => updateAuthor(i, { orcid: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="field-label">Affiliation(s)</label>
                    {author.affiliations.map((af, fi) => (
                      <div key={fi} style={{ padding: 12, border: '1px solid var(--ink-200)', borderRadius: 'var(--r-md)', background: 'var(--white)', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>Affiliation {fi + 1}</span>
                          {author.affiliations.length > 1 && (
                            <span style={{ cursor: 'pointer', color: 'var(--ink-500)', fontSize: 13 }} onClick={() => removeAffiliation(i, fi)}>× Remove</span>
                          )}
                        </div>
                        <div className="field-grid">
                          <div className="field" style={{ marginBottom: 8 }}>
                            <label className="field-label">Department</label>
                            <input className="field-input" type="text" value={af.department} onChange={(e) => updateAffiliation(i, fi, { department: e.target.value })} />
                          </div>
                          <div className="field" style={{ marginBottom: 8 }}>
                            <label className="field-label">Institution</label>
                            <input className="field-input" type="text" value={af.institution} onChange={(e) => updateAffiliation(i, fi, { institution: e.target.value })} />
                          </div>
                        </div>
                        <div className="field-grid">
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label className="field-label">City</label>
                            <input className="field-input" type="text" value={af.city} onChange={(e) => updateAffiliation(i, fi, { city: e.target.value })} />
                          </div>
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label className="field-label">Country</label>
                            <input className="field-input" type="text" value={af.country} onChange={(e) => updateAffiliation(i, fi, { country: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => addAffiliation(i)}>+ Add affiliation</button>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--navy-900)', marginBottom: 0, cursor: 'pointer' }}>
                    <input type="checkbox" checked={author.corresponding} onChange={(e) => updateAuthor(i, { corresponding: e.target.checked })} />
                    Corresponding author
                  </label>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={addAuthor}>+ Add author</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Files</div></div>
            <div className="field">
              <label className="field-label">Revised manuscript PDF <span className="req">*</span></label>
              <div className="field-hint" style={{ marginTop: 0, marginBottom: 8 }}>
                Not prefilled — attach the revised file even if it's unchanged.
              </div>
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

            {manuscript.supplementary_files?.length > 0 && (
              <div className="field">
                <label className="field-label">Already attached</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {manuscript.supplementary_files.map((s, i) => (
                    <a key={i} href={s.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--navy-700)' }}>
                      {s.file_name} <span className="muted">· {formatSize(s.file_size)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="field">
              <label className="field-label">Add supplementary files (optional)</label>
              <input
                ref={suppInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => { addSupplementary(e.target.files); if (suppInputRef.current) suppInputRef.current.value = ''; }}
              />
              <div
                className="upload-area"
                style={{ cursor: 'pointer', padding: 24 }}
                onClick={() => suppInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); addSupplementary(e.dataTransfer.files); }}
              >
                <div className="upload-area-meta">Datasets, figures, tables, or code · click to browse or drop files</div>
              </div>
              {supplementary.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {supplementary.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: 'var(--ink-50)', borderRadius: 'var(--r-md)', fontSize: 13 }}>
                      <span style={{ color: 'var(--navy-900)' }}>{s.name} <span className="muted">· {formatSize(s.size)}</span></span>
                      <span style={{ cursor: 'pointer', color: 'var(--ink-500)' }} onClick={() => removeSupplementary(i)}>×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">Cover letter (optional)</label>
              <textarea className="field-textarea" rows="4" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Declarations</div></div>
            <div className="field">
              <label className="field-label">Funding</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--navy-900)', marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={noFunding} onChange={(e) => setNoFunding(e.target.checked)} />
                This research received no specific funding
              </label>
              {!noFunding && (
                <div className="field-grid">
                  <div className="field">
                    <label className="field-label">Funder / organization</label>
                    <input className="field-input" type="text" value={funder} onChange={(e) => setFunder(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="field-label">Grant / award number</label>
                    <input className="field-input" type="text" value={grantNo} onChange={(e) => setGrantNo(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <div className="field">
              <label className="field-label">Competing interests</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--navy-900)', marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={noCompeting} onChange={(e) => setNoCompeting(e.target.checked)} />
                The authors declare no competing interests
              </label>
              {!noCompeting && (
                <textarea className="field-textarea" rows="3" value={competing} onChange={(e) => setCompeting(e.target.value)} />
              )}
            </div>
            <div className="field">
              <label className="field-label">Ethics / IRB approval</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--navy-900)', marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={ethicsNA} onChange={(e) => setEthicsNA(e.target.checked)} />
                Not applicable (no human/animal subjects)
              </label>
              {!ethicsNA && (
                <textarea className="field-textarea" rows="3" value={ethics} onChange={(e) => setEthics(e.target.value)} />
              )}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">Data availability statement</label>
              <textarea className="field-textarea" rows="3" value={dataStatement} onChange={(e) => setDataStatement(e.target.value)} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Submission agreement</div></div>
            {[
              ['original', 'This manuscript is original work and has not been published before.'],
              ['notUnderReview', 'This manuscript is not under consideration at another journal.'],
              ['allApprove', 'All listed authors have read and approved this resubmission.'],
              ['policies', 'I agree to the journal’s submission and ethics policies.'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--navy-900)', marginBottom: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreements[key]}
                  style={{ marginTop: 3 }}
                  onChange={(e) => setAgreements((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--ink-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="row" style={{ gap: 12 }}>
                <button className="btn btn-ghost" onClick={handleSaveDraft}>Save Draft</button>
                {savedAt && !saveError && (
                  <span style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>Saved {formatSavedAt(savedAt)}</span>
                )}
                {saveError && (
                  <span style={{ fontSize: 12.5, color: 'var(--amber-800)' }}>{saveError}</span>
                )}
              </div>
              <div className="row" style={{ gap: 12 }}>
                {formError && <span style={{ fontSize: 13, color: 'var(--red-700, #b42318)' }}>{formError}</span>}
                <button onClick={handleSubmit} className="btn btn-accent" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Revision →'}
                </button>
              </div>
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
