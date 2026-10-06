// /reviewer/guidelines — where the reviewer's Help link goes.

import AppShell from '../components/AppShell.jsx';
import ReviewerGuidelines from '../components/ReviewerGuidelines.jsx';

export default function ReviewerGuidelinesPage() {
  return (
    <AppShell role="reviewer" searchPlaceholder="Search your assignments...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Help</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Reviewer <em className="serif-italic">guidelines</em>.</h1>
          <p className="page-subtitle">How to score a manuscript and write a report the authors can act on.</p>
        </div>
      </div>
      <div className="card fade-up delay-1" style={{ maxWidth: 820 }}>
        <ReviewerGuidelines />
      </div>
    </AppShell>
  );
}
