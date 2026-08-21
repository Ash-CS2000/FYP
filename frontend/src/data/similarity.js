// src/data/similarity.js
//
// Mock similarity reports plus the shape the backend is expected to serve. The
// editor screening table, the report screen, the author self-check and the admin
// threshold settings all read this, so the four can't drift apart.
//
// The endpoints live in api/similarity.js — read that first for how the Django
// layer relates to noplag-engine.
//
// ── SimilarityReport ─────────────────────────────────────────────────────────
//   id                      string   the check id, not the manuscript id
//   manuscript_id           string
//   status                  'queued' | 'running' | 'done' | 'failed'
//   overall_similarity_pct  number   0–100, one decimal. Server-computed with the
//                                    exclusions applied — never re-derive it in
//                                    the UI or the two numbers will diverge.
//   checked_at              ISO 8601 | null
//   engine_version          string
//   error                   string | null   set when status is 'failed'
//   exclusions              { quotes, bibliography, min_words }  what the server
//                                    applied when producing this total
//   sources                 MatchedSource[]  descending by similarity_pct
//
// ── MatchedSource ────────────────────────────────────────────────────────────
//   id              string
//   title           string
//   url             string | null
//   source_type     'submission' | 'journal' | 'web' | 'thesis'
//                   'submission' means another paper in PaperBridge's own corpus
//   similarity_pct  number   this source's share of the manuscript
//   matched_chars   number
//   passages        [{ query_excerpt, source_excerpt }]  the aligned character
//                   ranges, rendered side by side
//
// ── ScreeningSettings ────────────────────────────────────────────────────────
//   review_threshold      number  at or above this → 'review' band
//   high_threshold        number  at or above this → 'high' band (flagged)
//   exclude_quotes        boolean
//   exclude_bibliography  boolean
//   min_words             number  ignore matches shorter than this
//   auto_flag             boolean whether crossing high_threshold flags for the
//                                 editor automatically
//
// NOTE ON WORDING: the engine matches verbatim reuse. A high number means "a
// human should look at this", not "this is plagiarism". Quoted material, standard
// methods boilerplate and reference lists all score. Never label a score as a
// finding of misconduct anywhere in the UI.

const SETTINGS_KEY = 'paperbridge-screening-settings';

export const DEFAULT_THRESHOLDS = { review: 15, high: 25 };

export const DEFAULT_SCREENING_SETTINGS = {
  review_threshold: DEFAULT_THRESHOLDS.review,
  high_threshold: DEFAULT_THRESHOLDS.high,
  exclude_quotes: true,
  exclude_bibliography: true,
  min_words: 8,
  auto_flag: true,
};

export const BAND_LABELS = {
  clear:  'Clear',
  review: 'Review',
  high:   'Flagged',
};

// Same idiom as RECOMMENDATION_TONE in data/reviews.js — reuses existing vars, so
// nothing here needs a styles.css change.
export const SIMILARITY_TONE = {
  clear:  { bg: 'var(--teal-50)',  fg: 'var(--teal-800)' },
  review: { bg: 'var(--amber-50)', fg: 'var(--amber-800)' },
  high:   { bg: 'var(--red-50)',   fg: 'var(--red-800)' },
};

export const BAND_HINTS = {
  clear:  'Within the normal range for citations and standard phrasing.',
  review: 'Worth a look before assigning reviewers — often quotes or boilerplate.',
  high:   'Substantial overlap. Read the matched passages before making a decision.',
};

/**
 * Which band a percentage falls into.
 * @param {number} pct
 * @param {object} [thresholds] { review, high } — pass the admin's settings to
 *                 re-band existing reports without re-running any check.
 */
export function bandFor(pct, thresholds = DEFAULT_THRESHOLDS) {
  const value = Number(pct);
  if (!Number.isFinite(value)) return null;
  if (value >= thresholds.high) return 'high';
  if (value >= thresholds.review) return 'review';
  return 'clear';
}

/** Pull just the two numbers out of a ScreeningSettings record. */
export function thresholdsFrom(settings = DEFAULT_SCREENING_SETTINGS) {
  return {
    review: Number(settings.review_threshold ?? DEFAULT_THRESHOLDS.review),
    high: Number(settings.high_threshold ?? DEFAULT_THRESHOLDS.high),
  };
}

// ── Local fallback ───────────────────────────────────────────────────────────
// The backend is often unavailable during development, so the admin's threshold
// edits persist locally and every other screen reads them back. Same pattern as
// data/trainingProgress.js. Once /api/analysis/settings/ exists the server is the
// source of truth and this is only the offline fallback.

