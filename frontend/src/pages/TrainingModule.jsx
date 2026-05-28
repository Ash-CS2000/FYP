import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';

const TRAINING_MODULES = [
  {
    id: 'citation-basics',
    title: 'Citation Basics',
    description: 'Learn why citations matter, where to cite, and how references protect academic integrity.',
    track: 'Citation',
    level: 'Beginner',
    accent: 'var(--navy-700)',
    lessons: [
      {
        id: 'why-cite',
        title: 'Why citation matters',
        duration: '6 min',
        content:
          'Citation shows where your ideas came from, gives credit to original authors, and helps readers verify your claims. A strong paper cites sources when using facts, definitions, methods, data, or another author\'s argument.',
      },
      {
        id: 'in-text',
        title: 'In-text citation essentials',
        duration: '8 min',
        content:
          'In-text citations connect a sentence in your paper to a full source in the reference list. For example, APA commonly uses author and year, while IEEE uses numbered brackets that match the reference list.',
      },
      {
        id: 'references',
        title: 'Reference list anatomy',
        duration: '9 min',
        content:
          'A complete reference usually includes author, year, title, publication venue, volume, issue, page range, and DOI or URL when available. Missing details make it harder for readers to find the source.',
      },
    ],
    quiz: {
      question: 'Which detail is most important when citing a journal article?',
      options: ['The author\'s social media handle', 'The DOI or stable source link', 'The color of the journal cover'],
      correctOptionIndex: 1,
    },
  },
  {
    id: 'avoid-plagiarism',
    title: 'Avoiding Plagiarism',
    description: 'Practice paraphrasing, quotation use, source notes, and responsible AI acknowledgement.',
    track: 'Citation',
    level: 'Beginner',
    accent: 'var(--teal-700)',
    lessons: [
      {
        id: 'paraphrase',
        title: 'Paraphrase with control',
        duration: '7 min',
        content:
          'Good paraphrasing changes structure and wording while preserving the original meaning. It still needs a citation because the idea came from another source.',
      },
      {
        id: 'quote',
        title: 'When to quote directly',
        duration: '5 min',
        content:
          'Use direct quotes when the exact wording is important, such as definitions, legal text, or a memorable claim. Keep quotes brief and explain why they matter in your own analysis.',
      },
    ],
    quiz: {
      question: 'If you rewrite a source idea completely in your own words, what should you do?',
      options: ['No citation is needed', 'Cite the source', 'Only cite it if it came from a book'],
      correctOptionIndex: 1,
    },
  },
  {
    id: 'paper-structure',
    title: 'Research Paper Structure',
    description: 'Build a clear manuscript from abstract to conclusion using a journal-ready structure.',
    track: 'Publishing',
    level: 'Intermediate',
    accent: 'var(--amber-700)',
    lessons: [
      {
        id: 'abstract',
        title: 'Write a useful abstract',
        duration: '8 min',
        content:
          'A useful abstract states the problem, method, key result, and contribution. Students should write it last, then revise it so it matches the final paper exactly.',
      },
      {
        id: 'method',
        title: 'Explain your methodology',
        duration: '10 min',
        content:
          'The methodology section should let another researcher understand how the study was conducted. Include data sources, tools, procedures, measures, and analysis approach.',
      },
      {
        id: 'discussion',
        title: 'Turn results into discussion',
        duration: '9 min',
        content:
          'The discussion explains what the results mean, how they compare with previous work, and what limitations should be considered before applying the findings.',
      },
    ],
    quiz: {
      question: 'Which section usually explains how the study was conducted?',
      options: ['Methodology', 'Acknowledgement', 'References'],
      correctOptionIndex: 0,
    },
  },
  {
    id: 'abstract-keywords',
    title: 'Abstracts and Keywords',
    description: 'Understand how abstracts summarize a study and how keywords help readers discover the paper.',
    track: 'Research Literacy',
    level: 'Beginner',
    accent: 'var(--green-700)',
    lessons: [
      {
        id: 'abstract-purpose',
        title: 'What an abstract does',
        duration: '7 min',
        content:
          'An abstract is a short summary of a paper. It helps readers quickly understand the problem, purpose, method, key result, and conclusion before deciding whether to read the full manuscript.',
      },
      {
        id: 'abstract-quality',
        title: 'Judge abstract quality',
        duration: '9 min',
        content:
          'A strong abstract is specific, accurate, and complete. A weak abstract is usually too vague, missing the method or result, or making claims that are not supported by the paper.',
      },
      {
        id: 'keyword-selection',
        title: 'Choose useful keywords',
        duration: '6 min',
        content:
          'Keywords are search terms that describe the main topic, method, field, or population of a paper. Good keywords are specific enough to help discovery but broad enough that other researchers would search for them.',
      },
    ],
    quiz: {
      question: 'Which set of keywords is strongest for a paper about citation training for university students?',
      options: ['Paper, student, thing', 'Academic citation, student learning, plagiarism prevention', 'Research, education, writing, system, module, university, article'],
      correctOptionIndex: 1,
    },
  },
  {
    id: 'read-like-reviewer',
    title: 'Read Like a Reviewer',
    description: 'Learn how reviewers inspect abstracts, methods, results, limitations, and contribution.',
    track: 'Reviewing',
    level: 'Intermediate',
    accent: 'var(--red-700)',
    lessons: [
      {
        id: 'reviewer-first-pass',
        title: 'First-pass reading',
        duration: '8 min',
        content:
          'A reviewer first checks the title, abstract, keywords, introduction, and conclusion to understand the paper quickly. This pass helps identify the research problem, claimed contribution, and whether the paper fits the journal scope.',
      },
      {
        id: 'quality-checks',
        title: 'Check research quality',
        duration: '10 min',
        content:
          'Reviewers look for a clear research problem, relevant literature, suitable methodology, valid results, honest limitations, correct citations, and a meaningful contribution to the field.',
      },
      {
        id: 'constructive-comments',
        title: 'Write constructive criticism',
        duration: '9 min',
        content:
          'Good reviewer comments are specific, polite, and useful. They explain what the issue is, why it matters, and how the author can improve the manuscript.',
      },
    ],
    quiz: {
      question: 'Which reviewer comment is the most constructive?',
      options: ['This paper is bad and confusing.', 'The methodology section should explain the dataset size and selection criteria so readers can judge validity.', 'Reject this because I do not like the topic.'],
      correctOptionIndex: 1,
    },
  },
  {
    id: 'publish-first-paper',
    title: 'Publishing Your First Paper',
    description: 'Follow the path from choosing a venue to submitting, revising, and responding to reviewers.',
    track: 'Publishing',
    level: 'Intermediate',
    accent: 'var(--purple-700)',
    lessons: [
      {
        id: 'venue',
        title: 'Choose the right journal or conference',
        duration: '10 min',
        content:
          'A suitable venue matches your topic, scope, article type, quality level, and timeline. Always review author guidelines, indexing, publication fees, and recent articles before submitting.',
      },
      {
        id: 'submission',
        title: 'Prepare a submission checklist',
        duration: '8 min',
        content:
          'Before submitting, check formatting, word count, references, figures, ethics statements, cover letter, author details, and supplementary files. Many desk rejections come from avoidable preparation issues.',
      },
      {
        id: 'peer-review',
        title: 'Respond to peer review',
        duration: '11 min',
        content:
          'Reviewer responses should be polite, specific, and evidence-based. Create a response table, quote each reviewer concern briefly, explain your change, and point to the revised manuscript section.',
      },
    ],
    quiz: {
      question: 'What is a strong way to answer reviewer comments?',
      options: ['Ignore comments you disagree with', 'Reply politely and explain changes clearly', 'Submit to another journal immediately'],
      correctOptionIndex: 1,
    },
  },
];

