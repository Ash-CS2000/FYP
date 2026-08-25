import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { API_URL } from '../config';
import {
  getProgress,
  countCompletedUnits,
  publicationState,
  submitPublication,
} from '../data/trainingProgress.js';
import { getDemoSession } from '../data/demoAccounts.js';
import { TRAINING_UNITS, PUBLICATION_WINDOW_DAYS } from '../data/trainingContent.js';
import { draftFor, saveDraft, deleteDraft, formatSavedAt } from '../data/drafts.js';
import { saveDraftRemote } from '../api/submissions.js';

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024; // 20 MB
const TOTAL_STEPS = 5;

// Standard journal manuscript types.
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

const STEPS = [
  { n: 1, title: 'Type & Details', sub: 'Article type, title, abstract' },
  { n: 2, title: 'Authors', sub: 'Co-authors and affiliations' },
  { n: 3, title: 'Files', sub: 'Manuscript, supplements, cover letter' },
  { n: 4, title: 'Declarations', sub: 'Funding, ethics, data' },
  { n: 5, title: 'Review & Agreement', sub: 'Confirm and submit' },
];

const STEP_META = {
  1: 'All fields marked * are required.',
  2: 'List every author and their affiliations.',
  3: 'Upload your manuscript and any supporting files.',
  4: 'Disclosures required by most journals.',
  5: 'Review everything and accept the submission terms.',
};

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

// Split a full name into given name(s) + family (last token).
function splitName(full) {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { givenName: '', familyName: '' };
  if (parts.length === 1) return { givenName: parts[0], familyName: '' };
  return { givenName: parts.slice(0, -1).join(' '), familyName: parts[parts.length - 1] };
}

