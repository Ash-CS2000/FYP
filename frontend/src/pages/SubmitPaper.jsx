import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';

export default function SubmitPaper() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      alert('Paper submitted successfully! Redirecting to your dashboard.');
      navigate('/author/dashboard');
    }
  };

  return (
    <AppShell role="author" searchPlaceholder="Search...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">New Submission</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Submit a <em className="serif-italic">new paper</em>.</h1>
          <p className="page-subtitle">Tell us about your research. Our AI will help classify it and match it to qualified reviewers.</p>
        </div>
        <Link to="/author/dashboard" className="btn btn-ghost btn-sm">← Back to Dashboard</Link>
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
                <input className="field-input" type="text" defaultValue="Deep Learning Methods in Medical Imaging: A Comparative Study" />
                <div className="field-hint">Use the final title you'd like to appear in publication. You can edit later.</div>
              </div>
              <div className="field">
                <label className="field-label">Abstract <span className="req">*</span></label>
                <textarea className="field-textarea" rows="6" defaultValue="This study compares contemporary deep learning architectures—specifically convolutional, transformer, and hybrid models—on three medical imaging benchmarks. We propose a unified evaluation framework that incorporates clinical reliability metrics alongside conventional accuracy measures..." />
                <div className="field-hint ai">AI suggestion: <strong style={{ marginLeft: 4 }}>Computer Science · Artificial Intelligence & Machine Learning</strong> (92% confidence)</div>
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
                <input className="field-input" type="text" defaultValue="deep learning, medical imaging, CNN, transformers, healthcare AI" />
                <div className="field-hint">Add 4–6 keywords. These help with discoverability and reviewer matching.</div>
              </div>
              <div className="field">
                <label className="field-label">Co-authors</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 10, border: '1px dashed var(--ink-300)', borderRadius: 'var(--r-md)', background: 'var(--ink-50)' }}>
                  {['Dr. Sarah Rahman', 'Prof. John Chen'].map(name => (
                    <div key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px', background: 'var(--white)', border: '1px solid var(--ink-200)', borderRadius: 'var(--r-pill)', fontSize: 13 }}>
                      <span className="avatar avatar-sm">{name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
                      <span style={{ fontWeight: 500, color: 'var(--navy-900)' }}>{name}</span>
                      <span style={{ color: 'var(--ink-500)', cursor: 'pointer' }}>×</span>
                    </div>
                  ))}
                  <button style={{ padding: '5px 14px', background: 'transparent', border: '1px dashed var(--ink-400)', borderRadius: 'var(--r-pill)', fontSize: 13, color: 'var(--navy-700)', fontWeight: 500 }}>+ Add author</button>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="field">
                <label className="field-label">Manuscript PDF <span className="req">*</span></label>
                <div className="upload-area">
                  <div className="upload-area-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                  </div>
                  <div className="upload-area-title">Drop your manuscript PDF here</div>
                  <div className="upload-area-meta">PDF only · Max 20MB</div>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Cover letter (optional)</label>
                <textarea className="field-textarea" rows="4" placeholder="A short note to the editor..."></textarea>
              </div>
              <div className="field">
                <label className="field-label">Supplementary files</label>
                <div className="upload-area" style={{ padding: 24 }}>
                  <div className="upload-area-meta">Datasets, code repositories, or additional figures (zip preferred)</div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 18, background: 'var(--ink-50)', borderRadius: 'var(--r-md)' }}>
                <div className="label" style={{ marginBottom: 6 }}>Title</div>
                <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 15 }}>Deep Learning Methods in Medical Imaging: A Comparative Study</div>
              </div>
              <div style={{ padding: 18, background: 'var(--ink-50)', borderRadius: 'var(--r-md)' }}>
                <div className="label" style={{ marginBottom: 6 }}>Category</div>
                <div style={{ fontWeight: 500, color: 'var(--navy-900)', fontSize: 14 }}>Computer Science · AI & ML</div>
              </div>
              <div style={{ padding: 18, background: 'var(--ink-50)', borderRadius: 'var(--r-md)' }}>
                <div className="label" style={{ marginBottom: 6 }}>Authors</div>
                <div style={{ fontSize: 14, color: 'var(--navy-900)' }}>Ahmad Razif (you), Dr. Sarah Rahman, Prof. John Chen</div>
              </div>
              <div style={{ padding: 18, background: 'var(--green-50)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--green-800)" strokeWidth="2.5" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
                <div style={{ fontSize: 13.5, color: 'var(--green-800)' }}>All required fields complete. Ready to submit.</div>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 2L4 6v12l8 4 8-4V6l-8-4z"/><path d="M12 2v20M4 6l8 4 8-4"/></svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 17, color: 'var(--navy-900)', letterSpacing: '-0.01em' }}>AI Assistant</div>
                <div style={{ fontSize: 11.5, color: 'var(--navy-700)' }}>Reading your abstract...</div>
              </div>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-800)', lineHeight: 1.6, marginBottom: 12 }}>Based on your abstract, we suggest classifying this paper under <strong>Computer Science — AI & ML</strong>.</p>
            <div style={{ background: 'var(--white)', borderRadius: 'var(--r-md)', padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-600)' }}>Confidence</span>
                <span style={{ fontWeight: 600, color: 'var(--teal-700)' }}>92%</span>
              </div>
              <div className="progress" style={{ '--accent': 'var(--teal-500)' }}><div className="progress-fill" style={{ width: '92%' }}></div></div>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.5 }}>We'll match your paper with reviewers experienced in medical imaging and convolutional networks.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