export function loadLocalSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SCREENING_SETTINGS };
    return { ...DEFAULT_SCREENING_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SCREENING_SETTINGS };
  }
}

export function saveLocalSettings(settings) {
  const merged = { ...DEFAULT_SCREENING_SETTINGS, ...settings };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch {
    /* storage unavailable — the in-memory value still applies for this session */
  }
  return merged;
}

// ── Mock reports ─────────────────────────────────────────────────────────────
// Keyed by manuscript id. Keys match MANUSCRIPTS in data/reviews.js and the rows
// in pages/EditorSubmissions.jsx.

export const REPORTS = {
  // Review band — mostly the author's own earlier workshop paper.
  'MS-2026-014': {
    id: 'chk-2026-0141',
    manuscript_id: 'MS-2026-014',
    status: 'done',
    overall_similarity_pct: 18.4,
    checked_at: '2026-01-12T09:41:00Z',
    engine_version: 'noplag-engine 0.4.1',
    error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [
      {
        id: 'src-014-1',
        title: 'Transformer Architectures for Diagnostic Imaging (workshop paper)',
        url: null,
        source_type: 'submission',
        similarity_pct: 11.2,
        matched_chars: 4830,
        passages: [
          {
            query_excerpt: 'We evaluate three families of architectures — convolutional, transformer, and hybrid — across three publicly available medical imaging benchmarks.',
            source_excerpt: 'We evaluate three families of architectures — convolutional, transformer, and hybrid — across three publicly available medical imaging benchmarks.',
          },
          {
            query_excerpt: 'All models were trained for 120 epochs using AdamW with a cosine decay schedule and a base learning rate of 3e-4.',
            source_excerpt: 'Models were trained for 120 epochs using AdamW with a cosine decay schedule and a base learning rate of 3e-4.',
          },
        ],
      },
      {
        id: 'src-014-2',
        title: 'A Review of Deep Learning in Radiology, Journal of Medical Informatics',
        url: 'https://example.org/jmi/2024/deep-learning-radiology',
        source_type: 'journal',
        similarity_pct: 5.1,
        matched_chars: 2190,
        passages: [
          {
            query_excerpt: 'Convolutional neural networks remain the dominant approach for diagnostic classification tasks in radiology and pathology.',
            source_excerpt: 'Convolutional neural networks remain the dominant approach for diagnostic classification tasks in radiology and pathology.',
          },
        ],
      },
      {
        id: 'src-014-3',
        title: 'MIMIC-CXR dataset documentation',
        url: 'https://example.org/datasets/mimic-cxr',
        source_type: 'web',
        similarity_pct: 2.1,
        matched_chars: 890,
        passages: [
          {
            query_excerpt: 'The dataset comprises 377,110 chest radiographs associated with 227,835 imaging studies.',
            source_excerpt: 'The dataset comprises 377,110 chest radiographs associated with 227,835 imaging studies.',
          },
        ],
      },
    ],
  },

  // High band — needs a human before it goes anywhere near reviewers.
  'MS-2026-008': {
    id: 'chk-2026-0081',
    manuscript_id: 'MS-2026-008',
    status: 'done',
    overall_similarity_pct: 34.2,
    checked_at: '2025-12-22T14:08:00Z',
    engine_version: 'noplag-engine 0.4.1',
    error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [
      {
        id: 'src-008-1',
        title: 'Quantum Annealing for Combinatorial Optimisation: A Survey',
        url: 'https://example.org/arxiv/2408.11234',
        source_type: 'journal',
        similarity_pct: 24.7,
        matched_chars: 11420,
        passages: [
          {
            query_excerpt: 'Variational quantum algorithms occupy a middle ground between purely classical heuristics and fault-tolerant quantum computation, and are therefore the most plausible near-term route to practical advantage.',
            source_excerpt: 'Variational quantum algorithms occupy a middle ground between purely classical heuristics and fault-tolerant quantum computation, and are therefore the most plausible near-term route to practical advantage.',
          },
          {
            query_excerpt: 'The QAOA ansatz alternates between a cost Hamiltonian and a mixing Hamiltonian for p rounds, where p controls the expressivity of the resulting circuit.',
            source_excerpt: 'The QAOA ansatz alternates between a cost Hamiltonian and a mixing Hamiltonian for p rounds, where p controls the expressivity of the resulting circuit.',
          },
          {
            query_excerpt: 'Despite considerable interest, no experiment to date has demonstrated an unambiguous speedup on a problem of practical scale.',
            source_excerpt: 'Despite considerable interest, no experiment has yet demonstrated an unambiguous speedup on a problem of practical scale.',
          },
        ],
      },
      {
        id: 'src-008-2',
        title: 'Practical Quantum Computing for Logistics (doctoral thesis)',
        url: null,
        source_type: 'thesis',
        similarity_pct: 7.3,
        matched_chars: 3380,
        passages: [
          {
            query_excerpt: 'Scheduling and vehicle routing are natural candidates because both admit compact QUBO formulations.',
            source_excerpt: 'Scheduling and vehicle routing are natural candidates since both admit compact QUBO formulations.',
          },
        ],
      },
      {
        id: 'src-008-3',
        title: 'Introduction to Quantum Optimization (course notes)',
        url: 'https://example.org/courses/quantum-opt',
        source_type: 'web',
        similarity_pct: 2.2,
        matched_chars: 1010,
        passages: [
          {
            query_excerpt: 'An NP-hard problem is one to which every problem in NP can be reduced in polynomial time.',
            source_excerpt: 'An NP-hard problem is one to which every problem in NP can be reduced in polynomial time.',
          },
        ],
      },
    ],
  },

  // Clear.
  'MS-2026-011': {
    id: 'chk-2026-0111',
    manuscript_id: 'MS-2026-011',
    status: 'done',
    overall_similarity_pct: 4.1,
    checked_at: '2026-01-18T11:22:00Z',
    engine_version: 'noplag-engine 0.4.1',
    error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [
      {
        id: 'src-011-1',
        title: 'FAO Statistical Yearbook 2024',
        url: 'https://example.org/fao/yearbook-2024',
        source_type: 'web',
        similarity_pct: 4.1,
        matched_chars: 1560,
        passages: [
          {
            query_excerpt: 'Cereal yields across Southeast Asia averaged 4.2 tonnes per hectare over the reporting period.',
            source_excerpt: 'Cereal yields across Southeast Asia averaged 4.2 tonnes per hectare over the reporting period.',
          },
        ],
      },
    ],
  },

  // Still running.
  'MS-2026-019': {
    id: 'chk-2026-0191',
    manuscript_id: 'MS-2026-019',
    status: 'queued',
    overall_similarity_pct: null,
    checked_at: null,
    engine_version: 'noplag-engine 0.4.1',
    error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [],
  },

  // Failed — the editor needs to see this, not an empty state that reads as 0%.
  'MS-2026-021': {
    id: 'chk-2026-0211',
    manuscript_id: 'MS-2026-021',
    status: 'failed',
    overall_similarity_pct: null,
    checked_at: '2026-01-20T08:03:00Z',
    engine_version: 'noplag-engine 0.4.1',
    error: 'Text extraction failed — the manuscript PDF appears to be a scanned image with no text layer.',
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [],
  },

  // Below the review threshold, but not trivially low.
  'MS-2025-208': {
    id: 'chk-2025-2081',
    manuscript_id: 'MS-2025-208',
    status: 'done',
    overall_similarity_pct: 11.2,
    checked_at: '2025-11-04T16:45:00Z',
    engine_version: 'noplag-engine 0.4.1',
    error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [
      {
        id: 'src-208-1',
        title: 'Evaluating Language Models: Benchmarks and Their Limits',
        url: 'https://example.org/acl/2025/eval-limits',
        source_type: 'journal',
        similarity_pct: 8.4,
        matched_chars: 3620,
        passages: [
          {
            query_excerpt: 'Benchmark saturation occurs when leading models cluster within the noise floor of a test set, at which point the benchmark stops discriminating between systems.',
            source_excerpt: 'Benchmark saturation occurs when leading models cluster within the noise floor of a test set, at which point the benchmark no longer discriminates between systems.',
          },
        ],
      },
      {
        id: 'src-208-2',
        title: 'Survey Methodology in Computational Linguistics',
        url: null,
        source_type: 'submission',
        similarity_pct: 2.8,
        matched_chars: 1180,
        passages: [
          {
            query_excerpt: 'We searched four bibliographic databases and screened titles and abstracts against the inclusion criteria.',
            source_excerpt: 'We searched four bibliographic databases and screened titles and abstracts against the inclusion criteria.',
          },
        ],
      },
    ],
  },

  // High band on a paper already in revision.
  'MS-2025-187': {
    id: 'chk-2025-1871',
    manuscript_id: 'MS-2025-187',
    status: 'done',
    overall_similarity_pct: 27.6,
    checked_at: '2025-10-30T10:12:00Z',
    engine_version: 'noplag-engine 0.4.1',
    error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [
      {
        id: 'src-187-1',
        title: 'IoT Threat Modelling for Urban Sensor Networks',
        url: 'https://example.org/ieee/2024/iot-threat-modelling',
        source_type: 'journal',
        similarity_pct: 19.9,
        matched_chars: 8740,
        passages: [
          {
            query_excerpt: 'We adopt the STRIDE taxonomy and extend it with two categories specific to constrained devices: firmware rollback and sensor spoofing.',
            source_excerpt: 'We adopt the STRIDE taxonomy and extend it with two categories specific to constrained devices: firmware rollback and sensor spoofing.',
          },
          {
            query_excerpt: 'Each identified threat is scored using DREAD and mapped onto the mitigation catalogue described in Section 5.',
            source_excerpt: 'Each identified threat is scored using DREAD and mapped onto the mitigation catalogue described in Section 5.',
          },
        ],
      },
      {
        id: 'src-187-2',
        title: 'Smart City Infrastructure Security (earlier PaperBridge submission)',
        url: null,
        source_type: 'submission',
        similarity_pct: 7.7,
        matched_chars: 3290,
        passages: [
          {
            query_excerpt: 'Municipal deployments typically comprise thousands of heterogeneous devices administered by several independent departments.',
            source_excerpt: 'Municipal deployments typically comprise thousands of heterogeneous devices administered by several independent departments.',
          },
        ],
      },
    ],
  },

  // Clear.
  'MS-2025-142': {
    id: 'chk-2025-1421',
    manuscript_id: 'MS-2025-142',
    status: 'done',
    overall_similarity_pct: 6.8,
    checked_at: '2025-09-15T13:30:00Z',
    engine_version: 'noplag-engine 0.4.1',
    error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [
      {
        id: 'src-142-1',
        title: 'Distributed Ledgers in Financial Services',
        url: 'https://example.org/finance/2024/dlt',
        source_type: 'journal',
        similarity_pct: 6.8,
        matched_chars: 2640,
        passages: [
          {
            query_excerpt: 'Settlement finality is the point at which a transfer becomes irrevocable under the applicable legal framework.',
            source_excerpt: 'Settlement finality is the point at which a transfer becomes irrevocable under the applicable legal framework.',
          },
        ],
      },
    ],
  },
};