function authorDisplayName(a) {
  return [a.title, a.givenName, a.familyName].filter(Boolean).join(' ');
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UserSubmit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const progress = getProgress();

  // Resuming a draft. Read once, before any state is initialised, so every field
  // below can seed from it. `d` is empty for a fresh submission, which is why
  // every read below carries its own default.
  const resumeId = searchParams.get('draft');
  const resumed = resumeId ? draftFor(resumeId) : null;
  const d = resumed?.payload || {};
  // Submission unlocks once the final assessment is passed — students need it
  // open to submit the paper that earns their certificate.
  const canSubmit = progress.assessment.passed;
  const pub = publicationState(progress);
  // The required paper is still outstanding until it has been submitted.
  const fulfillingRequirement = progress.assessment.passed && pub.status === 'pending';
  const completedUnits = countCompletedUnits(progress);

  const [step, setStep] = useState(resumed?.step || 1);
  const [draftId, setDraftId] = useState(resumeId || null);
  const [draftSavedAt, setDraftSavedAt] = useState(resumed?.updated_at || '');
  const [draftError, setDraftError] = useState('');

  // Step 1 — Type & details
  const [articleType, setArticleType] = useState(d.articleType || ARTICLE_TYPES[0]);
  const [title, setTitle] = useState(d.title || '');
  const [runningTitle, setRunningTitle] = useState(d.runningTitle || '');
  const [abstract, setAbstract] = useState(d.abstract || '');
  const [category, setCategory] = useState(d.category || 'Computer Science — AI & ML');
  const [subCategory, setSubCategory] = useState(d.subCategory || 'Medical Imaging');
  const [keywords, setKeywords] = useState(d.keywords || '');

  // Step 2 — Authors
  const [authors, setAuthors] = useState(() =>
    d.authors?.length
      ? d.authors
      : [emptyAuthor({ ...splitName(getDemoSession()?.name), corresponding: true })],
  );

  // Step 3 — Files
  const [file, setFile] = useState(null);
  const [supplementary, setSupplementary] = useState([]);
  const [coverLetter, setCoverLetter] = useState(d.coverLetter || '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);
  const suppInputRef = useRef(null);

  // Step 4 — Declarations
  const [noFunding, setNoFunding] = useState(d.noFunding || false);
  const [funder, setFunder] = useState(d.funder || '');
  const [grantNo, setGrantNo] = useState(d.grantNo || '');
  const [noCompeting, setNoCompeting] = useState(d.noCompeting || false);
  const [competing, setCompeting] = useState(d.competing || '');
  const [ethicsNA, setEthicsNA] = useState(d.ethicsNA || false);
  const [ethics, setEthics] = useState(d.ethics || '');
  const [dataStatement, setDataStatement] = useState(d.dataStatement || '');

  // Step 5 — Agreement checklist
  const [agreements, setAgreements] = useState({
    original: false,
    notUnderReview: false,
    allApprove: false,
    policies: false,
  });
  const allAgreed = Object.values(agreements).every(Boolean);
  const [stepError, setStepError] = useState('');

  // ---- Drafts -------------------------------------------------------------
  // Everything serialisable, and nothing else. The manuscript File is excluded
  // deliberately — see the note at the top of data/drafts.js — so a resumed
  // draft asks for the file again rather than silently losing it.
  const draftPayload = () => ({
    articleType, title, runningTitle, abstract, category, subCategory, keywords,
    authors, coverLetter,
    noFunding, funder, grantNo, noCompeting, competing, ethicsNA, ethics, dataStatement,
  });

  const handleSaveDraft = async () => {
    setDraftError('');
    const record = {
      id: draftId,
      kind: 'submission',
      title,
      step,
      payload: draftPayload(),
      file_name: file?.name || '',
    };
    try {
      await saveDraftRemote(draftId, record);
    } catch {
      setDraftError('Saved on this device only — the draft service is unavailable.');
    }
    const saved = saveDraft(record);
    setDraftId(saved.id);
    setDraftSavedAt(saved.updated_at);
  };

  // ---- Author helpers -----------------------------------------------------
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

  // ---- File helpers -------------------------------------------------------
  const pickFile = (selected) => {
    if (!selected) return;
    const isPdf =
      selected.type === 'application/pdf' ||
      selected.name.toLowerCase().endsWith('.pdf');
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

  // ---- Gated (assessment not passed) --------------------------------------
  if (!canSubmit) {
    const unitsPercent = Math.round((completedUnits / TRAINING_UNITS.length) * 100);
    return (
      <AppShell role="author" searchPlaceholder="Search...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Submit Research</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>
              Submit a <em className="serif-italic">paper</em>.
            </h1>
            <p className="page-subtitle">Paper submission unlocks after you pass the final assessment.</p>
          </div>
        </div>

        <div className="card fade-up delay-1 submit-locked">
          <div className="unit-locked-icon">🔒</div>
          <h2>Complete your training to submit</h2>
          <p>
            To keep the quality of published research high, JSRMS requires students to complete the
            research publishing training and pass the final assessment before submitting a paper.
          </p>

          <div className="submit-locked-progress">
            <div className="submit-locked-progress-head">
              <span>Training progress</span>
              <span>{completedUnits} of {TRAINING_UNITS.length} units complete</span>
            </div>
            <div className="progress" style={{ '--accent': 'var(--amber-700)' }}>
              <div className="progress-fill" style={{ width: `${unitsPercent}%` }}></div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 18, gap: 12 }}>
            <Link to="/author/training" className="btn btn-primary">Continue Training →</Link>
            <Link to="/author/assessment" className="btn btn-ghost">Go to Final Assessment</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---- Passed: submission form --------------------------------------------
  const validateStep = (n) => {
    if (n === 1) {
      if (!title.trim() || !abstract.trim()) return 'Title and abstract are required.';
    }
    if (n === 2) {
      if (!authors.some((a) => a.givenName.trim() && a.familyName.trim()))
        return 'Add at least one author with a given and family name.';
      if (!authors.some((a) => a.corresponding)) return 'Mark one author as the corresponding author.';
    }
    if (n === 3) {
      if (!file) return 'Please upload your manuscript PDF.';
    }
    return '';
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      const err = validateStep(step);
      if (err) {
        setStepError(err);
        return;
      }
      setStepError('');
      setStep(step + 1);
      return;
    }

    // Final step — make sure earlier requirements still hold.
    if (!file) {
      setUploadError('Please upload your manuscript PDF before submitting.');
      setStep(3);
      return;
    }
    if (!allAgreed) {
      setStepError('Please accept all submission terms before submitting.');
      return;
    }

    setStepError('');
    setUploading(true);
    setUploadError('');
    try {
      const authorsPayload = authors.map((a) => ({
        title: a.title,
        given_name: a.givenName,
        family_name: a.familyName,
        degree: a.degree,
        email: a.email,
        orcid: a.orcid,
        corresponding: a.corresponding,
        affiliations: a.affiliations.map((af) => ({
          department: af.department,
          institution: af.institution,
          city: af.city,
          country: af.country,
        })),
      }));

      const formData = new FormData();
      formData.append('article_type', articleType);
      formData.append('title', title);
      formData.append('running_title', runningTitle);
      formData.append('abstract', abstract);
      formData.append('category', category);
      formData.append('sub_category', subCategory);
      formData.append('keywords', keywords);
      formData.append('authors', JSON.stringify(authorsPayload));
      formData.append('manuscript', file);
      supplementary.forEach((f) => formData.append('supplementary', f));
      formData.append('cover_letter', coverLetter);
      formData.append('no_funding', noFunding);
      formData.append('funder', funder);
      formData.append('grant_no', grantNo);
      formData.append('no_competing', noCompeting);
      formData.append('competing', competing);
      formData.append('ethics_na', ethicsNA);
      formData.append('ethics', ethics);
      formData.append('data_statement', dataStatement);
      formData.append('agreed_original', agreements.original);
      formData.append('agreed_not_under_review', agreements.notUnderReview);
      formData.append('agreed_all_approve', agreements.allApprove);
      formData.append('agreed_policies', agreements.policies);

      const res = await fetch(`${API_URL}/api/manuscripts/upload/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access')}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.detail || 'Upload failed. Please try again.');
        return;
      }
    } catch {
      setUploadError('Could not reach the server. Please try again.');
      return;
    } finally {
      setUploading(false);
    }

    // The draft has served its purpose — leaving it behind would show the author
    // a "resume" entry for a paper they already submitted.
    if (draftId) deleteDraft(draftId);

    if (fulfillingRequirement) {
      submitPublication(title, getDemoSession()?.name || 'JSRMS Student');
      alert(
        'Paper submitted — and that completes your certification! Your training ' +
          'certificate has been issued. Reviewers will follow up on the paper itself.',
      );
      navigate('/author/certificate');
      return;
    }
    alert('Paper submitted successfully! Our reviewers will be in touch.');
    navigate('/author/papers');
  };

  

  return (
    <AppShell role="author" searchPlaceholder="Search...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">New Submission</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Submit a <em className="serif-italic">new paper</em>.</h1>
          <p className="page-subtitle">Tell us about your research and our AI will help classify it.</p>
        </div>
        {progress.certificate ? (
          <span className="pill pill-approved">Certified ✓</span>
        ) : (
          <span className="pill pill-review">Certification paper</span>
        )}
      </div>

      {resumed && (
        <div className="lms-banner is-todo fade-up" style={{ marginBottom: 18 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5" />
          </svg>
          <span>
            Draft resumed from {formatSavedAt(resumed.updated_at)}.
            {resumed.file_name
              ? ` Your manuscript file was not saved with it — re-attach ${resumed.file_name} at step 3.`
              : ' Files are not saved with a draft, so attach your manuscript at step 3.'}
          </span>
        </div>
      )}

      {fulfillingRequirement && (
        <div className="unit-todo-banner fade-up" style={{ marginBottom: 18 }}>
          <strong>Submitting this paper completes your certification.</strong>
          <span className="todo">Your training certificate is issued as soon as you submit</span>
          {pub.deadline && (
            <span className="todo">
              Recommended by {formatDate(pub.deadline)} (~{PUBLICATION_WINDOW_DAYS} days) — no hard deadline
            </span>
          )}
        </div>
      )}

      <div className="steps fade-up delay-1">
        {STEPS.map((s) => (
          <div key={s.n} className={`step ${step === s.n ? 'active' : ''} ${step > s.n ? 'done' : ''}`}>
            <div className="step-num">{step > s.n ? '✓' : s.n}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{s.title}</div>
              <div style={{ fontSize: 11.5, opacity: 0.8 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="split-grid fade-up delay-2" style={{ gridTemplateColumns: '2.2fr 1fr' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Step {step} — {STEPS[step - 1].title}</div>
              <div className="card-meta">{STEP_META[step]}</div>
            </div>
          </div>

          {step === 1 && (
            <>
              <div className="field">
                <label className="field-label">Article type <span className="req">*</span></label>
                <select
                  className="field-select"
                  value={articleType}
                  onChange={(e) => setArticleType(e.target.value)}
                >
                  {ARTICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <div className="field-hint">Choose the category that best describes your manuscript.</div>
              </div>
              <div className="field">
                <label className="field-label">Paper title <span className="req">*</span></label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="Enter your paper title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <div className="field-hint">Use the final title you would like to appear in publication.</div>
              </div>
              <div className="field">
                <label className="field-label">Running / short title</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="A shortened title (max ~100 characters)"
                  maxLength={100}
                  value={runningTitle}
                  onChange={(e) => setRunningTitle(e.target.value)}
                />
                <div className="field-hint">Appears in page headers. {100 - runningTitle.length} characters left.</div>
              </div>
              <div className="field">
                <label className="field-label">Abstract <span className="req">*</span></label>
                <textarea
                  className="field-textarea"
                  rows="6"
                  placeholder="Paste your abstract here..."
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                ></textarea>
                <div className="field-hint ai">AI suggestion will appear here based on your abstract.</div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label className="field-label">Research category <span className="req">*</span></label>
                  <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option>Computer Science — AI & ML</option>
                    <option>Computer Science — Software Engineering</option>
                    <option>Engineering — Electronics</option>
                    <option>Medicine — Imaging</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Sub-category</label>
                  <select className="field-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)}>
                    <option>Medical Imaging</option>
                    <option>Computer Vision</option>
                    <option>Neural Networks</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Keywords</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="4–6 keywords, comma separated"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
                <div className="field-hint">These help with discoverability and reviewer matching.</div>
              </div>
            </>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {authors.map((author, i) => (
                <div
                  key={i}
                  style={{ padding: 16, border: '1px solid var(--ink-200)', borderRadius: 'var(--r-md)', background: 'var(--ink-50)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div className="label">Author {i + 1}{author.corresponding ? ' · Corresponding' : ''}</div>
                    <div className="row" style={{ gap: 6 }}>
                      <button type="button" className="btn btn-ghost btn-sm" title="Move up"
                        disabled={i === 0} onClick={() => moveAuthor(i, -1)}>↑</button>
                      <button type="button" className="btn btn-ghost btn-sm" title="Move down"
                        disabled={i === authors.length - 1} onClick={() => moveAuthor(i, 1)}>↓</button>
                      {authors.length > 1 && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeAuthor(i)}>Remove</button>
                      )}
                    </div>
                  </div>
                  <div className="field-grid" style={{ gridTemplateColumns: '0.7fr 1.3fr 1.3fr' }}>
                    <div className="field">
                      <label className="field-label">Title</label>
                      <select className="field-select" value={author.title}
                        onChange={(e) => updateAuthor(i, { title: e.target.value })}>
                        {TITLES.map((t) => <option key={t} value={t}>{t || '—'}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Given name <span className="req">*</span></label>
                      <input className="field-input" type="text" placeholder="e.g. Ahmad"
                        value={author.givenName} onChange={(e) => updateAuthor(i, { givenName: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="field-label">Family name <span className="req">*</span></label>
                      <input className="field-input" type="text" placeholder="e.g. Razif"
                        value={author.familyName} onChange={(e) => updateAuthor(i, { familyName: e.target.value })} />
                    </div>
                  </div>
                  <div className="field-grid">
                    <div className="field">
                      <label className="field-label">Academic degree</label>
                      <select className="field-select" value={author.degree}
                        onChange={(e) => updateAuthor(i, { degree: e.target.value })}>
                        {DEGREES.map((d) => <option key={d} value={d}>{d || '—'}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Email</label>
                      <input className="field-input" type="email" placeholder="name@institution.edu"
                        value={author.email} onChange={(e) => updateAuthor(i, { email: e.target.value })} />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">ORCID iD</label>
                    <input className="field-input" type="text" placeholder="0000-0000-0000-0000"
                      value={author.orcid} onChange={(e) => updateAuthor(i, { orcid: e.target.value })} />
                  </div>

                  <div className="field">
                    <label className="field-label">Affiliation(s)</label>
                    {author.affiliations.map((af, fi) => (
                      <div key={fi} style={{ padding: 12, border: '1px solid var(--ink-200)', borderRadius: 'var(--r-md)', background: 'var(--white)', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>Affiliation {fi + 1}</span>
                          {author.affiliations.length > 1 && (
                            <span style={{ cursor: 'pointer', color: 'var(--ink-500)', fontSize: 13 }}
                              onClick={() => removeAffiliation(i, fi)}>× Remove</span>
                          )}
                        </div>
                        <div className="field-grid">
                          <div className="field" style={{ marginBottom: 8 }}>
                            <label className="field-label">Department</label>
                            <input className="field-input" type="text" placeholder="e.g. School of Computing"
                              value={af.department} onChange={(e) => updateAffiliation(i, fi, { department: e.target.value })} />
                          </div>
                          <div className="field" style={{ marginBottom: 8 }}>
                            <label className="field-label">Institution</label>
                            <input className="field-input" type="text" placeholder="e.g. Universiti Teknologi Malaysia"
                              value={af.institution} onChange={(e) => updateAffiliation(i, fi, { institution: e.target.value })} />
                          </div>
                        </div>
                        <div className="field-grid">
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label className="field-label">City</label>
                            <input className="field-input" type="text" placeholder="e.g. Johor Bahru"
                              value={af.city} onChange={(e) => updateAffiliation(i, fi, { city: e.target.value })} />
                          </div>
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label className="field-label">Country</label>
                            <input className="field-input" type="text" placeholder="e.g. Malaysia"
                              value={af.country} onChange={(e) => updateAffiliation(i, fi, { country: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => addAffiliation(i)}>+ Add affiliation</button>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--navy-900)', marginBottom: 0, cursor: 'pointer' }}>
                    <input type="checkbox" checked={author.corresponding}
                      onChange={(e) => updateAuthor(i, { corresponding: e.target.checked })} />
                    Corresponding author
                  </label>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={addAuthor}>
                + Add author
              </button>
            </div>
          )}

          {step === 3 && (
            <>
              <div className="field">
                <label className="field-label">Manuscript PDF <span className="req">*</span></label>
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
                    <div className="upload-area-title">Drop your manuscript PDF here</div>
                    <div className="upload-area-meta">PDF only · Max 20MB · or click to browse</div>
                  </div>
                )}
                {uploadError && (
                  <div className="field-hint" style={{ color: 'var(--red-700, #b42318)' }}>{uploadError}</div>
                )}
                {file && (
                  <div className="field-hint">
                    Your manuscript will be checked for originality automatically after you submit —
                    you'll see the result on this paper's page.
                  </div>
                )}
              </div>

              <div className="field">
                <label className="field-label">Supplementary files (optional)</label>
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

              <div className="field">
                <label className="field-label">Cover letter (optional)</label>
                <textarea
                  className="field-textarea"
                  rows="4"
                  placeholder="A short note to the editor..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                ></textarea>
              </div>
            </>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                      <input className="field-input" type="text" placeholder="e.g. Ministry of Higher Education"
                        value={funder} onChange={(e) => setFunder(e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label">Grant / award number</label>
                      <input className="field-input" type="text" placeholder="e.g. FRGS/1/2025/ICT/001"
                        value={grantNo} onChange={(e) => setGrantNo(e.target.value)} />
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
                  <textarea className="field-textarea" rows="3" placeholder="Describe any financial or non-financial competing interests..."
                    value={competing} onChange={(e) => setCompeting(e.target.value)}></textarea>
                )}
              </div>

              <div className="field">
                <label className="field-label">Ethics / IRB approval</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--navy-900)', marginBottom: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={ethicsNA} onChange={(e) => setEthicsNA(e.target.checked)} />
                  Not applicable (no human/animal subjects)
                </label>
                {!ethicsNA && (
                  <textarea className="field-textarea" rows="3" placeholder="Approval body, reference number, and informed-consent details..."
                    value={ethics} onChange={(e) => setEthics(e.target.value)}></textarea>
                )}
              </div>

              <div className="field">
                <label className="field-label">Data availability statement</label>
                <textarea className="field-textarea" rows="3" placeholder="Where can the data supporting this study be found? (repository, DOI, on request, etc.)"
                  value={dataStatement} onChange={(e) => setDataStatement(e.target.value)}></textarea>
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 18, background: 'var(--ink-50)', borderRadius: 'var(--r-md)' }}>
                <div className="label" style={{ marginBottom: 10 }}>Submission summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, columnGap: 12, fontSize: 13.5, color: 'var(--navy-900)' }}>
                  <span className="muted">Type</span><span>{articleType}</span>
                  <span className="muted">Title</span><span>{title || <em className="muted">—</em>}</span>
                  <span className="muted">Authors</span><span>{authors.map(authorDisplayName).filter(Boolean).join(', ') || <em className="muted">—</em>}</span>
                  <span className="muted">Manuscript</span><span>{file ? file.name : <em className="muted">not uploaded</em>}</span>
                  <span className="muted">Supplements</span><span>{supplementary.length ? `${supplementary.length} file(s)` : 'none'}</span>
                  <span className="muted">Originality</span><span>Checked automatically after submission</span>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Submission agreement <span className="req">*</span></label>
                {[
                  ['original', 'This manuscript is original work and has not been published before.'],
                  ['notUnderReview', 'This manuscript is not under consideration at another journal.'],
                  ['allApprove', 'All listed authors have read and approved this submission.'],
                  ['policies', 'I agree to the journal’s submission and ethics policies.'],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--navy-900)', marginBottom: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={agreements[key]} style={{ marginTop: 3 }}
                      onChange={(e) => setAgreements((prev) => ({ ...prev, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--ink-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="row">
              {step > 1 && <button onClick={() => { setStepError(''); setStep(step - 1); }} className="btn btn-ghost">← Back</button>}
              <button className="btn btn-ghost" onClick={handleSaveDraft}>Save as Draft</button>
              {draftSavedAt && !draftError && (
                <span style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>
                  Saved {formatSavedAt(draftSavedAt)}
                </span>
              )}
              {draftError && (
                <span style={{ fontSize: 12.5, color: 'var(--amber-800)' }}>{draftError}</span>
              )}
            </div>
            <div className="row">
              {(stepError || (step === TOTAL_STEPS && uploadError)) && (
                <span style={{ fontSize: 13, color: 'var(--red-700, #b42318)' }}>{stepError || uploadError}</span>
              )}
              <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>Step {step} of {TOTAL_STEPS}</span>
              <button
                onClick={handleNext}
                className="btn btn-primary"
                disabled={uploading || (step === TOTAL_STEPS && !allAgreed)}
              >
                {step === TOTAL_STEPS ? (uploading ? 'Submitting…' : 'Submit Paper →') : 'Continue →'}
              </button>
            </div>
          </div>
        </div>

        <div className="gap-grid">
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--navy-100) 0%, var(--white) 100%)', borderColor: 'var(--navy-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--navy-900)', color: 'var(--amber-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 2L4 6v12l8 4 8-4V6l-8-4z" /><path d="M12 2v20M4 6l8 4 8-4" /></svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 17, color: 'var(--navy-900)' }}>AI Assistant</div>
                <div style={{ fontSize: 11.5, color: 'var(--navy-700)' }}>Ready to help classify</div>
              </div>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-800)', lineHeight: 1.6 }}>Once you paste your abstract in Step 1, the AI will suggest the best research category and match suitable reviewers.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}