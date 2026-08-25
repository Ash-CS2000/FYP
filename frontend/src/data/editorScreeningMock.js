// src/data/editorScreeningMock.js
//
// MOCK DATA — editor/admin similarity screening only.
//
// This is not real. The author-facing check (data/similarity.js +
// api/similarity.js) is wired to the real backend; this file exists only to
// keep the editor's screening table, report screen, and admin threshold
// settings from crashing until those get their own real endpoint.
//
// When editor screening gets built for real: delete this file, give editor
// pages a real reportFor()-equivalent backed by an actual API call, and update
// SimilarityReport.jsx / Settings.jsx / EditorSubmissions.jsx accordingly.

import { DEFAULT_THRESHOLDS } from './similarity.js';

const SETTINGS_KEY = 'paperbridge-screening-settings';

export const DEFAULT_SCREENING_SETTINGS = {
  review_threshold: DEFAULT_THRESHOLDS.review,
  high_threshold: DEFAULT_THRESHOLDS.high,
  exclude_quotes: true,
  exclude_bibliography: true,
  min_words: 8,
  auto_flag: true,
};

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

export function thresholdsFrom(settings = DEFAULT_SCREENING_SETTINGS) {
  return {
    review: Number(settings.review_threshold ?? DEFAULT_THRESHOLDS.review),
    high: Number(settings.high_threshold ?? DEFAULT_THRESHOLDS.high),
  };
}

