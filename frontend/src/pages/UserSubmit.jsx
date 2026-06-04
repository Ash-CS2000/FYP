import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { getProgress, countCompletedUnits } from '../data/trainingProgress.js';
import { TRAINING_UNITS } from '../data/trainingContent.js';

export default function UserSubmit() {
  const navigate = useNavigate();
  const progress = getProgress();
  const certified = !!progress.certificate;
  const completedUnits = countCompletedUnits(progress);

  const [step, setStep] = useState(1);

  // ---- Gated (not certified) ----------------------------------------------
  if (!certified) {
    const unitsPercent = Math.round((completedUnits / TRAINING_UNITS.length) * 100);
    return (
      <AppShell role="user" searchPlaceholder="Search...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Submit Research</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>
              Submit a <em className="serif-italic">paper</em>.
            </h1>
            <p className="page-subtitle">Paper submission unlocks after you earn your training certificate.</p>
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
            <Link to="/user/training" className="btn btn-primary">Continue Training →</Link>
            <Link to="/user/assessment" className="btn btn-ghost">Go to Final Assessment</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---- Certified: submission form -----------------------------------------
  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      alert('Paper submitted successfully! Our reviewers will be in touch.');
      navigate('/user/papers');
    }
  };

  return (
    <AppShell role="user" searchPlaceholder="Search...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">New Submission</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Submit a <em className="serif-italic">new paper</em>.</h1>
          <p className="page-subtitle">You are certified — tell us about your research and our AI will help classify it.</p>
        </div>
        <span className="pill pill-approved">Certified ✓</span>
      </div>

      <div className="steps fade-up delay-1">
        {[
          { n: 1, title: 'Paper Details', sub: 'Title, abstract, and authors' },
          { n: 2, title: 'Upload Manuscript', sub: 'PDF and supporting files' },
          { n: 3, title: 'Review & Submit', sub: 'Confirm and send' },
        ].map((s) => (
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
              <div className="card-title">Step {step} — {step === 1 ? 'Paper Details' : step === 2 ? 'Upload Manuscript' : 'Review & Submit'}</div>
              <div className="card-meta">{step === 1 && 'All fields marked * are required.'}{step === 2 && 'Upload your manuscript and any supporting files.'}{step === 3 && 'Review everything before submitting.'}</div>
            </div>
          </div>

          {step === 1 && (
            <>
              <div className="field">
                <label className="field-label">Paper title <span className="req">*</span></label>
                <input className="field-input" type="text" placeholder="Enter your paper title" />
                <div className="field-hint">Use the final title you would like to appear in publication.</div>
              </div>
              <div className="field">
                <label className="field-label">Abstract <span className="req">*</span></label>
                <textarea className="field-textarea" rows="6" placeholder="Paste your abstract here..."></textarea>
                <div className="field-hint ai">AI suggestion will appear here based on your abstract.</div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label className="field-label">Research category <span className="req">*</span></label>
                  <select className="field-select"><option>Computer Science — AI & ML</option><option>Computer Science — Software Engineering</option><option>Engineering — Electronics</option><option>Medicine — Imaging</option></select>
                </div>
                <div className="field">
                  <label className="field-label">Sub-category</label>
                  <select className="field-select"><option>Medical Imaging</option><option>Computer Vision</option><option>Neural Networks</option></select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Keywords</label>
                <input className="field-input" type="text" placeholder="4–6 keywords, comma separated" />
                <div className="field-hint">These help with discoverability and reviewer matching.</div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="field">
                <label className="field-label">Manuscript PDF <span className="req">*</span></label>
                <div className="upload-area">
                  <div className="upload-area-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                  </div>
                  <div className="upload-area-title">Drop your manuscript PDF here</div>
                  <div className="upload-area-meta">PDF only · Max 20MB</div>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Cover letter (optional)</label>
                <textarea className="field-textarea" rows="4" placeholder="A short note to the editor..."></textarea>
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 18, background: 'var(--green-50)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--green-800)" strokeWidth="2.5" width="20" height="20"><polyline points="20 6 9 17 4 12" /></svg>
                <div style={{ fontSize: 13.5, color: 'var(--green-800)' }}>You are a certified author. Your submission is ready to send.</div>
              </div>
              <div style={{ padding: 18, background: 'var(--ink-50)', borderRadius: 'var(--r-md)' }}>
                <div className="label" style={{ marginBottom: 6 }}>Reminder</div>
                <div style={{ fontSize: 14, color: 'var(--navy-900)' }}>Check your formatting, references, and author details one more time before submitting.</div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--ink-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="row">
              {step > 1 && <button onClick={() => setStep(step - 1)} className="btn btn-ghost">← Back</button>}
              <button className="btn btn-ghost">Save as Draft</button>
            </div>
            <div className="row">
              <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>Step {step} of 3</span>
              <button onClick={handleNext} className="btn btn-primary">{step === 3 ? 'Submit Paper →' : 'Continue →'}</button>
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
