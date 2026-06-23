import AppShell from '../components/AppShell.jsx';

const RESOURCE_GROUPS = [
  {
    group: 'Writing Aids',
    items: [
      { title: 'IMRaD Structure Map', desc: 'A one-page map of what belongs in the Introduction, Methods, Results, and Discussion.' },
      { title: 'Abstract Builder Checklist', desc: 'Problem, method, key result, and contribution — the four parts every abstract needs.' },
      { title: 'Introduction Four-Beat Template', desc: 'Context, problem, gap, contribution — fill in each beat to draft a strong introduction.' },
      { title: 'Keyword Selection Guide', desc: 'How to choose 4–6 searchable keywords without being too broad or too narrow.' },
    ],
  },
  {
    group: 'Integrity & Citation',
    items: [
      { title: 'Citation Quick Guide (APA / IEEE / Harvard)', desc: 'Side-by-side examples of in-text citations and reference list entries.' },
      { title: 'Paraphrasing vs Patchwriting', desc: 'Worked examples showing a proper paraphrase next to one that is still plagiarism.' },
      { title: 'AI Use Disclosure Template', desc: 'A short statement you can adapt to disclose how you used AI tools in your work.' },
    ],
  },
  {
    group: 'Reviewing',
    items: [
      { title: 'Reviewer Report Template', desc: 'Summary, major issues, minor issues, and recommendation — ready to fill in.' },
      { title: 'First-Pass Reading Checklist', desc: 'What to look at first and how to write a 4–5 sentence summary of any paper.' },
      { title: 'Constructive Comment Examples', desc: 'Weak vs strong reviewer comments, so you can see what useful feedback looks like.' },
    ],
  },
  {
    group: 'Submission',
    items: [
      { title: 'Pre-Submission Checklist', desc: 'Formatting, word count, references, figures, author details, and ethics statements.' },
      { title: 'Cover Letter Template', desc: 'A short, editor-friendly cover letter you can adapt for your own paper.' },
      { title: 'Reviewer Response Table', desc: 'Quote each comment, say what you changed, and point to where — in one tidy table.' },
    ],
  },
];

export default function StudentResources() {
  return (
    <AppShell role="student" searchPlaceholder="Search templates, checklists, and guides...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Student Resources</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Templates and <em className="serif-italic">study aids</em>.</h1>
          <p className="page-subtitle">Reference materials that support every unit of the training programme.</p>
        </div>
      </div>

      {RESOURCE_GROUPS.map((group, gi) => (
        <div className={`fade-up delay-${Math.min(gi + 1, 3)}`} key={group.group} style={{ marginBottom: 26 }}>
          <div className="portal-toolbar" style={{ marginBottom: 14 }}>
            <div>
              <div className="card-title">{group.group}</div>
              <div className="card-meta">{group.items.length} resources</div>
            </div>
          </div>
          <div className="index-grid">
            {group.items.map((resource, index) => (
              <div className="index-card" key={resource.title}>
                <div className="index-card-num">{String(index + 1).padStart(2, '0')} · {group.group}</div>
                <div className="index-card-title">{resource.title}</div>
                <div className="index-card-desc">{resource.desc}</div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>Download</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </AppShell>
  );
}