export const REPORTS = {
  'MS-2026-014': {
    id: 'chk-2026-0141', manuscript_id: 'MS-2026-014', status: 'done',
    overall_similarity_pct: 18.4, checked_at: '2026-01-12T09:41:00Z',
    engine_version: 'noplag-engine 0.4.1', error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [
      { id: 'src-014-1', title: 'Transformer Architectures for Diagnostic Imaging (workshop paper)', url: null, source_type: 'submission', similarity_pct: 11.2, matched_chars: 4830,
        passages: [
          { query_excerpt: 'We evaluate three families of architectures — convolutional, transformer, and hybrid — across three publicly available medical imaging benchmarks.', source_excerpt: 'We evaluate three families of architectures — convolutional, transformer, and hybrid — across three publicly available medical imaging benchmarks.' },
          { query_excerpt: 'All models were trained for 120 epochs using AdamW with a cosine decay schedule and a base learning rate of 3e-4.', source_excerpt: 'Models were trained for 120 epochs using AdamW with a cosine decay schedule and a base learning rate of 3e-4.' },
        ] },
      { id: 'src-014-2', title: 'A Review of Deep Learning in Radiology, Journal of Medical Informatics', url: 'https://example.org/jmi/2024/deep-learning-radiology', source_type: 'journal', similarity_pct: 5.1, matched_chars: 2190,
        passages: [ { query_excerpt: 'Convolutional neural networks remain the dominant approach for diagnostic classification tasks in radiology and pathology.', source_excerpt: 'Convolutional neural networks remain the dominant approach for diagnostic classification tasks in radiology and pathology.' } ] },
      { id: 'src-014-3', title: 'MIMIC-CXR dataset documentation', url: 'https://example.org/datasets/mimic-cxr', source_type: 'web', similarity_pct: 2.1, matched_chars: 890,
        passages: [ { query_excerpt: 'The dataset comprises 377,110 chest radiographs associated with 227,835 imaging studies.', source_excerpt: 'The dataset comprises 377,110 chest radiographs associated with 227,835 imaging studies.' } ] },
    ],
  },
  'MS-2026-008': {
    id: 'chk-2026-0081', manuscript_id: 'MS-2026-008', status: 'done',
    overall_similarity_pct: 34.2, checked_at: '2025-12-22T14:08:00Z',
    engine_version: 'noplag-engine 0.4.1', error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [
      { id: 'src-008-1', title: 'Quantum Annealing for Combinatorial Optimisation: A Survey', url: 'https://example.org/arxiv/2408.11234', source_type: 'journal', similarity_pct: 24.7, matched_chars: 11420,
        passages: [
          { query_excerpt: 'Variational quantum algorithms occupy a middle ground between purely classical heuristics and fault-tolerant quantum computation, and are therefore the most plausible near-term route to practical advantage.', source_excerpt: 'Variational quantum algorithms occupy a middle ground between purely classical heuristics and fault-tolerant quantum computation, and are therefore the most plausible near-term route to practical advantage.' },
          { query_excerpt: 'The QAOA ansatz alternates between a cost Hamiltonian and a mixing Hamiltonian for p rounds, where p controls the expressivity of the resulting circuit.', source_excerpt: 'The QAOA ansatz alternates between a cost Hamiltonian and a mixing Hamiltonian for p rounds, where p controls the expressivity of the resulting circuit.' },
          { query_excerpt: 'Despite considerable interest, no experiment to date has demonstrated an unambiguous speedup on a problem of practical scale.', source_excerpt: 'Despite considerable interest, no experiment has yet demonstrated an unambiguous speedup on a problem of practical scale.' },
        ] },
      { id: 'src-008-2', title: 'Practical Quantum Computing for Logistics (doctoral thesis)', url: null, source_type: 'thesis', similarity_pct: 7.3, matched_chars: 3380,
        passages: [ { query_excerpt: 'Scheduling and vehicle routing are natural candidates because both admit compact QUBO formulations.', source_excerpt: 'Scheduling and vehicle routing are natural candidates since both admit compact QUBO formulations.' } ] },
      { id: 'src-008-3', title: 'Introduction to Quantum Optimization (course notes)', url: 'https://example.org/courses/quantum-opt', source_type: 'web', similarity_pct: 2.2, matched_chars: 1010,
        passages: [ { query_excerpt: 'An NP-hard problem is one to which every problem in NP can be reduced in polynomial time.', source_excerpt: 'An NP-hard problem is one to which every problem in NP can be reduced in polynomial time.' } ] },
    ],
  },
  'MS-2026-011': {
    id: 'chk-2026-0111', manuscript_id: 'MS-2026-011', status: 'done',
    overall_similarity_pct: 4.1, checked_at: '2026-01-18T11:22:00Z',
    engine_version: 'noplag-engine 0.4.1', error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [ { id: 'src-011-1', title: 'FAO Statistical Yearbook 2024', url: 'https://example.org/fao/yearbook-2024', source_type: 'web', similarity_pct: 4.1, matched_chars: 1560,
      passages: [ { query_excerpt: 'Cereal yields across Southeast Asia averaged 4.2 tonnes per hectare over the reporting period.', source_excerpt: 'Cereal yields across Southeast Asia averaged 4.2 tonnes per hectare over the reporting period.' } ] } ],
  },
  'MS-2026-019': {
    id: 'chk-2026-0191', manuscript_id: 'MS-2026-019', status: 'queued',
    overall_similarity_pct: null, checked_at: null,
    engine_version: 'noplag-engine 0.4.1', error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 }, sources: [],
  },
  'MS-2026-021': {
    id: 'chk-2026-0211', manuscript_id: 'MS-2026-021', status: 'failed',
    overall_similarity_pct: null, checked_at: '2026-01-20T08:03:00Z',
    engine_version: 'noplag-engine 0.4.1',
    error: 'Text extraction failed — the manuscript PDF appears to be a scanned image with no text layer.',
    exclusions: { quotes: true, bibliography: true, min_words: 8 }, sources: [],
  },
  'MS-2025-208': {
    id: 'chk-2025-2081', manuscript_id: 'MS-2025-208', status: 'done',
    overall_similarity_pct: 11.2, checked_at: '2025-11-04T16:45:00Z',
    engine_version: 'noplag-engine 0.4.1', error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [
      { id: 'src-208-1', title: 'Evaluating Language Models: Benchmarks and Their Limits', url: 'https://example.org/acl/2025/eval-limits', source_type: 'journal', similarity_pct: 8.4, matched_chars: 3620,
        passages: [ { query_excerpt: 'Benchmark saturation occurs when leading models cluster within the noise floor of a test set, at which point the benchmark stops discriminating between systems.', source_excerpt: 'Benchmark saturation occurs when leading models cluster within the noise floor of a test set, at which point the benchmark no longer discriminates between systems.' } ] },
      { id: 'src-208-2', title: 'Survey Methodology in Computational Linguistics', url: null, source_type: 'submission', similarity_pct: 2.8, matched_chars: 1180,
        passages: [ { query_excerpt: 'We searched four bibliographic databases and screened titles and abstracts against the inclusion criteria.', source_excerpt: 'We searched four bibliographic databases and screened titles and abstracts against the inclusion criteria.' } ] },
    ],
  },
  'MS-2025-187': {
    id: 'chk-2025-1871', manuscript_id: 'MS-2025-187', status: 'done',
    overall_similarity_pct: 27.6, checked_at: '2025-10-30T10:12:00Z',
    engine_version: 'noplag-engine 0.4.1', error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [
      { id: 'src-187-1', title: 'IoT Threat Modelling for Urban Sensor Networks', url: 'https://example.org/ieee/2024/iot-threat-modelling', source_type: 'journal', similarity_pct: 19.9, matched_chars: 8740,
        passages: [
          { query_excerpt: 'We adopt the STRIDE taxonomy and extend it with two categories specific to constrained devices: firmware rollback and sensor spoofing.', source_excerpt: 'We adopt the STRIDE taxonomy and extend it with two categories specific to constrained devices: firmware rollback and sensor spoofing.' },
          { query_excerpt: 'Each identified threat is scored using DREAD and mapped onto the mitigation catalogue described in Section 5.', source_excerpt: 'Each identified threat is scored using DREAD and mapped onto the mitigation catalogue described in Section 5.' },
        ] },
      { id: 'src-187-2', title: 'Smart City Infrastructure Security (earlier PaperBridge submission)', url: null, source_type: 'submission', similarity_pct: 7.7, matched_chars: 3290,
        passages: [ { query_excerpt: 'Municipal deployments typically comprise thousands of heterogeneous devices administered by several independent departments.', source_excerpt: 'Municipal deployments typically comprise thousands of heterogeneous devices administered by several independent departments.' } ] },
    ],
  },
  'MS-2025-142': {
    id: 'chk-2025-1421', manuscript_id: 'MS-2025-142', status: 'done',
    overall_similarity_pct: 6.8, checked_at: '2025-09-15T13:30:00Z',
    engine_version: 'noplag-engine 0.4.1', error: null,
    exclusions: { quotes: true, bibliography: true, min_words: 8 },
    sources: [ { id: 'src-142-1', title: 'Distributed Ledgers in Financial Services', url: 'https://example.org/finance/2024/dlt', source_type: 'journal', similarity_pct: 6.8, matched_chars: 2640,
      passages: [ { query_excerpt: 'Settlement finality is the point at which a transfer becomes irrevocable under the applicable legal framework.', source_excerpt: 'Settlement finality is the point at which a transfer becomes irrevocable under the applicable legal framework.' } ] } ],
  },
};

export function reportFor(manuscriptId) {
  return REPORTS[manuscriptId] || null;
}