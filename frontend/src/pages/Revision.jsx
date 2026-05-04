import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';

export default function Revision() {
  const [tab, setTab] = useState('r1');
  const navigate = useNavigate();

  const handleSubmit = () => {
    alert('Revision submitted. Reviewers will be notified.');
    navigate('/author/dashboard');
  };

  return (
    <AppShell role="author" searchPlaceholder="Search...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Revision Required · MS-2025-187</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>A Framework for IoT Security in <em className="serif-italic">Smart Cities</em>.</h1>
          <p className="page-subtitle">Reviewers have requested changes before publication. Please address their feedback below.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="pill pill-revision">Revision Needed</span>
          <span className="pill pill-pending">Due in 14 days</span>
        </div>
      </div>

      <div className="split-grid fade-up delay-1" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <div className="gap-grid">
          <div className="card">
            <div className="card-header"><div><div className="card-title">Reviewer Feedback</div><div className="card-meta">3 reviewers provided detailed comments.</div></div></div>
            <div className="tabs">
              {[
                { id: 'r1', label: 'Reviewer 1', count: 8 },
                { id: 'r2', label: 'Reviewer 2', count: 3 },
                { id: 'r3', label: 'Reviewer 3', count: 5 },
                { id: 'editor', label: 'Editor Notes', count: 2 },
              ].map(t => (
                <div key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label} <span className="count">{t.count}</span></div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, padding: '14px 16px', background: 'var(--ink-50)', borderRadius: 'var(--r-md)' }}>
              <div className="avatar">DC</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 14 }}>Dr. David Chen</div>
                <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>Senior Reviewer · Engineering · Verdict: Major Revision</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{ color: 'var(--amber-500)', fontSize: 18 }}>★★★★</span>
                <span style={{ color: 'var(--ink-300)', fontSize: 18 }}>★</span>
              </div>
            </div>

            {[
              { label: 'Comment 1 · Methodology', text: '"The methodology section needs more detail on the data collection process. Specifically, please clarify how the IoT devices were selected for testing and what criteria you used to ensure representativeness across different smart city deployments."', loc: 'Section 3.2, page 7' },
              { label: 'Comment 2 · Statistical Analysis', text: '"The statistical tests used to validate the security framework are not clearly described. Please specify the significance levels, the chosen tests (chi-square, t-test, etc.), and provide effect sizes alongside p-values."', loc: 'Section 4.1, pages 12-14' },
              { label: 'Comment 3 · Literature Review', text: '"Recent work by Tan et al. (2024) and Ahmad & Rahman (2025) should be discussed in the literature review. They cover related themes on edge security in smart-city IoT."', loc: 'Section 2, pages 3-5' },
            ].map((c, i) => (
              <div key={i} className="feedback-box" style={{ marginBottom: 16 }}>
                <div className="feedback-label">{c.label}</div>
                <div className="feedback-text">{c.text}</div>
                <div className="feedback-author">{c.loc}</div>
              </div>
            ))}

            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}>Show 5 more comments ↓</button>
          </div>

          <div className="card">
            <div className="card-header"><div><div className="card-title">Your Response</div><div className="card-meta">Address each reviewer comment in your response letter.</div></div></div>
            <div className="field">
              <label className="field-label">Response to reviewers <span className="req">*</span></label>
              <textarea className="field-textarea" rows="8" defaultValue="We sincerely thank the reviewers for their thorough and constructive feedback. We have addressed each comment as follows:

1. Methodology (Reviewer 1, Comment 1): We have expanded Section 3.2 to include detailed criteria for IoT device selection. The new content covers device categories, geographic distribution, and rationale for representativeness across three smart city deployments..." />
              <div className="field-hint">Reference each comment by reviewer and number. Be specific about what you changed.</div>
            </div>
            <div className="field">
              <label className="field-label">Upload revised manuscript <span className="req">*</span></label>
              <div className="upload-area">
                <div className="upload-area-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                </div>
                <div className="upload-area-title">Drop your revised PDF here</div>
                <div className="upload-area-meta">PDF only · Max 20MB · Highlight changes recommended</div>
              </div>
            </div>
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--ink-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-ghost">Save Draft</button>
              <button onClick={handleSubmit} className="btn btn-accent">Submit Revision →</button>
            </div>
          </div>
        </div>

        <div className="gap-grid">
          <div className="card">
            <div className="card-header"><div className="card-title">Revision Timeline</div></div>
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 1, background: 'var(--ink-200)' }}></div>
              {[
                { color: 'var(--teal-500)', title: 'Initial Submission', sub: '22 Oct 2025', dashed: false },
                { color: 'var(--teal-500)', title: 'All Reviews Submitted', sub: '3 reviewers · 18 Apr 2026', dashed: false },
                { color: 'var(--amber-500)', title: 'Revision Requested', sub: '2 May 2026', dashed: false },
                { color: null, title: 'Revision Submitted', sub: 'Due by 17 May 2026', dashed: true },
                { color: null, title: 'Final Decision', sub: 'Pending revision', dashed: true },
              ].map((step, i, arr) => (
                <div key={i} style={{ position: 'relative', paddingBottom: i === arr.length - 1 ? 0 : 20 }}>
                  <div style={{ position: 'absolute', left: -22, top: 4, width: 14, height: 14, borderRadius: '50%', background: step.dashed ? 'var(--white)' : step.color, border: step.dashed ? '2px dashed var(--ink-400)' : `3px solid var(--white)`, boxShadow: step.dashed ? 'none' : `0 0 0 2px ${step.color}` }}></div>
                  <div style={{ fontWeight: step.dashed ? 500 : 600, fontSize: 13.5, color: step.dashed ? 'var(--ink-600)' : 'var(--navy-900)' }}>{step.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{step.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Review Verdict</div></div>
            {[
              { initials: 'DC', name: 'Dr. David Chen', verdict: 'Major Revision', cls: 'pill-revision' },
              { initials: 'SR', name: 'Dr. Sarah Rahman', verdict: 'Minor Revision', cls: 'pill-review' },
              { initials: 'JT', name: 'Prof. James Tan', verdict: 'Accept', cls: 'pill-approved' },
            ].map((r, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div className="row" style={{ marginBottom: 6, alignItems: 'center' }}>
                  <div className="avatar avatar-sm" style={{ marginRight: 8 }}>{r.initials}</div>
                  <span style={{ fontSize: 13, color: 'var(--ink-800)', fontWeight: 500 }}>{r.name}</span>
                  <span className="spacer"></span>
                  <span className={`pill ${r.cls}`}>{r.verdict}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
