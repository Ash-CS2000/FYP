// src/api/revisions.js
//
// Author-side revision resubmission: uploading a revised manuscript file
// against a minor/major decision. Like api/editorial.js, every call carries
// its request / response contract.
//
// SECURITY: nothing here is enforcement. Every endpoint is scoped to the
// calling author by session, never by a parameter; assume this file can be
// bypassed.

import { API_URL } from '../config';
import { authFetch } from './auth';

async function parseError(res) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.detail || body?.error || '';
  } catch {
    /* non-JSON error body */
  }
  const err = new Error(detail || `Request failed (${res.status})`);
  err.status = res.status;
  return err;
}

/**
 * Every revision submitted on this manuscript, newest first.
 *
 *   GET /api/manuscripts/:id/revision/
 *   200   [{ id, round, file_name, file_size, file_url, response_letter, submitted_at }]
 *   403   caller may not read this manuscript
 */
export async function listRevisions(manuscriptId) {
  const res = await authFetch(`${API_URL}/api/manuscripts/${encodeURIComponent(manuscriptId)}/revision/`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

/**
 * Resubmit a manuscript in response to a minor/major decision.
 *
 *   POST /api/manuscripts/:id/revision/
 *   body    multipart/form-data — same field contract as the original
 *           /api/manuscripts/upload/ submission (see UserSubmit.jsx), plus
 *           response_letter (optional). `manuscript` (the file) has no
 *           server-side prefill — the author always attaches a fresh PDF,
 *           even if its content is unchanged.
 *   201     the created ManuscriptRevision
 *   403     caller is not this manuscript's owner
 *   409     the manuscript is not awaiting a revision
 *
 * Raw fetch with only an Authorization header, deliberately not the JSON
 * request() helper used elsewhere in this file family — a hardcoded
 * 'Content-Type: application/json' header breaks the multipart boundary.
 * Reopens the manuscript for a fresh editor decision: status flips back to
 * under_review server-side, and every editable field the author submitted
 * the first time (title, abstract, authors, declarations, ...) is
 * overwritten with what's sent here.
 */
export async function submitRevision(manuscriptId, {
  file, responseLetter = '', supplementary = [],
  articleType = '', title, runningTitle = '', abstract, category = '', subCategory = '',
  keywords = '', specialtyTags = [], authors, coverLetter = '',
  noFunding = false, funder = '', grantNo = '', noCompeting = false, competing = '',
  ethicsNA = false, ethics = '', dataStatement = '', agreements = {},
}) {
  const authorsPayload = authors.map((a) => ({
    title: a.title,
    given_name: a.givenName,
    family_name: a.familyName,
    degree: a.degree,
    email: a.email,
    orcid: a.orcid,
    corresponding: a.corresponding,
    affiliations: a.affiliations.map((af) => ({
      department: af.department,
      institution: af.institution,
      city: af.city,
      country: af.country,
    })),
  }));

  const formData = new FormData();
  formData.append('article_type', articleType);
  formData.append('title', title);
  formData.append('running_title', runningTitle);
  formData.append('abstract', abstract);
  formData.append('category', category);
  formData.append('sub_category', subCategory);
  formData.append('keywords', keywords);
  formData.append('specialty_tags', JSON.stringify(specialtyTags));
  formData.append('authors', JSON.stringify(authorsPayload));
  formData.append('manuscript', file);
  supplementary.forEach((f) => formData.append('supplementary', f));
  formData.append('cover_letter', coverLetter);
  formData.append('no_funding', noFunding);
  formData.append('funder', funder);
  formData.append('grant_no', grantNo);
  formData.append('no_competing', noCompeting);
  formData.append('competing', competing);
  formData.append('ethics_na', ethicsNA);
  formData.append('ethics', ethics);
  formData.append('data_statement', dataStatement);
  formData.append('agreed_original', !!agreements.original);
  formData.append('agreed_not_under_review', !!agreements.notUnderReview);
  formData.append('agreed_all_approve', !!agreements.allApprove);
  formData.append('agreed_policies', !!agreements.policies);
  formData.append('response_letter', responseLetter);

  const res = await authFetch(`${API_URL}/api/manuscripts/${encodeURIComponent(manuscriptId)}/revision/`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}
