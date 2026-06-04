// JSRMS Student Training Curriculum
// Five progressive units. Each unit: lectures (lessons) + a multi-question quiz
// + one writing exercise.
// Passing a unit requires: all lessons read + quiz >= PASS_MARK + writing exercise submitted.
//
// Content informed by established research-publishing and peer-review training
// programmes (IMRaD writing guides, journal reviewer labs, university
// scientific-writing centres), rewritten in clear, student-friendly English.

export const PASS_MARK = 70;            // unit quiz pass mark (percent)
export const ASSESSMENT_PASS_MARK = 75; // final exam pass mark (percent)
export const ASSESSMENT_QUESTION_COUNT = 25;
export const MAX_ASSESSMENT_ATTEMPTS = 3;

export const TRAINING_UNITS = [
  // ===================================================================
  // UNIT 1 — Understanding Academic Publishing
  // ===================================================================
  {
    id: 'unit-1',
    order: 1,
    title: 'Understanding Academic Publishing',
    track: 'Foundations',
    accent: 'var(--navy-700)',
    summary:
      'Learn what academic journals are, why publishing matters for students, the full life of a paper, and how peer review keeps research trustworthy.',
    lessons: [
      {
        id: 'u1-what-is-journal',
        title: 'What is an academic journal?',
        duration: '6 min',
        content:
          'An academic journal is a publication where researchers share new findings with their field. Journals are different from magazines, blogs, or normal websites because every article is checked by other experts before it is published. Journals vary in scope: some cover a narrow topic, others are broad. Some are "open access" (free for anyone to read), while others sit behind a subscription. Conferences also publish research, usually as shorter papers linked to an event. Each journal has an "aim and scope" statement that tells you what kind of work it accepts \u2014 always read it before submitting.',
        takeaway:
          'Journals publish expert-checked research. Check a journal\u2019s aim and scope to see if your work fits.',
      },
      {
        id: 'u1-why-publish',
        title: 'Why publishing matters for students',
        duration: '6 min',
        content:
          'Publishing your research helps others learn from your work, builds your academic profile, and can strengthen scholarship, internship, or postgraduate applications. For students, publishing is also a way to get structured feedback from experienced researchers and to practise communicating ideas clearly. Many strong student projects are never shared simply because the student did not know how the process works. Learning the process early removes that barrier and gives your work a real chance to reach an audience.',
        takeaway:
          'Publishing builds your profile, earns you expert feedback, and lets your work reach real readers.',
      },
      {
        id: 'u1-lifecycle',
        title: 'The life of a paper, step by step',
        duration: '8 min',
        content:
          'A paper moves through clear stages. First you write and prepare the manuscript. You submit it to one journal (never several at once \u2014 that is called duplicate submission and is not allowed). An editor does an initial check to see if it fits the journal; if not, it may be "desk rejected" without review. If it passes, the editor invites reviewers. Reviewers send back reports and a recommendation. The editor weighs these and makes a decision: accept, minor revision, major revision, or reject. Most papers need at least one round of revision before acceptance. After acceptance, the paper is copy-edited, typeset, and published.',
        takeaway:
          'Write \u2192 submit to one journal \u2192 editor check \u2192 review \u2192 decision \u2192 revise \u2192 publish. Revision is normal.',
      },
      {
        id: 'u1-peer-review',
        title: 'How peer review works',
        duration: '8 min',
        content:
          'Peer review is the process where independent experts read your paper and judge whether it is sound and worth publishing. Reviewers check whether the research question is clear, the method is appropriate, the results support the claims, and the limitations are honest. There are different models: in single-blind review the reviewers know who the author is but not the reverse; in double-blind review neither side knows the other\u2019s identity, which helps reduce bias; in open review identities are known to everyone. The editor, not the reviewer, makes the final decision.',
        takeaway:
          'Peer review = independent experts check quality. Double-blind hides both identities to reduce bias.',
      },
      {
        id: 'u1-ethics-intro',
        title: 'Publication ethics basics',
        duration: '7 min',
        content:
          'Good publishing rests on honesty. Some core rules: do not fabricate or change data; do not plagiarise; submit to only one journal at a time; and list as authors only the people who genuinely contributed to the work. Everyone who made a real contribution should be credited, and no one should be added just as a favour ("gift authorship"). If you reuse figures or text from another source, you need permission and a citation. Following these rules protects your reputation and the trust readers place in published research.',
        takeaway:
          'Be honest with data, never plagiarise, submit to one journal, and credit only real contributors.',
      },
    ],
    quiz: [
      {
        id: 'u1-q1',
        question: 'What makes an academic journal different from a normal website or magazine?',
        options: [
          'It uses more pictures',
          'Every article is checked by other experts before publishing',
          'It is always free to read',
          'It is written by professional journalists',
        ],
        correctIndex: 1,
      },
      {
        id: 'u1-q2',
        question: 'In a double-blind review, what is kept hidden?',
        options: [
          'The title of the paper',
          'The results of the study',
          'The identities of both the author and the reviewers',
          'The name of the journal',
        ],
        correctIndex: 2,
      },
      {
        id: 'u1-q3',
        question: 'Who makes the final decision on whether a paper is published?',
        options: ['The author', 'The editor', 'The first reviewer', 'The journal\u2019s marketing team'],
        correctIndex: 1,
      },
      {
        id: 'u1-q4',
        question: 'What is a "desk rejection"?',
        options: [
          'A rejection after three reviewers disagree',
          'A rejection by the editor before review, often for poor fit',
          'A rejection because the journal is full',
          'A rejection that cannot be appealed',
        ],
        correctIndex: 1,
      },
      {
        id: 'u1-q5',
        question: 'Why should you submit your paper to only one journal at a time?',
        options: [
          'It is faster',
          'Submitting to several at once (duplicate submission) is not allowed',
          'Journals share a single inbox',
          'It saves printing costs',
        ],
        correctIndex: 1,
      },
      {
        id: 'u1-q6',
        question: 'Which of these is an example of a publication ethics violation?',
        options: [
          'Citing every source you used',
          'Adding someone as an author who did no real work',
          'Reporting an unexpected result honestly',
          'Listing the study\u2019s limitations',
        ],
        correctIndex: 1,
      },
      {
        id: 'u1-q7',
        question: 'Where do you check whether your topic fits a journal?',
        options: [
          'The journal\u2019s aim and scope statement',
          'The price of the journal',
          'The number of pages',
          'The cover colour',
        ],
        correctIndex: 0,
      },
    ],
    exercise: {
      prompt:
        'In your own words, explain why peer review is important for keeping research trustworthy. Mention at least one thing reviewers check for. Write 80\u2013150 words.',
      minWords: 80,
      sample:
        'Peer review is important because it acts as a quality check before research reaches the public. When independent experts read a paper, they can spot weaknesses such as an unclear research question, a method that does not match the question, or claims that the data do not actually support. This protects readers from trusting wrong or exaggerated information. It also helps the author, because reviewers usually suggest ways to make the work clearer or stronger. Reviewers also check that the limitations are stated honestly, so readers know how far the results can be trusted. Without peer review, anyone could publish anything and call it science, which would make it very hard to know what to believe. By having several experts check the work, peer review keeps published research more reliable and fair.',
    },
  },

  // ===================================================================
  // UNIT 2 — Structure of a Research Paper (IMRaD)
  // ===================================================================
  {
    id: 'unit-2',
    order: 2,
    title: 'Structure of a Research Paper',
    track: 'Writing',
    accent: 'var(--amber-700)',
    summary:
      'Master the IMRaD structure, learn what belongs in each section, and write clear titles, abstracts, and keywords that help readers find your work.',
    lessons: [
      {
        id: 'u2-imrad',
        title: 'The IMRaD structure',
        duration: '8 min',
        content:
          'Most research papers follow IMRaD: Introduction, Methods, Results, and Discussion. This mirrors how research is actually done \u2014 you ask a question, design a study, gather findings, then interpret them. Around this core sit the Title, Abstract, Keywords, and References, and sometimes a separate Literature Review or Conclusion. The big advantage of IMRaD is that readers and reviewers always know where to look: methods in the Methods section, interpretation in the Discussion. A common mistake is mixing these up \u2014 for example, interpreting results inside the Results section instead of just reporting them.',
        takeaway:
          'IMRaD = Introduction, Methods, Results, Discussion. Keep each section to its own job.',
      },
      {
        id: 'u2-intro',
        title: 'Writing a strong introduction',
        duration: '8 min',
        content:
          'A good introduction moves through four beats: broad context, the specific problem, the gap in current knowledge, and your contribution. Start by describing the area and why it matters, narrow to the precise problem, show what is missing or unresolved in existing work, then state clearly what your paper adds. By the end of the introduction the reader should know exactly why your study is needed and what you set out to do. If your contribution is hidden deep in the paper, reviewers may see the work as unfocused even if the research is good.',
        takeaway:
          'Introduction = context \u2192 problem \u2192 gap \u2192 your contribution. State your contribution clearly and early.',
      },
      {
        id: 'u2-methods-results',
        title: 'Methods and results: report, don\u2019t interpret',
        duration: '9 min',
        content:
          'The Methods section should let another researcher repeat your study. Include the design, participants or data sources, materials or tools, the procedure, and how you analysed the data. The Results section presents what you found \u2014 often with tables and figures \u2014 but without extended interpretation. A key rule: in Results you report, in Discussion you comment. Mixing the two is one of the most common reasons drafts feel disorganised. Structure your results around your research questions so the reader can follow the logic.',
        takeaway:
          'Methods must be repeatable. In Results you report findings; save interpretation for the Discussion.',
      },
      {
        id: 'u2-discussion',
        title: 'Writing the discussion and conclusion',
        duration: '8 min',
        content:
          'The Discussion explains what your results mean. Start by summarising your main findings, then compare them with previous work (do they agree or disagree, and why?), explain why they matter, and state the limitations honestly. End with what should happen next \u2014 future research or practical applications. A conclusion, if separate, gives a short final summary and a take-home message. Avoid introducing brand-new results in the Discussion, and do not overstate what your data can support.',
        takeaway:
          'Discussion = summarise findings, compare to past work, explain importance, admit limitations, suggest next steps.',
      },
      {
        id: 'u2-abstract',
        title: 'Writing a useful abstract',
        duration: '7 min',
        content:
          'The abstract is a short summary of the whole paper, usually 150\u2013250 words, and it is the most-read part because readers use it to decide whether to continue. A strong abstract states the problem, the method, the key result, and the contribution \u2014 a mini version of the whole paper. Write it last, after the paper is finished, so it matches the final content exactly. Do not include citations or references in the abstract, and avoid vague sentences that could describe any paper.',
        takeaway:
          'An abstract states problem, method, key result, and contribution. Write it last so it matches the paper.',
      },
      {
        id: 'u2-title-keywords',
        title: 'Titles and keywords for discovery',
        duration: '6 min',
        content:
          'Your title and keywords decide whether the right readers ever find your paper. A good title is specific and informative, not clever or vague \u2014 it should signal the topic and often the method or population. Keywords are the search terms other researchers use; pick 4\u20136 that describe the main topic, method, field, or population. They should be specific enough to be useful but common enough that people actually search for them. Avoid words that are too broad, such as "research" or "study", because they do not help anyone find your specific work.',
        takeaway:
          'Write a specific, informative title and pick 4\u20136 searchable keywords. Avoid words that are too broad.',
      },
    ],
    quiz: [
      {
        id: 'u2-q1',
        question: 'What does IMRaD stand for?',
        options: [
          'Introduction, Methods, Results, and Discussion',
          'Index, Method, Review, and Data',
          'Introduction, Materials, References, and Data',
          'Inquiry, Model, Result, and Detail',
        ],
        correctIndex: 0,
      },
      {
        id: 'u2-q2',
        question: 'Which section should let another researcher repeat your study?',
        options: ['Abstract', 'Methods', 'References', 'Acknowledgements'],
        correctIndex: 1,
      },
      {
        id: 'u2-q3',
        question: 'What is the correct difference between Results and Discussion?',
        options: [
          'Results interpret; Discussion reports',
          'Results report findings; Discussion interprets them',
          'They are the same thing',
          'Results list references; Discussion lists data',
        ],
        correctIndex: 1,
      },
      {
        id: 'u2-q4',
        question: 'When should you usually write the abstract?',
        options: [
          'First, before anything else',
          'Last, after the paper is finished',
          'Halfway through the methods',
          'It is optional and rarely written',
        ],
        correctIndex: 1,
      },
      {
        id: 'u2-q5',
        question: 'Which four beats make a strong introduction?',
        options: [
          'Context, problem, gap, contribution',
          'Title, abstract, method, result',
          'Summary, table, figure, citation',
          'Hypothesis, data, opinion, ending',
        ],
        correctIndex: 0,
      },
      {
        id: 'u2-q6',
        question: 'What should a good abstract include?',
        options: [
          'Only the title and author names',
          'Problem, method, key result, and contribution',
          'A full list of references',
          'Personal opinions about the field',
        ],
        correctIndex: 1,
      },
      {
        id: 'u2-q7',
        question: 'Which set of keywords is strongest for a study on student citation training?',
        options: [
          'research, study, paper, thing',
          'academic citation, student learning, plagiarism prevention',
          'education, writing, system, university, article, learning',
          'science, knowledge, information',
        ],
        correctIndex: 1,
      },
      {
        id: 'u2-q8',
        question: 'What is a common mistake in the Discussion section?',
        options: [
          'Comparing results to previous work',
          'Stating limitations honestly',
          'Introducing brand-new results not shown earlier',
          'Suggesting future research',
        ],
        correctIndex: 2,
      },
    ],
    exercise: {
      prompt:
        'Imagine you studied how often students at your university reuse sources without citing them. Write a short abstract (150\u2013200 words) for this study. Include the problem, method, a key result (you can invent a realistic number), and the contribution.',
      minWords: 120,
      sample:
        'Many university students struggle to cite sources correctly, which can lead to accidental plagiarism. This study examined how often undergraduate students reuse text from online sources without proper citation. We collected 120 anonymised first-year assignments and checked each one using a structured citation checklist. We found that 38% of assignments contained at least one uncited source, and most of these involved copying definitions rather than deliberate cheating. The results suggest that the main problem is a lack of training, not dishonesty. Based on these findings, we recommend a short, compulsory citation module for first-year students, delivered before their first major assignment. This study contributes practical evidence that early citation education could reduce accidental plagiarism and help students build good academic habits before they begin writing research papers. Future work could test whether such a module actually lowers plagiarism rates over a full semester.',
    },
  },

  // ===================================================================
  // UNIT 3 — Academic Writing & Integrity
  // ===================================================================
  {
    id: 'unit-3',
    order: 3,
    title: 'Academic Writing and Integrity',
    track: 'Integrity',
    accent: 'var(--teal-700)',
    summary:
      'Write in a clear academic style, cite sources correctly with common referencing styles, paraphrase properly, avoid plagiarism, and use AI tools responsibly.',
    lessons: [
      {
        id: 'u3-style',
        title: 'Clear academic writing style',
        duration: '7 min',
        content:
          'Academic writing should be clear, precise, and objective \u2014 not full of long, complicated words. Prefer short, direct sentences. Use the active voice where it helps ("We measured" rather than "It was measured") unless your field prefers passive. Define any technical term the first time you use it. Be specific: "improved accuracy by 12%" is stronger than "improved accuracy a lot". Good academic writing is judged by clarity, not by how complicated it sounds.',
        takeaway:
          'Write clearly and precisely. Short sentences, defined terms, and specific numbers beat fancy words.',
      },
      {
        id: 'u3-why-cite',
        title: 'Why and when to cite',
        duration: '6 min',
        content:
          'Citation shows where your ideas and evidence came from. It gives credit to the original authors and lets readers check your sources. You must cite when you use a fact, a definition, a statistic, a method, data, or another author\u2019s argument or idea \u2014 even if you put it in your own words. You do not need to cite common knowledge (for example, that water boils at 100\u00b0C at sea level). Good citation also makes your own work more convincing, because it shows you have read the relevant research.',
        takeaway:
          'Cite facts, definitions, statistics, methods, and others\u2019 ideas \u2014 even when paraphrased. Common knowledge needs no citation.',
      },
      {
        id: 'u3-referencing-styles',
        title: 'Referencing styles: APA, IEEE, Harvard',
        duration: '8 min',
        content:
          'Different fields use different referencing styles. APA (common in social sciences) uses author and year, for example (Lee, 2021). IEEE (common in engineering and computer science) uses numbered brackets like [1] that match a numbered reference list. Harvard is similar to APA, also author-date. MLA is common in the humanities. The exact punctuation differs, but the most important rule is the same: pick the style your journal requires and use it consistently throughout the whole paper. Reference managers like Zotero or Mendeley can format references for you and save a lot of time.',
        takeaway:
          'Use the style your journal requires (APA, IEEE, Harvard, MLA) and stay consistent. Reference managers help.',
      },
      {
        id: 'u3-paraphrase',
        title: 'Paraphrasing and quoting properly',
        duration: '7 min',
        content:
          'Paraphrasing means putting another author\u2019s idea into your own words. Good paraphrasing changes both the wording and the sentence structure, not just a few words \u2014 and it still needs a citation, because the idea is not yours. Use direct quotes only when the exact words matter (a definition, a legal phrase, a memorable claim), keep them short, and always put them in quotation marks with a citation. Changing only a few words of a source while keeping its structure is called "patchwriting" and still counts as plagiarism.',
        takeaway:
          'Paraphrasing needs a citation and a full rewrite. Quote sparingly, in quotation marks, with a citation.',
      },
      {
        id: 'u3-plagiarism',
        title: 'Understanding plagiarism',
        duration: '7 min',
        content:
          'Plagiarism is presenting someone else\u2019s work or ideas as your own. It includes copying text without citation, patchwriting (changing a few words), using someone\u2019s data or figures without credit, and even "self-plagiarism" \u2014 reusing your own previously published work without saying so. Plagiarism can be accidental, often from poor note-taking or sloppy citation, but it is still treated seriously and can lead to rejection or worse. The safest habits are to take careful notes that separate your own ideas from sources, and to cite as you write rather than afterwards.',
        takeaway:
          'Plagiarism includes copying, patchwriting, using others\u2019 data, and reusing your own work without saying so. Cite as you write.',
      },
      {
        id: 'u3-ai-tools',
        title: 'Using AI tools responsibly',
        duration: '6 min',
        content:
          'AI writing tools can help you brainstorm, check grammar, or rephrase sentences, but they bring responsibilities. Many journals now require you to disclose if and how you used AI tools, and AI must never be listed as an author. AI can produce confident but wrong information, including fake references, so you must check every fact and citation yourself. Never paste confidential or unpublished data into public AI tools. Use AI as an assistant for your own thinking, not as a replacement for it.',
        takeaway:
          'Disclose AI use, never list AI as an author, check everything it produces, and never paste confidential data into it.',
      },
    ],
    quiz: [
      {
        id: 'u3-q1',
        question: 'When do you need to cite a source?',
        options: [
          'Only when you copy text word for word',
          'When you use a fact, statistic, method, or another author\u2019s idea \u2014 even paraphrased',
          'Only for books, not websites',
          'Only in the conclusion',
        ],
        correctIndex: 1,
      },
      {
        id: 'u3-q2',
        question: 'Which referencing style uses numbered brackets like [1]?',
        options: ['APA', 'Harvard', 'IEEE', 'MLA'],
        correctIndex: 2,
      },
      {
        id: 'u3-q3',
        question: 'What is "patchwriting"?',
        options: [
          'Writing in small daily sessions',
          'Changing only a few words of a source while keeping its structure',
          'Using a reference manager',
          'Writing the abstract last',
        ],
        correctIndex: 1,
      },
      {
        id: 'u3-q4',
        question: 'If you completely rewrite an idea from a source in your own words, what should you do?',
        options: [
          'Nothing, it is now your idea',
          'Cite the source',
          'Put the whole thing in quotation marks',
          'Cite it only if it came from a book',
        ],
        correctIndex: 1,
      },
      {
        id: 'u3-q5',
        question: 'Which is the most important rule about referencing style in one paper?',
        options: [
          'Use as many styles as possible',
          'Use the style the journal requires, consistently',
          'Always use APA no matter what',
          'Change style for each section',
        ],
        correctIndex: 1,
      },
      {
        id: 'u3-q6',
        question: 'What is "self-plagiarism"?',
        options: [
          'Citing yourself too often',
          'Reusing your own previously published work without saying so',
          'Writing about yourself',
          'Reviewing your own paper',
        ],
        correctIndex: 1,
      },
      {
        id: 'u3-q7',
        question: 'Which is responsible use of AI writing tools?',
        options: [
          'Listing the AI as a co-author',
          'Pasting unpublished data into a public AI tool',
          'Disclosing AI use and checking every fact and citation it produces',
          'Trusting all references the AI gives you',
        ],
        correctIndex: 2,
      },
      {
        id: 'u3-q8',
        question: 'Which sentence shows the clearest academic style?',
        options: [
          'The intervention facilitated a substantial amelioration of outcomes.',
          'The training improved test scores by 12%.',
          'Things got a lot better after the thing we did.',
          'It was made better by the aforementioned methodological apparatus.',
        ],
        correctIndex: 1,
      },
    ],
    exercise: {
      prompt:
        'Here is a source sentence: "Regular formative feedback significantly improves student writing outcomes over a single semester." Paraphrase it properly in your own words (do not just swap a few words), then write how you would cite it in-text in APA style with the author "Tan" and year 2022. Explain in one sentence why it still needs a citation. Write 40\u2013100 words.',
      minWords: 40,
      sample:
        'Paraphrase: Giving students frequent, low-stakes feedback throughout a single term leads to clear improvements in how well they write. In-text citation (APA): This effect has been observed across one teaching semester (Tan, 2022). It still needs a citation because, even though I changed both the words and the sentence structure, the underlying idea and evidence came from Tan, not from me. If I had quoted the original wording directly, I would also have used quotation marks and added a page number, for example (Tan, 2022, p. 14).',
    },
  },

  // ===================================================================
  // UNIT 4 — Reading and Reviewing Like a Reviewer
  // ===================================================================
  {
    id: 'unit-4',
    order: 4,
    title: 'Reading and Reviewing Like a Reviewer',
    track: 'Reviewing',
    accent: 'var(--red-700)',
    summary:
      'Learn to read papers critically, evaluate each section the way a reviewer does, write a structured and constructive review report, and understand reviewer ethics.',
    lessons: [
      {
        id: 'u4-first-pass',
        title: 'The first-pass read',
        duration: '7 min',
        content:
          'Experienced reviewers do not start by reading every word. They begin with a first-pass read: the title, abstract, introduction, figures, and conclusion. This gives a quick sense of the research problem, the claimed contribution, and whether the paper fits the journal. After this pass, a useful habit is to write a short 4\u20135 sentence summary of the paper in your own words \u2014 the main question, the method, what is new, and what is done well. If you cannot summarise it, the paper may not be clear enough, which is itself useful feedback.',
        takeaway:
          'Skim title, abstract, intro, figures, and conclusion first, then write a 4\u20135 sentence summary in your own words.',
      },
      {
        id: 'u4-evaluate-sections',
        title: 'Evaluating each section',
        duration: '9 min',
        content:
          'On a deeper read, check each part. Introduction: is the research problem and gap clear? Methods: is the design appropriate, and could someone repeat it? Results: do the data actually support the claims, and are figures and tables clear? Discussion: are the conclusions justified by the results, and are limitations honest? Also check that citations are appropriate and that the paper fits the journal\u2019s scope. Note both strengths and weaknesses \u2014 a good review is balanced, not just a list of complaints.',
        takeaway:
          'Check each section: clear problem, repeatable method, claims supported by data, honest limitations.',
      },
      {
        id: 'u4-review-report',
        title: 'Writing a structured review report',
        duration: '9 min',
        content:
          'A clear review report usually has four parts: a short summary of the paper (to show the author you understood it), a list of major issues (problems that must be fixed, like a flawed method or unsupported claim), a list of minor issues (smaller fixes like typos or unclear figures), and a recommendation (accept, minor revision, major revision, or reject). Number your comments so the author can respond point by point. Refer to specific pages, sections, or lines. Confidential comments to the editor can be separate from the comments the author sees.',
        takeaway:
          'Structure a review as: summary, major issues, minor issues, recommendation. Number comments and be specific.',
      },
      {
        id: 'u4-constructive',
        title: 'Giving constructive, fair feedback',
        duration: '8 min',
        content:
          'Good reviewer comments are specific, polite, and useful. Explain what the issue is, why it matters, and how the author could fix it. Compare two comments: "This paper is bad and confusing" helps no one; "The Methods section does not state the sample size, so readers cannot judge whether the results are reliable \u2014 please add it" is constructive. Your job is to be fair and objective and to help improve the work, not to show off or attack the author. Remember that a real person will read your comments.',
        takeaway:
          'Say what the issue is, why it matters, and how to fix it. Be specific, polite, and fair \u2014 never personal.',
      },
      {
        id: 'u4-reviewer-ethics',
        title: 'Reviewer ethics and confidentiality',
        duration: '6 min',
        content:
          'Reviewing carries responsibilities. A manuscript under review is confidential \u2014 you must not share it, use its ideas before publication, or pass it to anyone else. If you have a conflict of interest (for example, the author is a close colleague or competitor), you should tell the editor and may need to decline. Review on time, or let the editor know if you cannot. If you are not qualified to judge part of the paper, say so honestly rather than guessing. These rules keep the whole system fair and trustworthy.',
        takeaway:
          'Keep manuscripts confidential, declare conflicts of interest, review on time, and admit what you cannot judge.',
      },
    ],
    quiz: [
      {
        id: 'u4-q1',
        question: 'What does a reviewer usually do in the "first-pass" read?',
        options: [
          'Read every word from start to finish',
          'Skim the title, abstract, introduction, figures, and conclusion',
          'Only read the references',
          'Rewrite the paper',
        ],
        correctIndex: 1,
      },
      {
        id: 'u4-q2',
        question: 'A useful habit right after the first-pass read is to:',
        options: [
          'Write a 4\u20135 sentence summary of the paper in your own words',
          'Email the author directly',
          'Decide to reject it immediately',
          'Check the journal\u2019s subscription price',
        ],
        correctIndex: 0,
      },
      {
        id: 'u4-q3',
        question: 'What are the four typical parts of a structured review report?',
        options: [
          'Summary, major issues, minor issues, recommendation',
          'Title, abstract, method, result',
          'Praise, blame, score, signature',
          'Introduction, body, conclusion, references',
        ],
        correctIndex: 0,
      },
      {
        id: 'u4-q4',
        question: 'Which reviewer comment is the most constructive?',
        options: [
          'This paper is bad and confusing.',
          'Reject \u2014 I do not like the topic.',
          'The Methods section does not state the sample size, so readers cannot judge reliability \u2014 please add it.',
          'Needs work.',
        ],
        correctIndex: 2,
      },
      {
        id: 'u4-q5',
        question: 'When checking the Results, a reviewer mainly asks:',
        options: [
          'Is the font nice?',
          'Do the data actually support the claims being made?',
          'Is the author famous?',
          'Are there enough references?',
        ],
        correctIndex: 1,
      },
      {
        id: 'u4-q6',
        question: 'What should you do if the author of a paper you are asked to review is a close colleague?',
        options: [
          'Review it anyway and give a high score',
          'Tell the editor about the conflict of interest',
          'Share it with your friends for opinions',
          'Reject it without reading',
        ],
        correctIndex: 1,
      },
      {
        id: 'u4-q7',
        question: 'A manuscript you are reviewing is:',
        options: [
          'Public, so you can share it freely',
          'Confidential \u2014 you must not share it or use its ideas before publication',
          'Yours to publish first',
          'Open for you to post online',
        ],
        correctIndex: 1,
      },
      {
        id: 'u4-q8',
        question: 'What is the difference between a major and a minor issue in a review?',
        options: [
          'Major issues are typos; minor issues are method problems',
          'Major issues must be fixed (e.g. flawed method); minor issues are small fixes (e.g. typos)',
          'There is no difference',
          'Minor issues lead to rejection; major issues do not',
        ],
        correctIndex: 1,
      },
    ],
    exercise: {
      prompt:
        'You are reviewing a short student paper. The method is reasonable but the paper never states how many people took part, and two figures have no labels. Write a short, structured reviewer comment (80\u2013140 words) with a one-line summary, one major issue, one minor issue, and a recommendation. Keep it polite and specific.',
      minWords: 80,
      sample:
        'Summary: The paper investigates how a short feedback session affects student writing, and the overall idea is clear and useful. Major issue: The Methods section does not state how many participants took part in the study. Without the sample size, readers cannot judge whether the results are reliable, so please add the number of participants and how they were selected (Methods, page 3). Minor issue: Figures 1 and 2 have no axis labels, which makes them hard to read \u2014 please add clear labels and units. Recommendation: Minor revision. The study is sound, and these changes would make it much easier to evaluate and trust. Thank you for an interesting paper.',
    },
  },

  // ===================================================================
  // UNIT 5 — Submitting and Publishing on JSRMS
  // ===================================================================
  {
    id: 'unit-5',
    order: 5,
    title: 'Submitting and Publishing on JSRMS',
    track: 'Platform',
    accent: 'var(--purple-700)',
    summary:
      'Choose the right venue, prepare a complete submission, use the JSRMS system step by step, track review status, and respond well to reviewer decisions.',
    lessons: [
      {
        id: 'u5-venue',
        title: 'Choosing the right venue',
        duration: '7 min',
        content:
          'Before submitting, choose a journal or conference that matches your topic, scope, and quality level. Read the aim and scope, check which article types they accept, and look at a few recent papers they have published. Submitting to the wrong venue is one of the most common causes of desk rejection. Watch out for "predatory" journals that promise very fast publication for a fee but provide no real peer review \u2014 check that a journal is indexed and has a genuine editorial board. On JSRMS, the system uses AI to suggest a suitable category for your paper from your abstract.',
        takeaway:
          'Match your paper to a real, in-scope venue. Avoid predatory journals. JSRMS suggests a category from your abstract.',
      },
      {
        id: 'u5-prepare',
        title: 'Preparing a complete submission',
        duration: '8 min',
        content:
          'A complete submission usually needs your manuscript file, an abstract, keywords, author details and affiliations, and sometimes a cover letter. The cover letter briefly tells the editor what the paper is about and why it fits the journal. Before you submit, run through a checklist: correct formatting, word count within limits, all references complete and in the right style, figures and tables labelled, author names and order agreed, and any ethics statements included. Many rejections come from avoidable preparation mistakes, so a final checklist is worth the time.',
        takeaway:
          'Prepare manuscript, abstract, keywords, author details, and cover letter. Run a final checklist before submitting.',
      },
      {
        id: 'u5-submit-steps',
        title: 'The JSRMS submission steps',
        duration: '8 min',
        content:
          'On JSRMS, submission has three clear steps. Step 1, Paper Details: enter your title, abstract, category, and keywords \u2014 the AI assistant suggests a category and reviewer match from your abstract. Step 2, Upload Manuscript: upload your PDF and any supporting files, and optionally a cover letter. Step 3, Review and Submit: check everything is correct, then submit. After submitting, you will receive a confirmation and your paper appears on your dashboard. You can save a draft at any step if you are not ready to finish.',
        takeaway:
          'JSRMS submission = Step 1 details, Step 2 upload, Step 3 review and submit. You can save a draft anytime.',
      },
      {
        id: 'u5-status',
        title: 'Tracking your review status',
        duration: '6 min',
        content:
          'After submission, your paper moves through statuses you can see on your dashboard. "Submitted" means it has arrived and is waiting for the editor\u2019s initial check. "Under Review" means reviewers are evaluating it. "Decision Pending" means reviews are in and the editor is deciding. Then you receive a decision: accept, minor or major revision, or reject. Knowing what each status means helps you stay calm \u2014 review takes time, and "Under Review" for several weeks is completely normal.',
        takeaway:
          'Dashboard statuses: Submitted \u2192 Under Review \u2192 Decision Pending \u2192 Decision. Waiting weeks is normal.',
      },
      {
        id: 'u5-respond',
        title: 'Responding to reviewer decisions',
        duration: '9 min',
        content:
          'If reviewers ask for changes, do not panic \u2014 most published papers went through revision. The best approach is a response table: quote each reviewer comment, explain exactly what you changed, and point to where you changed it (page and section). Respond to every comment, even ones you disagree with \u2014 in those cases, explain your reasoning politely and with evidence. Thank the reviewers for their time. A clear, respectful, point-by-point response makes editors and reviewers much more likely to accept your revised paper.',
        takeaway:
          'Use a response table: quote each comment, say what you changed and where. Answer every point politely, even disagreements.',
      },
    ],
    quiz: [
      {
        id: 'u5-q1',
        question: 'What is a "predatory" journal?',
        options: [
          'A journal with a very high reputation',
          'One that charges a fee for fast publication but provides no real peer review',
          'A journal that only publishes students',
          'A free, open-access journal',
        ],
        correctIndex: 1,
      },
      {
        id: 'u5-q2',
        question: 'How many steps does the JSRMS submission process have?',
        options: ['One', 'Two', 'Three', 'Five'],
        correctIndex: 2,
      },
      {
        id: 'u5-q3',
        question: 'How does JSRMS help you choose a category?',
        options: [
          'It picks randomly',
          'It uses AI to suggest a category from your abstract',
          'It copies the last paper you read',
          'It asks another student',
        ],
        correctIndex: 1,
      },
      {
        id: 'u5-q4',
        question: 'What does "Under Review" mean on your dashboard?',
        options: [
          'The paper is published',
          'Reviewers are currently evaluating your paper',
          'The paper was rejected',
          'You must pay a fee',
        ],
        correctIndex: 1,
      },
      {
        id: 'u5-q5',
        question: 'What is the best way to respond to reviewer comments?',
        options: [
          'Ignore the ones you disagree with',
          'Reply point-by-point in a response table, saying what you changed and where',
          'Submit to a different journal instead',
          'Argue with the editor',
        ],
        correctIndex: 1,
      },
      {
        id: 'u5-q6',
        question: 'Why use a checklist before submitting?',
        options: [
          'It is required by law',
          'Many rejections come from avoidable preparation mistakes',
          'It replaces the abstract',
          'It speeds up the AI',
        ],
        correctIndex: 1,
      },
      {
        id: 'u5-q7',
        question: 'What is the purpose of a cover letter?',
        options: [
          'To list your hobbies',
          'To briefly tell the editor what the paper is about and why it fits the journal',
          'To replace the abstract',
          'To thank your family',
        ],
        correctIndex: 1,
      },
      {
        id: 'u5-q8',
        question: 'If a paper stays "Under Review" for several weeks, this usually means:',
        options: [
          'Something is wrong and you should resubmit',
          'It is normal \u2014 peer review takes time',
          'The paper was rejected',
          'You forgot to submit it',
        ],
        correctIndex: 1,
      },
    ],
    exercise: {
      prompt:
        'A reviewer wrote: "The methodology does not explain how many participants were involved, so I cannot judge whether the results are reliable." Write a short, polite response (60\u2013120 words) as if replying in a response table. Quote the concern, explain what you changed, and say where.',
      minWords: 60,
      sample:
        'Reviewer comment: "The methodology does not explain how many participants were involved, so I cannot judge whether the results are reliable." Response: Thank you for this helpful comment. We agree the participant count was missing. We have now added this information to the Methods section (page 4, paragraph 2), where we state that 120 undergraduate students took part, and we have explained how they were selected. We have also added a short note on the response rate so readers can judge the reliability of the results. We believe this change makes the study easier to evaluate and reproduce. Thank you again for pointing this out, as it has improved the clarity of the paper.',
    },
  },
];

// Build a flat pool of questions for the final assessment (drawn from all unit quizzes).
export function buildAssessmentPool() {
  const pool = [];
  for (const unit of TRAINING_UNITS) {
    for (const q of unit.quiz) {
      pool.push({ ...q, unitId: unit.id, unitTitle: unit.title });
    }
  }
  return pool;
}

export function getUnitById(id) {
  return TRAINING_UNITS.find((u) => u.id === id);
}