function getInitialProgress() {
  return {
    'citation-basics': { completedLessons: ['why-cite', 'in-text'], quizScore: null, completed: false },
    'avoid-plagiarism': { completedLessons: [], quizScore: null, completed: false },
    'paper-structure': { completedLessons: [], quizScore: null, completed: false },
    'abstract-keywords': { completedLessons: [], quizScore: null, completed: false },
    'read-like-reviewer': { completedLessons: [], quizScore: null, completed: false },
    'publish-first-paper': { completedLessons: [], quizScore: null, completed: false },
  };
}

export default function TrainingModule() {
  const [selectedModuleId, setSelectedModuleId] = useState(TRAINING_MODULES[0].id);
  const [selectedLessonId, setSelectedLessonId] = useState(TRAINING_MODULES[0].lessons[0].id);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [progress, setProgress] = useState(getInitialProgress);

  const selectedModule = TRAINING_MODULES.find((module) => module.id === selectedModuleId);
  const moduleProgress = progress[selectedModule.id];
  const selectedLesson = selectedModule.lessons.find((lesson) => lesson.id === selectedLessonId) || selectedModule.lessons[0];

  const overall = useMemo(() => {
    const totalLessons = TRAINING_MODULES.reduce((total, module) => total + module.lessons.length, 0);
    const completedLessons = Object.values(progress).reduce((total, item) => total + item.completedLessons.length, 0);
    const completedModules = Object.values(progress).filter((item) => item.completed).length;

    return {
      completedLessons,
      totalLessons,
      completedModules,
      percent: Math.round((completedLessons / totalLessons) * 100),
    };
  }, [progress]);

  const modulePercent = Math.round((moduleProgress.completedLessons.length / selectedModule.lessons.length) * 100);
  const quizAnswered = moduleProgress.quizScore !== null;
  const selectedLessonIndex = selectedModule.lessons.findIndex((lesson) => lesson.id === selectedLesson.id);
  const nextLesson = selectedModule.lessons[selectedLessonIndex + 1];

  function selectModule(module) {
    setSelectedModuleId(module.id);
    setSelectedLessonId(module.lessons[0].id);
    setSelectedAnswer(null);
  }

  function markLessonComplete() {
    setProgress((current) => {
      const currentModule = current[selectedModule.id];
      const completedLessons = currentModule.completedLessons.includes(selectedLesson.id)
        ? currentModule.completedLessons
        : [...currentModule.completedLessons, selectedLesson.id];
      const completed = completedLessons.length === selectedModule.lessons.length && currentModule.quizScore !== null;

      return {
        ...current,
        [selectedModule.id]: {
          ...currentModule,
          completedLessons,
          completed,
        },
      };
    });
  }

  function goToNextLesson() {
    if (!nextLesson) return;
    setSelectedLessonId(nextLesson.id);
  }

  function submitQuiz() {
    if (selectedAnswer === null) return;

    setProgress((current) => {
      const currentModule = current[selectedModule.id];
      const quizScore = selectedAnswer === selectedModule.quiz.correctOptionIndex ? 100 : 0;
      const completed = currentModule.completedLessons.length === selectedModule.lessons.length;

      return {
        ...current,
        [selectedModule.id]: {
          ...currentModule,
          quizScore,
          completed,
        },
      };
    });
  }

  return (
    <AppShell role="student" searchPlaceholder="Search lessons, citation styles, publishing topics...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Student Training</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Learn to cite, write, and publish with confidence.</h1>
          <p className="page-subtitle">Frontend prototype using mock module, lesson, quiz, and progress data.</p>
        </div>
        <button className="btn btn-primary">Continue Learning</button>
      </div>

      <div className="stat-grid">
        <div className="stat fade-up delay-1" style={{ '--accent': 'var(--navy-700)' }}>
          <div className="stat-label">Overall Progress</div>
          <div className="stat-value">{overall.percent}%</div>
          <div className="stat-trend">{overall.completedLessons} of {overall.totalLessons} lessons completed</div>
        </div>
        <div className="stat fade-up delay-2" style={{ '--accent': 'var(--teal-700)' }}>
          <div className="stat-label">Modules Completed</div>
          <div className="stat-value">{overall.completedModules}</div>
          <div className="stat-trend">Out of {TRAINING_MODULES.length} guided modules</div>
        </div>
        <div className="stat fade-up delay-3" style={{ '--accent': 'var(--amber-700)' }}>
          <div className="stat-label">Current Focus</div>
          <div className="stat-value" style={{ fontSize: 30 }}>{selectedModule.track}</div>
          <div className="stat-trend">{selectedModule.level} learning path</div>
        </div>
      </div>

      <div className="training-layout">
        <aside className="training-path fade-up delay-2">
          <div className="training-path-header">
            <div className="label">Modules</div>
            <div className="training-path-count">{TRAINING_MODULES.length}</div>
          </div>

          <div className="training-module-list">
            {TRAINING_MODULES.map((module, index) => {
              const itemProgress = progress[module.id];
              const percent = Math.round((itemProgress.completedLessons.length / module.lessons.length) * 100);
              const isActive = module.id === selectedModule.id;

              return (
                <button
                  className={`training-module-card ${isActive ? 'active' : ''}`}
                  key={module.id}
                  type="button"
                  onClick={() => selectModule(module)}
                >
                  <div className="training-module-index" style={{ '--accent': module.accent }}>
                    {itemProgress.completed ? 'OK' : String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="training-module-summary">
                    <div className="training-module-title">{module.title}</div>
                    <div className="training-module-meta">{module.track} · {module.lessons.length} lessons</div>
                    <div className="progress" style={{ '--accent': module.accent }}>
                      <div className="progress-fill" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                  <div className="training-module-percent">
                    {percent}%
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="training-workspace fade-up delay-3">
          <div className="training-workspace-header">
            <div>
              <span className="eyebrow">{selectedModule.track}</span>
              <h2>{selectedModule.title}</h2>
              <p>{selectedModule.description}</p>
            </div>
            <div className="training-progress-ring" style={{ '--accent': selectedModule.accent }}>
              <strong>{modulePercent}%</strong>
              <span>module</span>
            </div>
          </div>

          <div className="training-lesson-grid">
            <div className="training-lessons">
              {selectedModule.lessons.map((lesson) => {
                const completed = moduleProgress.completedLessons.includes(lesson.id);
                const active = lesson.id === selectedLesson.id;

                return (
                  <button
                    type="button"
                    className={`training-lesson-item ${active ? 'active' : ''}`}
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                  >
                    <span className={completed ? 'lesson-check done' : 'lesson-check'}>{completed ? 'OK' : ''}</span>
                    <span>
                      <strong>{lesson.title}</strong>
                      <small>{lesson.duration}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <article className="training-lesson-panel">
              <div className="training-lesson-heading">
                <div>
                  <span className="label">Lesson Content</span>
                  <h3>{selectedLesson.title}</h3>
                </div>
                <span className="pill pill-pending">{selectedLesson.duration}</span>
              </div>
              <p>{selectedLesson.content}</p>

              <div className="training-example">
                <div className="feedback-label">Practice prompt</div>
                <div className="feedback-text">
                  Write one sentence from your own research topic that would need a citation, then identify which source detail you still need to collect.
                </div>
              </div>

              <div className="training-lesson-actions">
                <button className="btn btn-success" type="button" onClick={markLessonComplete}>
                  Mark Lesson Complete
                </button>
                <button className="btn btn-ghost" type="button" onClick={goToNextLesson} disabled={!nextLesson}>
                  Next Lesson
                </button>
              </div>
            </article>
          </div>

          <div className="training-quiz">
            <div className="training-quiz-header">
              <div>
                <span className="label">Module Quiz</span>
                <h3>Check your understanding</h3>
              </div>
              {quizAnswered && (
                <span className={moduleProgress.quizScore === 100 ? 'pill pill-approved' : 'pill pill-rejected'}>
                  Score {moduleProgress.quizScore}%
                </span>
              )}
            </div>

            <p>{selectedModule.quiz.question}</p>
            <div className="quiz-options">
              {selectedModule.quiz.options.map((option, index) => (
                <button
                  type="button"
                  className={`quiz-option ${selectedAnswer === index ? 'selected' : ''}`}
                  key={option}
                  onClick={() => setSelectedAnswer(index)}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  {option}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" type="button" onClick={submitQuiz} disabled={selectedAnswer === null}>
              Submit Answer
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
