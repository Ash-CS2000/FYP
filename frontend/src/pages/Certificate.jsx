import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { getProgress, publicationState } from '../data/trainingProgress.js';
import { TRAINING_UNITS, PUBLICATION_WINDOW_DAYS } from '../data/trainingContent.js';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function Certificate() {
  const progress = getProgress();
  const cert = progress.certificate;

  if (!cert) {
    const pub = publicationState(progress);

    // Passed the assessment but has not yet submitted the required paper.
    if (progress.assessment.passed && pub.status === 'pending') {
      return (
        <AppShell role="author" searchPlaceholder="Search...">
          <div className="page-header fade-up">
            <div>
              <span className="eyebrow">Certificate</span>
              <h1 className="page-title" style={{ marginTop: 8 }}>One step <em className="serif-italic">away</em>.</h1>
              <p className="page-subtitle">Your certificate is reserved — submit your research paper to unlock it.</p>
            </div>
          </div>
          <div className="card fade-up delay-1 exam-locked">
            <div className="unit-locked-icon">📄</div>
            <h2>Submit your research paper</h2>
            <p>
              You passed the final assessment. To complete your certification, submit one research
              paper through JSRMS — your certificate is issued as soon as you submit.
            </p>

            <div className="unit-todo-banner" style={{ marginTop: 4 }}>
              <strong>What&apos;s left</strong>
              <span className="todo">Submit one research paper through JSRMS</span>
              {pub.deadline && (
                <span className="todo">
                  Recommended by {formatDate(pub.deadline)} (~{PUBLICATION_WINDOW_DAYS} days) — no hard deadline
                </span>
              )}
            </div>

            <div className="row" style={{ marginTop: 18, gap: 12 }}>
              <Link to="/author/submit" className="btn btn-primary">Submit Your Paper →</Link>
              <Link to="/author/progress" className="btn btn-ghost">View Progress</Link>
            </div>
          </div>
        </AppShell>
      );
    }

    return (
      <AppShell role="author" searchPlaceholder="Search...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Certificate</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>Your <em className="serif-italic">certificate</em>.</h1>
            <p className="page-subtitle">Earn your certificate by completing the training, passing the final assessment, and submitting one research paper.</p>
          </div>
        </div>
        <div className="card fade-up delay-1 exam-locked">
          <div className="unit-locked-icon">🎓</div>
          <h2>No certificate yet</h2>
          <p>Pass the final assessment and submit your research paper, and your certificate will appear here, ready to view and print.</p>
          <Link to="/author/training" className="btn btn-primary">Go to Training →</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="author" searchPlaceholder="Search...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Certificate</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Your <em className="serif-italic">certificate</em>.</h1>
          <p className="page-subtitle">You are now qualified to submit research for publication on JSRMS.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="certificate-wrap fade-up delay-1">
        <div className="certificate">
          <div className="certificate-border">
            <div className="certificate-seal">JSRMS</div>
            <div className="certificate-eyebrow">Journal Submission &amp; Review Management System</div>
            <h2 className="certificate-title">Certificate of Completion</h2>
            <p className="certificate-intro">This is to certify that</p>
            <div className="certificate-name">{cert.name}</div>
            <p className="certificate-body">
              has successfully completed the JSRMS Student Research Publishing Training Programme,
              covering academic publishing, research paper structure, academic writing standards,
              and use of the JSRMS submission system, has passed the final certification assessment,
              and has submitted an original research paper through JSRMS.
            </p>

            <div className="certificate-units">
              {TRAINING_UNITS.map((unit) => (
                <span key={unit.id} className="certificate-unit-chip">{unit.title}</span>
              ))}
            </div>

            <div className="certificate-footer">
              <div className="certificate-sign">
                <div className="certificate-sign-line">Training Coordinator</div>
                <div className="certificate-sign-name">JSRMS Academic Office</div>
              </div>
              <div className="certificate-meta">
                <div><span>Certificate ID</span>{cert.id}</div>
                <div><span>Date Issued</span>{formatDate(cert.issuedAt)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card fade-up delay-2" style={{ marginTop: 22 }}>
        <div className="card-header">
          <div>
            <div className="card-title">What you can do now</div>
            <div className="card-meta">Your certificate unlocks full author features.</div>
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <Link to="/author/submit" className="btn btn-primary">Submit Your First Paper →</Link>
          <Link to="/author/papers" className="btn btn-ghost">Browse Published Papers</Link>
        </div>
      </div>
    </AppShell>
  );
}
