import AppShell from '../components/AppShell.jsx';

const RESOURCES = [
  {
    title: 'Abstract Checklist',
    type: 'Writing Aid',
    description: 'Problem, objective, method, result, and conclusion checklist for student manuscripts.',
  },
  {
    title: 'Keyword Selection Guide',
    type: 'Discovery',
    description: 'A quick guide for choosing 4-6 searchable keywords without becoming too broad.',
  },
  {
    title: 'Reviewer Comment Template',
    type: 'Reviewing',
    description: 'A structured template for summary, strengths, major comments, minor comments, and recommendation.',
  },
  {
    title: 'Submission Readiness Checklist',
    type: 'Publishing',
    description: 'Final checks for references, figures, author details, ethics statements, and journal formatting.',
  },
];

export default function StudentResources() {
  return (
    <AppShell role="student" searchPlaceholder="Search templates, checklists, and guides...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Student Resources</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Templates and study aids.</h1>
          <p className="page-subtitle">Reference materials that support the training modules.</p>
        </div>
      </div>

      <div className="index-grid fade-up delay-1">
        {RESOURCES.map((resource, index) => (
          <div className="index-card" key={resource.title}>
            <div className="index-card-num">{String(index + 1).padStart(2, '0')} · {resource.type}</div>
            <div className="index-card-title">{resource.title}</div>
            <div className="index-card-desc">{resource.description}</div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
