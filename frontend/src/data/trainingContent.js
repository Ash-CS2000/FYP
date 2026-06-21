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

// After passing the final assessment, students are asked to submit one research
// paper through JSRMS to complete their certification. This window is a soft
// target (a recommended-by date), not a hard lock.
export const PUBLICATION_WINDOW_DAYS = 30;

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
        duration: '9 min',
        content:
          'An academic journal is a publication where researchers share new findings with their field. What truly separates a journal from a magazine, blog, or ordinary website is peer review: before anything appears in print, other experts in the same area read the article and judge whether the work is sound. That quality check is the reason other researchers are willing to trust and build on what a journal publishes.\n\nJournals vary a great deal. Some are very narrow \u2014 for example, a journal devoted only to coral-reef ecology \u2014 while others are broad, such as a general medicine or general computer-science journal. Some are "open access," meaning anyone can read them for free, while others sit behind a paywall or institutional subscription. Many open-access journals charge the author an "article processing charge" (APC) to cover publishing costs, so always check the fees before you submit.\n\nConferences also publish research, usually as shorter papers tied to a talk or poster at an event. In fast-moving fields like computer science, a paper at a top conference can carry as much weight as a journal article. Finally, every reputable journal publishes an "aim and scope" statement describing exactly which topics and article types it accepts. Reading that statement first is the single best way to avoid wasting months submitting your work to the wrong place.',
        keyPoints: [
          'Peer review — expert checking before publication — is what separates a journal from a blog or magazine.',
          'Journals differ in scope (narrow vs broad) and access (open access vs subscription); open access often charges the author an APC.',
          'Conferences also publish research; in some fields a top conference carries as much weight as a journal.',
          'A journal’s "aim and scope" statement tells you whether your work fits — read it before submitting.',
        ],
        example:
          'You wrote a study on study-habit apps for students. Both a broad education journal and a niche "Technology in Higher Education" journal exist. Reading each aim and scope shows the niche journal explicitly wants ed-tech studies while the broad one rarely publishes them — so you submit to the niche journal and avoid a likely desk rejection.',
        mistakes: [
          'Treating a journal article like a blog post and ignoring the peer-review expectation.',
          'Submitting without reading the aim and scope, then being desk-rejected for poor fit.',
          'Overlooking open-access fees (APCs) until after the paper is accepted.',
        ],
        takeaway:
          'Journals publish expert-checked research. Check a journal\u2019s aim and scope to see if your work fits.',
      },
      {
        id: 'u1-why-publish',
        title: 'Why publishing matters for students',
        duration: '8 min',
        content:
          'Publishing your research is not just for professors. For a student, a published paper is concrete, verifiable proof that you can carry out a real project, analyse evidence, and communicate a result clearly — something a transcript alone cannot show. It strengthens applications for scholarships, internships, exchange programmes, and especially postgraduate study, where admissions committees look hard for evidence of research potential.\n\nThere are benefits beyond your CV. The submission process gives you structured, expert feedback that you almost never get on ordinary coursework: experienced reviewers tell you exactly where your argument is weak and how to make it stronger. Going through that once teaches you more about good research than many lectures. Publishing also forces you to sharpen your thinking, because writing for a critical audience exposes gaps that are easy to ignore in your own head.\n\nThere is a wider reason too. Knowledge only moves forward when results are shared. Many strong student projects — good data, genuine insight — are never seen by anyone because the student did not know how the process worked or assumed publishing was “not for them.” Learning the process early removes that barrier and gives your work a real chance to be read, cited, and built on by others.',
        keyPoints: [
          'A published paper is verifiable proof of research ability that a transcript cannot show.',
          'It strengthens scholarship, internship, exchange, and especially postgraduate applications.',
          'The review process gives you structured expert feedback you rarely get on normal coursework.',
          'Sharing results lets others build on your work — knowledge only moves forward when it is published.',
        ],
        example:
          'A final-year student turns a strong capstone project into a short paper. Reviewer feedback sharpens the argument, and the published article later becomes the standout item in a Master’s application — concrete evidence of research skill that other applicants’ transcripts could not match.',
        mistakes: [
          'Assuming "publishing is not for students" and letting good work go unseen.',
          'Waiting for the work to be "perfect" instead of getting feedback through the process.',
        ],
        takeaway:
          'Publishing builds your profile, earns you expert feedback, and lets your work reach real readers.',
      },
      {
        id: 'u1-lifecycle',
        title: 'The life of a paper, step by step',
        duration: '10 min',
        content:
          'A paper moves through a clear, predictable set of stages, and knowing them in advance makes the whole process far less stressful.\n\nFirst you write and prepare the manuscript so it matches your chosen journal\u2019s format. Then you submit it to one journal only \u2014 never several at the same time. Submitting the same paper to multiple journals at once is called duplicate submission, and it is forbidden because it wastes reviewers\u2019 time and can lead to two journals publishing the same work.\n\nOnce submitted, an editor performs an initial check to see whether the paper fits the journal\u2019s scope and meets a basic quality bar. If it clearly does not fit, it may be \u201cdesk rejected\u201d within days, without ever going to review \u2014 this is common and usually about fit, not failure. If it passes, the editor invites several independent reviewers, who read the paper and return written reports plus a recommendation.\n\nThe editor weighs those reports and reaches one of four decisions: accept, minor revision, major revision, or reject. Most papers \u2014 even very good ones \u2014 are not accepted on the first try; at least one round of revision is the norm, not a sign of bad work. After a paper is finally accepted, it is copy-edited, typeset into the journal\u2019s layout, given a DOI, and published. From submission to publication can take anywhere from a few weeks to many months, so patience is part of the job.',
        keyPoints: [
          'The stages are: write \u2192 submit to one journal \u2192 editor check \u2192 peer review \u2192 decision \u2192 revise \u2192 publish.',
          'Submit to only one journal at a time; simultaneous (duplicate) submission is forbidden.',
          'A desk rejection happens before review, usually about fit \u2014 common, not a personal failure.',
          'Almost every paper needs at least one round of revision; that is normal, not a bad sign.',
        ],
        example:
          'A paper is submitted in March, sent to reviewers in April, and gets a "major revision" in June. The authors revise over a month, resubmit, and are accepted in August \u2014 published in October. From submission to print took seven months and one revision round, which is completely typical.',
        mistakes: [
          'Sending the same manuscript to several journals at once (duplicate submission).',
          'Reading a "revise" decision as a rejection and giving up.',
          'Expecting publication within days or a couple of weeks.',
        ],
        takeaway:
          'Write \u2192 submit to one journal \u2192 editor check \u2192 review \u2192 decision \u2192 revise \u2192 publish. Revision is normal.',
      },
      {
        id: 'u1-peer-review',
        title: 'How peer review works',
        duration: '10 min',
        content:
          'Peer review is the engine that makes published research trustworthy. It is the process where independent experts \u2014 people who understand your topic but were not involved in your study \u2014 read your paper and judge whether it is sound, original, and worth publishing.\n\nReviewers ask a consistent set of questions. Is the research question clear and worth answering? Is the method appropriate, and described well enough that someone could repeat it? Do the results actually support the claims being made, or are the conclusions stretched beyond the evidence? Are the limitations stated honestly? They also check that the writing is clear and that prior work is cited fairly.\n\nThere are three common models. In single-blind review, the reviewers know who the author is, but the author does not know who the reviewers are. In double-blind review, neither side knows the other\u2019s identity; hiding the author\u2019s name and institution helps reduce bias based on reputation, gender, or country. In open review, identities are known to everyone, and sometimes the reports are even published alongside the paper to increase transparency.\n\nOne point students often misunderstand: reviewers advise, but they do not decide. They send recommendations, and the editor weighs them \u2014 sometimes alongside conflicting opinions \u2014 to make the final call. A single negative review does not automatically mean rejection, and a positive one does not guarantee acceptance.',
        keyPoints: [
          'Reviewers judge whether the question is clear, the method sound, the claims supported, and the limitations honest.',
          'Single-blind: reviewers know the author. Double-blind: neither side knows the other (reduces bias). Open: identities are public.',
          'Reviewers only advise — the editor makes the final decision.',
          'One negative review need not mean rejection, and one positive review does not guarantee acceptance.',
        ],
        example:
          'Two reviewers assess a paper: one praises the idea but flags a missing control group; the other likes the method but wants clearer figures. Neither says "reject." The editor weighs both reports and returns a "major revision," asking the authors to add the control and redraw the figures.',
        mistakes: [
          'Thinking the reviewer, rather than the editor, decides the outcome.',
          'Assuming double-blind means even the editor does not know who you are (the editor does).',
        ],
        takeaway:
          'Peer review = independent experts check quality. Double-blind hides both identities to reduce bias.',
      },
      {
        id: 'u1-ethics-intro',
        title: 'Publication ethics basics',
        duration: '9 min',
        content:
          'Everything in publishing rests on honesty, because readers cannot personally verify every study — they trust that the system is built on a few firm rules.\n\nThe first rule is data integrity: never fabricate data (invent results), never falsify it (change or “tidy up” numbers to look better), and never selectively hide results that do not fit your story. The second is to never plagiarise — presenting someone else’s words, ideas, or figures as your own. The third is to submit to only one journal at a time. The fourth concerns authorship: list as authors only the people who genuinely contributed to the work.\n\nAuthorship causes more disputes than students expect. Everyone who made a real intellectual contribution should be credited as an author, and the order usually reflects how much each person did. Two abuses to avoid are “gift authorship” (adding a supervisor or friend who did no real work, as a favour) and “ghost authorship” (leaving off someone who did contribute). Agree on authorship early, in writing, to prevent conflict later.\n\nFinally, respect other people’s material: if you reuse a figure, table, or passage from another source, you generally need both permission and a citation. None of these rules are bureaucratic box-ticking — breaking them can lead to retractions, damaged reputations, and academic penalties, while following them protects both you and the readers who rely on your work.',
        keyPoints: [
          'Never fabricate (invent) or falsify (alter) data, and never hide results that do not fit.',
          'Never plagiarise — using another person’s words, ideas, or figures as your own.',
          'List only genuine contributors as authors; avoid gift authorship and ghost authorship.',
          'Reusing another source’s figures or text needs permission and a citation.',
        ],
        example:
          'Three students run a project: one did all the analysis and writing, one collected the data, and a supervisor suggested the topic but did no real work. The first two are authors. Adding the supervisor as an author purely out of courtesy would be "gift authorship" — a thank-you in the acknowledgements is the right place instead.',
        mistakes: [
          'Adding a supervisor or friend as an author who did no real work (gift authorship).',
          '"Tidying up" inconvenient data points to make results look cleaner (falsification).',
          'Reusing a figure from another paper without permission or a citation.',
        ],
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
        duration: '10 min',
        content:
          'Most research papers across the sciences and social sciences follow the same skeleton, called IMRaD: Introduction, Methods, Results, and Discussion. It is not an arbitrary template \u2014 it mirrors how research is actually carried out. You ask a question (Introduction), design and run a study to answer it (Methods), gather what you found (Results), and then work out what it all means (Discussion).\n\nAround this core sit several supporting parts: the Title, Abstract, and Keywords at the front; the References at the end; and, depending on the field, a separate Literature Review, a Conclusion, or an Acknowledgements section. Together they wrap the IMRaD core in context and credit.\n\nThe great advantage of IMRaD is predictability. Because every paper is organised the same way, readers and reviewers always know exactly where to look \u2014 the method is in Methods, the interpretation is in the Discussion \u2014 so they can find what they need without hunting. A reviewer who wants to check whether your study can be repeated goes straight to Methods.\n\nThe most common beginner mistake is letting the sections bleed into each other \u2014 for example, interpreting your findings inside the Results section instead of simply reporting them, or describing new methods in the Discussion. Keeping each section to its own job is the single habit that makes a draft feel professional.',
        keyPoints: [
          'IMRaD = Introduction, Methods, Results, Discussion — it mirrors how research is actually done.',
          'Supporting parts wrap the core: Title, Abstract, and Keywords at the front; References at the end.',
          'Its big advantage is predictability — readers and reviewers always know where to look.',
          'Keep each section to its own job: report findings in Results, interpret them in the Discussion.',
        ],
        example:
          'A reviewer who wants to know whether a study can be repeated jumps straight to the Methods section because the paper follows IMRaD — and because the author kept interpretation out of Results, the reviewer is not distracted by opinions mixed into the data.',
        mistakes: [
          'Interpreting results inside the Results section instead of just reporting them.',
          'Describing new methods or procedures in the Discussion.',
          'Scattering one topic across several sections so readers cannot follow it.',
        ],
        takeaway:
          'IMRaD = Introduction, Methods, Results, Discussion. Keep each section to its own job.',
      },
      {
        id: 'u2-intro',
        title: 'Writing a strong introduction',
        duration: '10 min',
        content:
          'A strong introduction is often described as a funnel: it starts wide and narrows to a sharp point. It moves through four beats — broad context, the specific problem, the gap in current knowledge, and your contribution.\n\nBegin with the broad context: describe the area and why it matters, so any educated reader understands the stakes. Then narrow to the specific problem you are tackling. Next, show the gap — what is still missing, unresolved, or contradictory in the existing work. This is the crucial move: the gap is what justifies your study. Finally, state your contribution plainly: what your paper does to address that gap, and often a one-line preview of your main finding or approach.\n\nA useful test: by the last paragraph of the introduction, a reader should be able to answer two questions in one sentence each — “Why was this study needed?” and “What did the authors set out to do?” If they cannot, the introduction is not doing its job.\n\nMany students bury their contribution deep in the paper, assuming reviewers will eventually find it. They often will not. If the purpose is unclear early, reviewers tend to judge the work as unfocused even when the underlying research is excellent. State your contribution clearly and early — ideally near the end of the introduction.',
        keyPoints: [
          'A strong introduction funnels from broad context → specific problem → gap → your contribution.',
          'The gap is what justifies the study — show what is missing or unresolved in existing work.',
          'State your contribution plainly, near the end of the introduction.',
          'By the last paragraph the reader should know why the study was needed and what you set out to do.',
        ],
        example:
          'The opening moves from "Online learning has grown rapidly" (context) → "but dropout rates are high" (problem) → "and few studies test what keeps students engaged" (gap) → "this paper tests three engagement techniques over 12 weeks" (contribution). In four sentences the reader knows exactly why the paper exists.',
        mistakes: [
          'Burying the contribution deep in the paper so reviewers think the work is unfocused.',
          'Describing prior work without ever naming the gap it leaves.',
          'Starting so broadly ("Since the dawn of science...") that the real topic is delayed.',
        ],
        takeaway:
          'Introduction = context \u2192 problem \u2192 gap \u2192 your contribution. State your contribution clearly and early.',
      },
      {
        id: 'u2-methods-results',
        title: 'Methods and results: report, don\u2019t interpret',
        duration: '11 min',
        content:
          'Methods and Results are the factual heart of a paper, and they each have one clear job. The golden standard for the Methods section is reproducibility: another researcher should be able to read it and repeat your study without guessing. To reach that bar, include the study design, the participants or data sources (how many, and how they were chosen), the materials or tools you used, the exact procedure you followed, and how you analysed the data \u2014 including any statistics or software.\n\nThe Results section presents what you actually found, usually supported by tables and figures. The key discipline here is restraint: you report, you do not yet explain. Give the numbers, the patterns, the comparisons \u2014 but save the \u201cwhy does this matter\u201d for the Discussion. A simple way to remember it: in Results you report, in Discussion you comment.\n\nMixing the two is one of the most common reasons a draft feels muddled. If a sentence in your Results starts with \u201cthis suggests\u201d or \u201cthis is probably because,\u201d it usually belongs in the Discussion. \n\nFinally, give your Results a logical spine. Structure them around your research questions or hypotheses, in the same order you introduced them, so the reader can follow the thread from question to evidence. Reference each figure and table in the text, and make sure every number in the text matches the number in the table.',
        keyPoints: [
          'Methods must be reproducible: design, participants or data, materials, procedure, and analysis.',
          'Results report what you found, supported by tables and figures — without extended interpretation.',
          'Rule of thumb: in Results you report, in Discussion you comment.',
          'Structure results around your research questions, and make text numbers match the tables.',
        ],
        example:
          '"Group A scored 18% higher than Group B (p < 0.01)" belongs in Results — it just reports. The follow-up, "this suggests the new method works better because...", is interpretation and belongs in the Discussion.',
        mistakes: [
          'Writing "this suggests" or "this is probably because" inside Results (that is Discussion).',
          'Leaving out the sample size or how participants were chosen.',
          'Numbers in the text that do not match the numbers in the tables.',
        ],
        takeaway:
          'Methods must be repeatable. In Results you report findings; save interpretation for the Discussion.',
      },
      {
        id: 'u2-discussion',
        title: 'Writing the discussion and conclusion',
        duration: '10 min',
        content:
          'If Results is about \u201cwhat,\u201d the Discussion is about \u201cso what.\u201d This is where you interpret your findings and convince the reader they matter.\n\nA reliable structure has five moves. First, briefly restate your main findings in plain language \u2014 not every number again, just the headline results. Second, compare them with previous work: do your results agree with earlier studies, disagree with them, or extend them, and why might that be? Third, explain the significance: what do these findings change, support, or make possible? Fourth \u2014 and this is where weak papers fall down \u2014 state your limitations honestly. Every study has them (small sample, narrow setting, possible bias), and naming them builds trust rather than undermining it. Fifth, point forward: what should future research do, or how could the findings be applied in practice?\n\nIf your paper has a separate Conclusion, keep it short: a final summary and a clear take-home message the reader should remember.\n\nTwo traps to avoid. Do not introduce brand-new results in the Discussion that never appeared in Results \u2014 every claim should trace back to evidence already shown. And do not overstate: phrases like \u201cthis proves\u201d are dangerous. Your data usually \u201csuggests,\u201d \u201cindicates,\u201d or \u201cis consistent with\u201d \u2014 match the strength of your language to the strength of your evidence.',
        keyPoints: [
          'Discussion answers "so what": restate findings, compare to prior work, explain significance.',
          'State limitations honestly — naming them builds trust rather than weakening the paper.',
          'End by pointing forward: future research or practical applications.',
          'Do not introduce new results here, and do not overstate with words like "proves".',
        ],
        example:
          'A study finds a small but real effect. The Discussion says: "Our results agree with Lee (2021) but are weaker, possibly because our sample was smaller (a limitation), and future work should test the effect over a full year." It interprets without inventing new data or overclaiming.',
        mistakes: [
          'Introducing brand-new results that never appeared in the Results section.',
          'Hiding limitations instead of stating them honestly.',
          'Overstating with "this proves" when the data only "suggests".',
        ],
        takeaway:
          'Discussion = summarise findings, compare to past work, explain importance, admit limitations, suggest next steps.',
      },
      {
        id: 'u2-abstract',
        title: 'Writing a useful abstract',
        duration: '9 min',
        content:
          'The abstract is a short, standalone summary of the whole paper, usually 150\u2013250 words. Do not underestimate it: it is by far the most-read part of your work. Most people decide whether to read \u2014 or cite \u2014 your paper based on the abstract alone, and search databases often show only the abstract. A weak abstract means a strong paper never gets opened.\n\nThink of the abstract as IMRaD in miniature. In just a few sentences it should state the problem (why the study was done), the method (what you did), the key result (what you found, ideally with a concrete number), and the contribution (why it matters). One or two sentences per element is usually enough.\n\nWrite it last. Even though it appears first, you should compose it after the paper is finished, so that every claim in the abstract matches the final content exactly. Drafting it early almost always leaves you with an abstract that no longer matches your results.\n\nA few firm conventions: do not put citations or references in the abstract, do not include information that is not in the paper, and avoid vague filler such as \u201cthis paper discusses various important issues,\u201d which could describe almost anything. Every sentence should be specific to your study. A good final check is to read the abstract alone and ask whether a stranger would understand exactly what you did and what you found.',
        keyPoints: [
          'The abstract is a standalone mini-paper: problem, method, key result, contribution (150–250 words).',
          'It is the most-read part — many people decide whether to read or cite based on it alone.',
          'Write it last, after the paper is finished, so it matches the final content exactly.',
          'No citations, no information that is not in the paper, no vague filler.',
        ],
        example:
          'A tight abstract: "Students often cite sources incorrectly (problem). We checked 120 assignments with a structured checklist (method). 38% contained at least one uncited source (result). A short citation module could reduce accidental plagiarism (contribution)." One sentence per element.',
        mistakes: [
          'Writing the abstract first, so it no longer matches the final results.',
          'Padding it with vague lines like "this paper discusses various important issues".',
          'Putting citations or brand-new information in the abstract.',
        ],
        takeaway:
          'An abstract states problem, method, key result, and contribution. Write it last so it matches the paper.',
      },
      {
        id: 'u2-title-keywords',
        title: 'Titles and keywords for discovery',
        duration: '9 min',
        content:
          'Your title and keywords are the discovery layer of your paper \u2014 they decide whether the right readers ever find it in the first place. You can write a brilliant study, but if nobody searching for that topic can locate it, the work goes unread.\n\nA good title is specific and informative rather than clever or vague. It should signal the topic clearly, and often the method, population, or setting too. Compare \u201cA Study of Learning\u201d with \u201cThe Effect of Weekly Feedback on First-Year Students\u2019 Essay Scores\u201d: the second tells a reader instantly whether the paper is relevant to them. Resist the temptation to be witty at the cost of clarity \u2014 humour rarely survives a database search.\n\nKeywords are the terms other researchers type into search engines and databases. Pick 4\u20136 that describe your main topic, method, field, and population. The skill is balance: they must be specific enough to capture your particular work, but common enough that people actually search for them. Where possible, use standard terms from your field rather than personal coinages.\n\nAvoid words that are too broad, such as \u201cresearch,\u201d \u201cstudy,\u201d \u201csystem,\u201d or \u201canalysis,\u201d because thousands of papers share them and they help no one narrow down to yours. A quick test for a keyword: would an expert in your area realistically type it into a search box when looking for work like yours? If not, replace it.',
        keyPoints: [
          'Title and keywords are the discovery layer — they decide whether the right readers find your work.',
          'A good title is specific and informative, signalling the topic and often the method or population.',
          'Pick 4–6 keywords that are specific enough to be useful but common enough that people search them.',
          'Avoid words that are too broad, such as "research", "study", "system", or "analysis".',
        ],
        example:
          'Compare "A Study of Learning" with "The Effect of Weekly Feedback on First-Year Students’ Essay Scores." The second instantly tells a searcher the topic, the intervention, and the population — so it surfaces for the people who actually need it.',
        mistakes: [
          'Choosing a clever or vague title at the cost of searchability.',
          'Using broad keywords that thousands of other papers also share.',
          'Inventing personal terms that no one would type into a search box.',
        ],
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
        duration: '9 min',
        content:
          'A myth trips up many students: that academic writing should sound complicated. The opposite is true. Good academic writing is clear, precise, and objective \u2014 its goal is to transfer an idea into the reader\u2019s mind with as little friction as possible. Reviewers reward clarity and quietly punish writing they have to read twice.\n\nSome practical habits make a big difference. Prefer short, direct sentences over long ones stuffed with clauses; if a sentence runs past three lines, it can usually be split. Use the active voice where it helps \u2014 \u201cWe measured the temperature\u201d is clearer than \u201cThe temperature was measured\u201d \u2014 though some fields still prefer the passive in Methods, so follow your field\u2019s convention. Define every technical term and abbreviation the first time you use it, because a reader who is lost on page two stops trusting the rest.\n\nAbove all, be specific. Vague intensifiers like \u201ca lot,\u201d \u201cvery,\u201d or \u201csignificantly\u201d (in the everyday sense) carry little information. \u201cImproved accuracy by 12%\u201d is far stronger than \u201cimproved accuracy a lot,\u201d because it can be checked and compared. Replace adjectives with numbers wherever you can.\n\nObjectivity matters too: let the evidence make your case rather than emotive language. The test of a good academic sentence is not how impressive it sounds, but whether a tired reader at the end of a long day understands it on the first pass.',
        keyPoints: [
          'Academic writing is judged by clarity, not by how complicated it sounds.',
          'Prefer short, direct sentences and the active voice where your field allows it.',
          'Define every technical term and abbreviation the first time you use it.',
          'Be specific: replace vague intensifiers ("a lot", "very") with concrete numbers.',
        ],
        example:
          'Weak: "The intervention facilitated a substantial amelioration of outcomes." Clear: "The training improved test scores by 12%." The second is shorter, specific, and instantly understood — and reviewers trust it more.',
        mistakes: [
          'Using long, fancy words to sound impressive instead of writing plainly.',
          'Leaving technical terms undefined so readers get lost early.',
          'Writing "improved a lot" instead of giving the actual figure.',
        ],
        takeaway:
          'Write clearly and precisely. Short sentences, defined terms, and specific numbers beat fancy words.',
      },
      {
        id: 'u3-why-cite',
        title: 'Why and when to cite',
        duration: '8 min',
        content:
          'Citation is the system that shows where your ideas and evidence came from. It does three jobs at once: it gives credit to the people who did the original work, it lets readers trace and verify your sources, and it places your study in the wider conversation of your field.\n\nThe core rule is broader than most students think. You must cite whenever you use a fact, a definition, a statistic, a method, a dataset, or another author\u2019s argument or idea \u2014 and this is true even when you put it entirely in your own words. Paraphrasing changes the wording, but the underlying idea still belongs to someone else, so it still needs a citation. A direct quotation needs a citation and quotation marks; a paraphrase needs a citation without them.\n\nThere is one clear exception: common knowledge. Facts that any educated person knows and that appear undisputed in many sources \u2014 for example, that water boils at 100\u00b0C at sea level, or that World War II ended in 1945 \u2014 do not need a citation. If you are unsure whether something counts as common knowledge in your field, the safe choice is to cite it.\n\nFar from cluttering your paper, good citation makes it more convincing. A well-referenced argument signals that you have read the relevant research and that your claims rest on evidence rather than opinion.',
        keyPoints: [
          'Cite facts, definitions, statistics, methods, data, and others’ ideas — even when paraphrased.',
          'Paraphrasing changes the words but not the ownership of the idea, so it still needs a citation.',
          'Common knowledge (widely known, undisputed facts) does not need a citation.',
          'Good citation makes your work more convincing, not more cluttered.',
        ],
        example:
          '"Water boils at 100°C at sea level" is common knowledge — no citation needed. But "weekly feedback improves essay scores by 12% (Tan, 2022)" reports a specific finding from a source, so it must be cited, even if you reword it.',
        mistakes: [
          'Citing only word-for-word copies and skipping citations for paraphrased ideas.',
          'Citing common knowledge unnecessarily, or failing to cite a real finding.',
          'Adding references you have not actually read just to look well-read.',
        ],
        takeaway:
          'Cite facts, definitions, statistics, methods, and others\u2019 ideas \u2014 even when paraphrased. Common knowledge needs no citation.',
      },
      {
        id: 'u3-referencing-styles',
        title: 'Referencing styles: APA, IEEE, Harvard',
        duration: '10 min',
        content:
          'Different fields have settled on different referencing styles, and part of writing for a journal is using the one it expects. The good news is that they all do the same job — point the reader to a full source — and differ mainly in formatting.\n\nAPA (common in psychology and the social sciences) is author–date: you write the author and year in the text, for example (Lee, 2021), and list sources alphabetically at the end. Harvard is also an author–date style, very similar to APA with small punctuation differences. IEEE (common in engineering and computer science) is numbered: you place a bracketed number like [1] in the text, and the reference list is ordered by first appearance. MLA (common in the humanities) uses author and page number, like (Lee 14).\n\nThe exact commas, italics, and brackets differ between them, but the single most important rule is the same for all: pick the style your target journal requires and apply it consistently across the entire paper and reference list. Switching styles halfway through, or formatting references inconsistently, is an immediate signal of carelessness to an editor.\n\nYou do not have to format every reference by hand. Reference managers such as Zotero, Mendeley, or EndNote store your sources, insert citations as you write, and reformat the whole bibliography into a different style with one click — a huge time-saver, especially if a journal rejects your paper and you need to resubmit elsewhere in a different format.',
        keyPoints: [
          'APA and Harvard are author–date (Lee, 2021); IEEE is numbered [1]; MLA uses author and page.',
          'The exact punctuation differs, but they all point the reader to a full source.',
          'The key rule: use the style your journal requires, consistently, across the whole paper.',
          'Reference managers (Zotero, Mendeley, EndNote) format and reformat citations for you.',
        ],
        example:
          'The same source in three styles: APA → (Lee, 2021); IEEE → [1]; MLA → (Lee 14). If your journal uses IEEE, every in-text citation must be a bracketed number matching a numbered list — mixing in an author–date citation signals carelessness.',
        mistakes: [
          'Switching reference styles partway through the paper.',
          'Formatting references inconsistently (some with italics, some without).',
          'Formatting dozens of references by hand instead of using a reference manager.',
        ],
        takeaway:
          'Use the style your journal requires (APA, IEEE, Harvard, MLA) and stay consistent. Reference managers help.',
      },
      {
        id: 'u3-paraphrase',
        title: 'Paraphrasing and quoting properly',
        duration: '9 min',
        content:
          'Paraphrasing means expressing another author\u2019s idea in your own words, and it is the main way you should bring sources into your writing. But there is a right and a wrong way to do it.\n\nGood paraphrasing changes both the wording and the sentence structure, not just a few scattered words. The real test is comprehension: read the original, look away, and write the idea from memory in your own voice \u2014 then check you have not drifted into copying. And crucially, a paraphrase still needs a citation. Rephrasing changes the words, but the idea is still the original author\u2019s, so credit is still owed.\n\nDirect quotation is for the rare cases where the exact words matter: a precise definition, a legal or technical phrase, or a claim so memorable that rewording it would lose its force. Keep quotes short, put them inside quotation marks, and give a citation (often with a page number). A paper stuffed with long quotes suggests you are hiding behind your sources rather than engaging with them.\n\nThe dangerous middle ground is \u201cpatchwriting\u201d: changing only a few words of a source \u2014 swapping synonyms, shuffling a clause \u2014 while keeping its sentence structure intact. Many students think this is safe paraphrasing, but it still counts as plagiarism, because the structure and substance remain the original author\u2019s. The fix is to understand the idea fully, then rebuild the sentence from scratch.',
        keyPoints: [
          'Good paraphrasing changes both the wording and the sentence structure — and still needs a citation.',
          'A reliable test: read, look away, and rewrite the idea from memory in your own voice.',
          'Quote directly only when exact words matter; keep quotes short and in quotation marks with a citation.',
          'Patchwriting (swapping a few words, keeping the structure) still counts as plagiarism.',
        ],
        example:
          'Source: "Regular feedback improves student writing." Patchwriting (bad): "Frequent feedback enhances student writing." A real paraphrase: "Students write better when they receive feedback often throughout a course (Tan, 2022)." The structure and wording are genuinely rebuilt, and the source is credited.',
        mistakes: [
          'Swapping a few synonyms while keeping the original sentence structure (patchwriting).',
          'Paraphrasing correctly but forgetting the citation.',
          'Relying on long block quotes instead of explaining ideas in your own words.',
        ],
        takeaway:
          'Paraphrasing needs a citation and a full rewrite. Quote sparingly, in quotation marks, with a citation.',
      },
      {
        id: 'u3-plagiarism',
        title: 'Understanding plagiarism',
        duration: '9 min',
        content:
          'Plagiarism is presenting someone else\u2019s work or ideas as if they were your own. It is the most serious breach of academic integrity, and it comes in more forms than the obvious copy-and-paste.\n\nThe clearest form is copying text without citation. But plagiarism also includes patchwriting (changing a few words while keeping the source\u2019s structure), using someone\u2019s data, figures, or code without credit, and even \u201cself-plagiarism\u201d \u2014 reusing chunks of your own previously published work without telling the reader. Self-plagiarism surprises people, but reusing material as if it were new misleads readers and can breach copyright you signed over to an earlier publisher.\n\nImportantly, plagiarism does not require bad intent. A great deal of it is accidental, caused by poor note-taking \u2014 for example, pasting a source into your notes and later forgetting it was not your own wording \u2014 or by sloppy, last-minute citation. Unfortunately, intent does not undo the breach: accidental plagiarism is still treated seriously and can lead to a paper being rejected, retracted, or referred to a disciplinary process.\n\nThe defence is good habits, not good luck. As you research, keep notes that clearly separate quotations, paraphrases, and your own ideas (different colours or labels work well). Record the full source for everything the moment you save it. And cite as you write, not afterwards \u2014 reconstructing where each idea came from at the end is exactly when mistakes creep in.',
        keyPoints: [
          'Plagiarism is presenting someone else\u2019s work or ideas as your own \u2014 in any form.',
          'It includes copying, patchwriting, using others\u2019 data/figures, and self-plagiarism.',
          'Intent does not matter: accidental plagiarism is still treated seriously.',
          'Defend yourself with good habits: clear notes and citing as you write.',
        ],
        example:
          'A student pastes a definition into their notes, forgets it was copied, and later submits it as their own wording. There was no intent to cheat, but it is still plagiarism \u2014 which is why keeping quotes clearly marked in your notes matters so much.',
        mistakes: [
          'Pasting source text into notes without marking it, then losing track of what was copied.',
          'Reusing your own previously submitted work without saying so (self-plagiarism).',
          'Leaving all citation to the end, when it is easiest to misattribute ideas.',
        ],
        takeaway:
          'Plagiarism includes copying, patchwriting, using others\u2019 data, and reusing your own work without saying so. Cite as you write.',
      },
      {
        id: 'u3-ai-tools',
        title: 'Using AI tools responsibly',
        duration: '9 min',
        content:
          'AI writing tools such as large language models can genuinely help — brainstorming ideas, checking grammar, suggesting clearer phrasing, or explaining an unfamiliar concept. But using them in research carries real responsibilities, and the rules are tightening quickly.\n\nFirst, disclosure. Many journals now require you to state if and how you used AI tools, usually in the methods or acknowledgements. Be honest about it. Second, authorship: AI must never be listed as an author. Authorship implies accountability for the work, and a tool cannot take responsibility, so you — the human author — remain fully responsible for every word.\n\nThird, and most important for credibility: AI can produce confident, fluent, and completely wrong information. It is well known for inventing realistic-looking but non-existent references, misstating facts, and fabricating quotations. You must independently verify every fact, number, and citation an AI gives you, ideally against the original source. If you cannot find and confirm a reference yourself, do not use it.\n\nFourth, confidentiality. Never paste confidential, unpublished, or personal data — your own unpublished results, a manuscript you are reviewing, or participants’ information — into public AI tools, because that data may be stored or used to train the model. Treat AI as an assistant that supports your thinking, not a replacement for it: the ideas, judgement, and integrity must remain yours.',
        keyPoints: [
          'Disclose if and how you used AI tools — many journals now require it.',
          'AI must never be listed as an author; you remain responsible for every word.',
          'AI invents confident but false facts and fake references — verify everything yourself.',
          'Never paste confidential or unpublished data into public AI tools.',
        ],
        example:
          'A student asks an AI for sources and it returns three realistic-looking citations. Two do not exist. Because the student checked each one in the library database before using them, the fake references never made it into the paper — exactly the habit that protects your credibility.',
        mistakes: [
          'Trusting AI-generated references without checking they are real.',
          'Pasting an unpublished manuscript or dataset into a public AI tool.',
          'Letting AI do the thinking instead of using it to support your own.',
        ],
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
        duration: '9 min',
        content:
          'Experienced reviewers almost never start by reading a paper word for word. They begin with a first-pass read designed to build a mental map before diving into detail.\n\nIn this first pass, you read the title, the abstract, the introduction, the figures and tables, and the conclusion \u2014 skimming or skipping the dense middle for now. This quickly tells you three things: what problem the paper tackles, what the authors claim they contribute, and whether the work even fits the journal\u2019s scope. Looking at the figures early is especially powerful, because well-made figures often reveal the core story of a paper faster than the prose does.\n\nAfter this pass, adopt one habit that separates good reviewers from sloppy ones: write a short 4\u20135 sentence summary of the paper in your own words. Capture the main question, the method, what is new, and what the paper does well. This forces you to actually understand the work before judging it, and the summary itself becomes the opening of your review report \u2014 showing the author you read carefully.\n\nThere is a bonus diagnostic here. If you find you cannot summarise the paper after a fair first-pass read, that is rarely your fault \u2014 it usually means the paper is not communicating clearly, and that observation is itself valuable, constructive feedback you can pass on to the author.',
        keyPoints: [
          'Start with a first-pass read: title, abstract, introduction, figures, and conclusion.',
          'Looking at figures early often reveals the core story faster than the prose.',
          'Write a 4–5 sentence summary in your own words before judging the paper.',
          'If you cannot summarise it, that is useful feedback about the paper’s clarity.',
        ],
        example:
          'A reviewer skims a paper and writes: "This study tests whether peer feedback improves essays; it uses a 12-week trial of 80 students; the new finding is a 12% gain; the method looks solid." That four-sentence summary becomes the opening of their review and proves they understood the work.',
        mistakes: [
          'Reading every word from the start instead of mapping the paper first.',
          'Skipping the summary step and diving straight into nitpicks.',
          'Ignoring the figures, which often carry the main result.',
        ],
        takeaway:
          'Skim title, abstract, intro, figures, and conclusion first, then write a 4\u20135 sentence summary in your own words.',
      },
      {
        id: 'u4-evaluate-sections',
        title: 'Evaluating each section',
        duration: '11 min',
        content:
          'Once you understand the paper as a whole, do a deeper read and evaluate each section against the question it is supposed to answer.\n\nIntroduction: is the research problem clearly stated, and is the gap it addresses convincing? Do you actually believe this study was needed? Methods: is the design appropriate for the question, and \u2014 the crucial test \u2014 is it described in enough detail that someone could repeat it? Watch for missing sample sizes, undefined measures, or vague procedures. Results: do the data genuinely support the claims, or are the conclusions stretched beyond what the numbers show? Are the figures and tables clear, correctly labelled, and consistent with the text? Discussion: are the interpretations justified by the results, are comparisons with prior work fair, and are the limitations stated honestly rather than hidden?\n\nBeyond the IMRaD core, check that the citations are appropriate and current (not just the authors citing themselves), and confirm the paper genuinely fits the journal\u2019s scope.\n\nThroughout, deliberately note strengths as well as weaknesses. A review that is only a list of complaints is unbalanced and unfair, and it is less useful to the editor, who needs to weigh the good against the bad. Recording what the paper does well also helps the author keep those strengths during revision. Aim for a clear-eyed, balanced judgement \u2014 not a hunt for things to attack.',
        keyPoints: [
          'Introduction: is the problem and the gap clear? Methods: appropriate and repeatable?',
          'Results: do the data actually support the claims? Discussion: conclusions justified, limits honest?',
          'Check that citations are appropriate and the paper fits the journal\u2019s scope.',
          'Note strengths as well as weaknesses \u2014 a good review is balanced, not just complaints.',
        ],
        example:
          'Evaluating a Methods section, a reviewer notices the sample size is missing. That is a major issue (you cannot judge reliability without it). A typo in a figure caption is a minor issue. Separating the two tells the editor what truly matters.',
        mistakes: [
          'Listing only complaints and never acknowledging what the paper does well.',
          'Accepting claims that the data do not actually support.',
          'Judging on reputation or topic preference rather than the evidence.',
        ],
        takeaway:
          'Check each section: clear problem, repeatable method, claims supported by data, honest limitations.',
      },
      {
        id: 'u4-review-report',
        title: 'Writing a structured review report',
        duration: '11 min',
        content:
          'A good review report is organised so the editor and author can act on it easily. The standard structure has four parts.\n\nFirst, a short summary of the paper in your own words. This proves to the author that you understood their work and sets a respectful, professional tone before any criticism. Second, the major issues: problems that genuinely affect the paper’s validity and must be fixed — a flawed method, a claim the data do not support, a missing control, or a conclusion that overreaches. Third, the minor issues: smaller fixes that improve clarity but do not threaten the findings, such as typos, an unclear figure, an unlabelled axis, or a missing reference. Separating major from minor is one of the most helpful things you can do, because it tells the author (and editor) what is essential versus cosmetic.\n\nFourth, your recommendation: accept, minor revision, major revision, or reject. Make sure it is consistent with your comments — a glowing review that ends in “reject” confuses everyone.\n\nTwo habits make a report far more usable. Number your comments, so the author can respond to each one point by point in their revision letter. And be specific: refer to exact pages, sections, figures, or line numbers rather than saying “somewhere in the methods.” Finally, remember that many journals let you send confidential comments to the editor separately from the comments the author sees — use that channel for sensitive concerns, not the open report.',
        keyPoints: [
          'A review report has four parts: summary, major issues, minor issues, recommendation.',
          'Major issues affect validity and must be fixed; minor issues are smaller clarity fixes.',
          'Number your comments and refer to exact pages, sections, figures, or lines.',
          'Make the recommendation consistent with your comments; use confidential editor notes for sensitive points.',
        ],
        example:
          'A tidy report: "Summary: …(2 lines). Major: (1) Methods omit sample size, p.3. Minor: (a) Fig. 2 axis unlabelled; (b) typo p.5. Recommendation: minor revision." Numbered and specific, so the author can respond point by point.',
        mistakes: [
          'Mixing major and minor issues into one undifferentiated list.',
          'Vague comments like "the methods are unclear" with no page or detail.',
          'A glowing review that ends in "reject" (recommendation contradicts the comments).',
        ],
        takeaway:
          'Structure a review as: summary, major issues, minor issues, recommendation. Number comments and be specific.',
      },
      {
        id: 'u4-constructive',
        title: 'Giving constructive, fair feedback',
        duration: '10 min',
        content:
          'The difference between a feared reviewer and a respected one is not how harsh they are \u2014 it is how useful they are. Good reviewer comments are specific, polite, and actionable.\n\nA reliable formula for any criticism has three parts: say what the issue is, explain why it matters, and suggest how the author could fix it. Compare two comments on the same problem. \u201cThis paper is bad and confusing\u201d helps no one \u2014 it is vague, rude, and impossible to act on. Now: \u201cThe Methods section does not state the sample size, so readers cannot judge whether the results are reliable \u2014 please add the number of participants and how they were selected.\u201d The second names the problem, explains the consequence, and points to a concrete fix. The author knows exactly what to do.\n\nKeep the tone professional and impersonal. Critique the work, never the person: write \u201cthe argument in Section 3 is hard to follow,\u201d not \u201cyou are a careless writer.\u201d Avoid sarcasm and dismissive language, even when the paper frustrates you. Your job is to be fair, objective, and genuinely helpful \u2014 to improve the work \u2014 not to show off your own expertise or prove the author wrong.\n\nAbove all, remember there is a real person on the other end, often a nervous student or early-career researcher, who will read every word. Write the kind of review you would want to receive: honest about the flaws, but encouraging and respectful about how to fix them.',
        keyPoints: [
          'For each issue, say what it is, why it matters, and how the author could fix it.',
          'Critique the work, never the person; avoid sarcasm and dismissive language.',
          'Be specific and actionable rather than vague.',
          'Remember a real person — often a nervous student — will read every word.',
        ],
        example:
          'Unhelpful: "This paper is bad and confusing." Constructive: "The Methods section does not state the sample size, so readers cannot judge reliability — please add the number of participants and how they were selected." The second names the issue, the consequence, and the fix.',
        mistakes: [
          'Vague verdicts ("needs work") that the author cannot act on.',
          'Attacking the author personally instead of the work.',
          'Showing off your own expertise rather than helping improve the paper.',
        ],
        takeaway:
          'Say what the issue is, why it matters, and how to fix it. Be specific, polite, and fair \u2014 never personal.',
      },
      {
        id: 'u4-reviewer-ethics',
        title: 'Reviewer ethics and confidentiality',
        duration: '9 min',
        content:
          'Being asked to review is a position of trust, and that trust comes with clear ethical duties. Breaking them damages not just one paper but the whole system of peer review.\n\nConfidentiality comes first. A manuscript under review is a private, unpublished document. You must not share it with anyone, post it online, pass it to a student or colleague, or use its ideas, data, or results in your own work before it is published. Reading someone\u2019s unpublished findings and then racing to publish the same idea is a serious breach.\n\nNext, declare conflicts of interest. If you cannot judge the paper impartially \u2014 the author is a close friend, a direct competitor, a recent collaborator, or someone at your own institution \u2014 tell the editor. Depending on the situation, you may need to decline the review. It is the editor\u2019s job to decide, but only if you are honest about the conflict.\n\nReview on time. Authors\u2019 careers, graduations, and funding can hinge on a decision, so late reviews cause real harm. If you accept, meet the deadline; if you cannot, tell the editor early so they can find someone else. Finally, stay within your competence. If part of a paper \u2014 a statistical method, say \u2014 is outside your expertise, say so plainly rather than bluffing a judgement; the editor can seek another reviewer for that part. Honesty about what you cannot assess is a strength, not a weakness, and it keeps the whole process fair and trustworthy.',
        keyPoints: [
          'A manuscript under review is confidential — never share it or use its ideas before publication.',
          'Declare conflicts of interest (close colleague, competitor, collaborator) to the editor.',
          'Review on time, or tell the editor early if you cannot.',
          'If part of a paper is outside your expertise, say so rather than bluffing.',
        ],
        example:
          'You are asked to review a paper by a close collaborator from last year. Rather than reviewing it and quietly giving a high score, you email the editor about the conflict of interest and let them decide whether you should step aside.',
        mistakes: [
          'Sharing or reusing ideas from a manuscript before it is published.',
          'Reviewing a paper despite a clear conflict of interest.',
          'Bluffing a judgement on a method you are not qualified to assess.',
        ],
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
        duration: '9 min',
        content:
          'Choosing where to submit is a real decision, not an afterthought \u2014 and getting it wrong wastes months. Before submitting, pick a journal or conference that matches your topic, scope, and quality level.\n\nDo your homework on each candidate. Read the aim and scope statement to confirm your topic fits. Check which article types they accept (full papers, short papers, case studies). Look at a few recent papers they have actually published: are they similar in subject and depth to yours? This \u201cfit\u201d check matters because submitting to the wrong venue is one of the most common causes of desk rejection, where an editor returns your paper within days without review.\n\nBe especially careful of \u201cpredatory\u201d journals. These outlets promise very fast publication in exchange for a fee but provide little or no real peer review, and having your work there can actually harm your reputation. Warning signs include aggressive email invitations, promises to publish within days, fake or hidden editorial boards, and titles that imitate well-known journals. Protect yourself by checking that a journal is properly indexed (for example in Scopus, Web of Science, or DOAJ) and has a genuine, named editorial board you can verify.\n\nOn JSRMS, the platform helps with this first step: its AI assistant reads your abstract and suggests a suitable research category and likely reviewer match, so your paper is routed to people who can actually evaluate it.',
        keyPoints: [
          'Match your paper to a venue by topic, scope, and quality level before submitting.',
          'Read the aim and scope and check a few recent papers — wrong fit is a top cause of desk rejection.',
          'Avoid predatory journals: check for proper indexing and a real, named editorial board.',
          'On JSRMS, the AI suggests a category and reviewer match from your abstract.',
        ],
        example:
          'You get an email promising publication "within 72 hours" for a fee, from a journal whose editorial board you cannot verify. That is a classic predatory journal — checking Scopus/DOAJ shows it is not indexed, so you avoid it and submit to a properly indexed venue instead.',
        mistakes: [
          'Submitting to a journal whose scope does not match your topic.',
          'Falling for a predatory journal that promises fast publication for a fee.',
          'Never reading any of the journal’s recent papers before submitting.',
        ],
        takeaway:
          'Match your paper to a real, in-scope venue. Avoid predatory journals. JSRMS suggests a category from your abstract.',
      },
      {
        id: 'u5-prepare',
        title: 'Preparing a complete submission',
        duration: '10 min',
        content:
          'A submission is more than just the manuscript file. A complete package usually includes the manuscript itself, a separate abstract, a set of keywords, full author details and affiliations, and often a cover letter. Some venues also ask for ethics approval statements, data-availability statements, or a declaration of any conflicts of interest.\n\nThe cover letter is short but worth doing well. In a paragraph or two it tells the editor what the paper is about, why it fits the journal’s scope, and why it matters — it is your chance to make a good first impression before anyone opens the manuscript.\n\nBefore you click submit, run through a final checklist. Is the formatting correct for this journal (margins, font, section order, reference style)? Is the word count within the limit? Are all references complete, accurate, and in the required style? Are all figures and tables numbered, labelled, and referred to in the text? Have all authors agreed on who is included and in what order? Are the required ethics or data statements present?\n\nThis step feels tedious, but it pays off: a large share of rejections and delays come from avoidable preparation mistakes rather than from weak science. An editor who sees a sloppy, incomplete submission may doubt the rigour of the research itself. Ten minutes with a checklist can save you weeks of back-and-forth.',
        keyPoints: [
          'A complete package: manuscript, abstract, keywords, author details, and often a cover letter.',
          'The cover letter says what the paper is about and why it fits the journal.',
          'Run a final checklist: formatting, word count, references, labelled figures, author order, ethics statements.',
          'Many rejections come from avoidable preparation mistakes, not weak science.',
        ],
        example:
          'Before submitting, a student ticks off: formatting matches the template, word count under 6,000, all references in IEEE style, every figure labelled, all four authors agreed in order, ethics statement included. The clean package gives the editor confidence in the work itself.',
        mistakes: [
          'Submitting without a cover letter or required ethics/data statements.',
          'Ignoring the journal’s formatting and word-count limits.',
          'Sorting out author names and order only after submission.',
        ],
        takeaway:
          'Prepare manuscript, abstract, keywords, author details, and cover letter. Run a final checklist before submitting.',
      },
      {
        id: 'u5-submit-steps',
        title: 'The JSRMS submission steps',
        duration: '9 min',
        content:
          'JSRMS breaks submission into three clear, guided steps, so you always know where you are in the process.\n\nStep 1 \u2014 Paper Details. You enter your title, abstract, research category, and keywords. As you paste your abstract, the AI assistant reads it and suggests a suitable category and a likely reviewer match, which helps your paper reach the right experts. Take care with the title and abstract here, since they shape both classification and first impressions.\n\nStep 2 \u2014 Upload Manuscript. You upload your manuscript PDF and any supporting files (datasets, figures, appendices), and you can optionally attach a cover letter to the editor. Check that you are uploading the final version and that the file meets the format and size limits shown.\n\nStep 3 \u2014 Review & Submit. The system shows everything you have entered so you can check it one last time. When you are satisfied, you submit. After submitting, you receive a confirmation and the paper appears on your dashboard, where you can track its progress.\n\nA helpful safety net: you can save a draft at any step and come back later, so you do not have to complete everything in one sitting. On JSRMS, successfully publishing one paper through this process is also the final mandatory step in earning your training certificate, so this is where your training turns into real, published work.',
        keyPoints: [
          'Step 1 — Paper Details: title, abstract, category, keywords (AI suggests a category and reviewers).',
          'Step 2 — Upload Manuscript: your PDF, supporting files, and an optional cover letter.',
          'Step 3 — Review & Submit: check everything, then submit and track it on your dashboard.',
          'You can save a draft at any step and return later.',
        ],
        example:
          'A student pastes their abstract in Step 1 and the AI suggests "Computer Science — AI & ML"; they upload the PDF in Step 2, review the summary in Step 3, and submit. The paper immediately appears on their dashboard marked "Submitted."',
        mistakes: [
          'Uploading a draft version instead of the final manuscript.',
          'Ignoring the file format or size limits shown at upload.',
          'Rushing Step 3 without checking the entered details one last time.',
        ],
        takeaway:
          'JSRMS submission = Step 1 details, Step 2 upload, Step 3 review and submit. You can save a draft anytime.',
      },
      {
        id: 'u5-status',
        title: 'Tracking your review status',
        duration: '8 min',
        content:
          'After you submit, your paper does not vanish into a black box \u2014 JSRMS shows its progress as a series of statuses on your dashboard. Understanding what each one means saves a lot of needless worry.\n\n"Submitted" means your paper has arrived and is waiting for the editor\u2019s initial check for scope and basic quality. "Under Review" means it passed that check and reviewers are now evaluating it in detail \u2014 this is usually the longest stage. "Decision Pending" means the reviews are in and the editor is weighing them to reach a decision. Finally you receive a decision: accept, minor revision, major revision, or reject.\n\nThe single most important thing to understand is that review takes time. Reviewers are busy researchers fitting your paper around their own work, so a status of "Under Review" lasting several weeks \u2014 sometimes a couple of months \u2014 is completely normal and is not a sign that anything is wrong. Resist the urge to read meaning into silence or to email the editor repeatedly; a polite status query is reasonable only after the journal\u2019s stated review time has clearly passed.\n\nKnowing the map of statuses lets you stay calm, plan around realistic timelines, and focus your energy on your next piece of work while the current one is being assessed.',
        keyPoints: [
          'Dashboard statuses: Submitted → Under Review → Decision Pending → Decision.',
          '"Submitted" awaits the editor’s initial check; "Under Review" means reviewers are evaluating it.',
          'Review takes time — "Under Review" for several weeks is completely normal.',
          'A polite status query is reasonable only after the journal’s stated review time has passed.',
        ],
        example:
          'A student panics when their paper sits at "Under Review" for six weeks. In fact that is normal — reviewers are busy researchers. They wait until the journal’s stated 8-week review window passes, then send one polite query rather than emailing repeatedly.',
        mistakes: [
          'Reading a long "Under Review" period as a sign something is wrong.',
          'Emailing the editor repeatedly before the stated review time has passed.',
          'Assuming silence means rejection.',
        ],
        takeaway:
          'Dashboard statuses: Submitted \u2192 Under Review \u2192 Decision Pending \u2192 Decision. Waiting weeks is normal.',
      },
      {
        id: 'u5-respond',
        title: 'Responding to reviewer decisions',
        duration: '11 min',
        content:
          'Receiving a \u201crevise\u201d decision can feel discouraging, but it is actually good news: the editor is interested enough to give your paper another chance. Do not panic, and do not give up \u2014 the overwhelming majority of published papers went through at least one round of revision. A request for changes is an invitation, not a rejection.\n\nThe professional way to respond is a response letter, often built as a response table. For every reviewer comment, you do three things: quote the comment in full, explain exactly what you changed in the paper, and point to where you changed it (page, section, or line). This makes it effortless for the editor and reviewers to see that you took each point seriously.\n\nRespond to every single comment, even the ones you disagree with \u2014 never silently ignore one. When you genuinely disagree, it is acceptable to push back, but do it politely and with evidence: explain your reasoning, cite a source, or show data, rather than simply refusing. Reviewers are usually persuadable when you make a reasoned case.\n\nTone matters enormously. Thank the reviewers for their time at the start, stay courteous throughout even when a comment seems unfair, and frame everything around improving the paper. A clear, respectful, point-by-point response often does as much to win acceptance as the changes themselves, because it shows the editor you are a careful, cooperative author who is easy to work with. Then make sure the revised manuscript actually reflects every change you described.',
        keyPoints: [
          'A "revise" decision is an invitation, not a rejection — most papers are revised at least once.',
          'Reply with a response table: quote each comment, say what you changed, and where (page/section).',
          'Respond to every comment, even ones you disagree with — push back politely, with evidence.',
          'Stay courteous and thank the reviewers; tone affects acceptance as much as the changes.',
        ],
        example:
          'Reviewer: "Sample size is missing." Response: "Thank you — we have added the sample size (120 students) and selection method to the Methods, p.4, para 2." Quoting, fixing, and pointing to the location makes it easy for the editor to see you took the comment seriously.',
        mistakes: [
          'Silently ignoring comments you disagree with instead of explaining your reasoning.',
          'Reacting defensively or rudely to criticism.',
          'Saying you changed something but not actually updating the manuscript.',
        ],
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
