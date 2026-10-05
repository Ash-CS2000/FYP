// src/components/ReviewerGuidelines.jsx
// What a good review looks like on PaperBridge: the scoring rubric and the
// writing guidance. Shown on /reviewer/guidelines (the reviewer's Help link)
// and, collapsed, beside the review form.

import { RATING_CRITERIA } from '../data/reviews.js';

const WRITING_GUIDANCE = [
  'Be specific. Point to the section, figure or equation, and say what would fix it.',
  'Separate major issues (would change the conclusions) from minor ones (presentation, typos).',
  'Be constructive and courteous — write as you would want to be reviewed.',
  'Judge the work, not the authors. Do not try to work out who they are.',
  'Keep the manuscript confidential. Do not share it or use its ideas before publication.',
];

export default function ReviewerGuidelines({ compact = false }) {
  return (
    <div className="rg">
      <style>{`
        .rg-h { font-size: 12px; font-weight: 700; color: var(--ink-600); text-transform: uppercase; letter-spacing: .06em; margin: 18px 0 8px; }
        .rg-h:first-child { margin-top: 0; }
        .rg-criterion { margin-bottom: 12px; }
        .rg-criterion-name { font-weight: 600; font-size: 13.5px; color: var(--navy-900); margin-bottom: 4px; }
        .rg-anchor { display: grid; grid-template-columns: 22px 1fr; gap: 8px; font-size: 12.5px; color: var(--ink-700); line-height: 1.5; padding: 2px 0; }
        .rg-anchor strong { color: var(--navy-900); }
        .rg-list { margin: 0; padding-left: 18px; font-size: 13px; color: var(--ink-700); line-height: 1.65; }
        .rg-note { font-size: 13px; color: var(--ink-700); line-height: 1.6; }
      `}</style>

      <div className="rg-h">Scoring rubric</div>
      <p className="rg-note" style={{ marginBottom: 10 }}>
        Each score is 1–5. Use these anchors so a 3 means the same thing from every reviewer;
        2 and 4 sit between them.
      </p>
      {RATING_CRITERIA.map(c => (
        <div key={c.key} className="rg-criterion">
          <div className="rg-criterion-name">{c.label}</div>
          {[1, 3, 5].map(n => (
            <div key={n} className="rg-anchor"><strong>{n}</strong><span>{c.rubric[n]}</span></div>
          ))}
        </div>
      ))}

      <div className="rg-h">Writing the report</div>
      <ul className="rg-list">
        {WRITING_GUIDANCE.map(line => <li key={line}>{line}</li>)}
      </ul>

      {!compact && (
        <>
          <div className="rg-h">What the author sees</div>
          <p className="rg-note">
            Your summary, strengths and weaknesses, once the editor has made a decision — under a
            label such as “Reviewer 2”, never your name. Your scores and recommendation go to the
            editor only.
          </p>
        </>
      )}

      <div className="rg-h">Confidential comments</div>
      <p className="rg-note">
        Only the editor reads these. Use them for suspected overlap with prior work, ethical
        concerns, or anything you would not say to the authors directly. A conflict of interest
        goes in the conflict box on the review form instead, so the editor is notified.
      </p>
    </div>
  );
}