/** The report for one manuscript, or null when no check has been requested. */
export function reportFor(manuscriptId) {
  return REPORTS[manuscriptId] || null;
}

// Shown by the author's self-check when /api/analysis/ cannot be reached, so the
// flow still demos end to end. Always render it behind a visible "demo" label.
export const DEMO_DRAFT_REPORT = {
  id: 'chk-demo',
  manuscript_id: null,
  status: 'done',
  overall_similarity_pct: 12.6,
  checked_at: null,
  engine_version: 'noplag-engine 0.4.1 (demo)',
  error: null,
  exclusions: { quotes: true, bibliography: true, min_words: 8 },
  sources: [
    {
      id: 'src-demo-1',
      title: 'A Review of Deep Learning in Radiology, Journal of Medical Informatics',
      url: 'https://example.org/jmi/2024/deep-learning-radiology',
      source_type: 'journal',
      similarity_pct: 7.4,
      matched_chars: 3120,
      passages: [
        {
          query_excerpt: 'Convolutional neural networks remain the dominant approach for diagnostic classification tasks.',
          source_excerpt: 'Convolutional neural networks remain the dominant approach for diagnostic classification tasks.',
        },
      ],
    },
    {
      id: 'src-demo-2',
      title: 'Standard reporting guidelines for machine learning in medicine',
      url: 'https://example.org/guidelines/ml-medicine',
      source_type: 'web',
      similarity_pct: 3.5,
      matched_chars: 1480,
      passages: [
        {
          query_excerpt: 'Studies should report the number of participants, the class distribution, and the handling of missing data.',
          source_excerpt: 'Studies should report the number of participants, the class distribution, and the handling of missing data.',
        },
      ],
    },
    {
      id: 'src-demo-3',
      title: 'Deep Learning for Medical Image Analysis (textbook, chapter 4)',
      url: null,
      source_type: 'journal',
      similarity_pct: 1.7,
      matched_chars: 720,
      passages: [
        {
          query_excerpt: 'Data augmentation is applied to reduce overfitting on small clinical datasets.',
          source_excerpt: 'Data augmentation is applied to reduce overfitting on small clinical datasets.',
        },
      ],
    },
  ],
};

/** Human date for a report timestamp. Matches the format used elsewhere. */
export function formatCheckedAt(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export const SOURCE_TYPE_LABELS = {
  submission: 'PaperBridge submission',
  journal:    'Published literature',
  web:        'Web source',
  thesis:     'Thesis / dissertation',
};
