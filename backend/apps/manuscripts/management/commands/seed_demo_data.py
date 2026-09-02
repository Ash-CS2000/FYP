"""
seed_demo_data.py — reset the manuscripts dataset with realistic demo content.

Wipes every existing Manuscript (and, via cascade, their authors/affiliations/
supplementary files/plagiarism checks) plus every object under the
'manuscripts/' prefix in Supabase Storage, then creates 20 real author
accounts and 20 real manuscripts (actual generated PDFs uploaded to storage),
runs each through the live noplag plagiarism-check engine, and waits for the
results.

Usage:
    python manage.py seed_demo_data
    python manage.py seed_demo_data --skip-plagiarism-checks   # faster, no live engine calls
"""
import io
import os
import random
import time
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from apps.manuscripts import storage
from apps.manuscripts.models import (
    Manuscript, ManuscriptAffiliation, ManuscriptAuthor, PlagiarismCheck,
)
from apps.manuscripts.services.noplag_client import (
    NoPlagClientError, add_to_corpus, get_check_report, get_check_status, submit_check,
)
from apps.users.models import UserProfile, UserRole

User = get_user_model()

# Read from the environment (backend/.env, gitignored) rather than hardcoding a
# real password value into tracked source.
DEMO_PASSWORD = os.environ.get('SEED_DEMO_AUTHOR_PASSWORD')

# ── 20 authors ────────────────────────────────────────────────────────────

AUTHORS = [
    dict(given_name='Amara', family_name='Okafor', institution='University of Lagos', city='Lagos', country='Nigeria', degree='PhD'),
    dict(given_name='Liang', family_name='Wu', institution='Tsinghua University', city='Beijing', country='China', degree='PhD'),
    dict(given_name='Sofia', family_name='Rossi', institution='Politecnico di Milano', city='Milan', country='Italy', degree='PhD'),
    dict(given_name='Rajesh', family_name='Nair', institution='Indian Institute of Science', city='Bengaluru', country='India', degree='PhD'),
    dict(given_name='Ingrid', family_name='Solberg', institution='NTNU', city='Trondheim', country='Norway', degree='PhD'),
    dict(given_name='Carlos', family_name='Mendoza', institution='Universidad Nacional Autónoma de México', city='Mexico City', country='Mexico', degree='PhD'),
    dict(given_name='Haruto', family_name='Sato', institution='Kyoto University', city='Kyoto', country='Japan', degree='PhD'),
    dict(given_name='Fatima', family_name='Al-Sayed', institution='King Abdulaziz University', city='Jeddah', country='Saudi Arabia', degree='PhD'),
    dict(given_name='Emily', family_name='Carter', institution='University of Toronto', city='Toronto', country='Canada', degree='PhD'),
    dict(given_name='Johan', family_name='Muller', institution='University of Cape Town', city='Cape Town', country='South Africa', degree='PhD'),
    dict(given_name='Nur', family_name='Aisyah', institution='Universiti Malaya', city='Kuala Lumpur', country='Malaysia', degree='MSc'),
    dict(given_name='Andrei', family_name='Volkov', institution='ITMO University', city='Saint Petersburg', country='Russia', degree='PhD'),
    dict(given_name='Isabel', family_name='Fernandes', institution='Universidade de Lisboa', city='Lisbon', country='Portugal', degree='PhD'),
    dict(given_name='Tobias', family_name='Weber', institution='ETH Zurich', city='Zurich', country='Switzerland', degree='PhD'),
    dict(given_name='Priya', family_name='Sharma', institution='Monash University', city='Melbourne', country='Australia', degree='PhD'),
    dict(given_name='Daniel', family_name='Kim', institution='Seoul National University', city='Seoul', country='South Korea', degree='PhD'),
    dict(given_name='Grace', family_name='Mwangi', institution='University of Nairobi', city='Nairobi', country='Kenya', degree='MSc'),
    dict(given_name='Lucas', family_name='Silva', institution='Universidade de São Paulo', city='São Paulo', country='Brazil', degree='PhD'),
    dict(given_name='Anna', family_name='Kowalski', institution='University of Warsaw', city='Warsaw', country='Poland', degree='PhD'),
    dict(given_name='Michael', family_name='O\'Brien', institution='Trinity College Dublin', city='Dublin', country='Ireland', degree='PhD'),
]
for i, a in enumerate(AUTHORS):
    a['email'] = f"{a['given_name'].lower().replace(chr(39), '')}.{a['family_name'].lower().replace(chr(39), '')}@demo-paperbridge.test"

# A paragraph deliberately reused between manuscripts 0 and 1 (a resubmission-
# under-a-new-title scenario) so a real plagiarism check has a genuine,
# non-trivial match to find rather than every demo paper coming back at 0%.
SHARED_PARAGRAPH = (
    "Prior evaluations of this technique relied on synthetic benchmarks that "
    "do not capture the noise distributions observed in field deployments. "
    "We address this gap by collecting a new dataset under realistic "
    "operating conditions and re-evaluating the standard baselines against it, "
    "finding that several previously reported performance gains do not "
    "replicate outside the laboratory setting."
)

# ── 20 manuscripts ───────────────────────────────────────────────────────
# author_idx: indices into AUTHORS. First entry is the corresponding author.

MANUSCRIPTS = [
    dict(
        title='Field-Realistic Evaluation of Low-Power Sensor Fusion Algorithms',
        category='Engineering', article_type='Research Article',
        abstract=(
            "Sensor fusion algorithms for embedded low-power devices are typically "
            "validated on clean, simulated data. This paper re-evaluates three "
            "widely cited fusion approaches under realistic field noise conditions."
        ),
        body=[SHARED_PARAGRAPH, "Our results indicate that a simple complementary filter, tuned on field data, outperforms two more sophisticated Kalman-filter variants that were tuned only on synthetic data, suggesting that evaluation methodology matters as much as algorithmic sophistication."],
        author_idx=[0], status='submitted',
    ),
    dict(
        title='Revisiting Sensor Fusion Baselines Under Field Conditions',
        category='Engineering', article_type='Research Article',
        abstract=(
            "We revisit the evaluation methodology used to compare sensor fusion "
            "algorithms, arguing that laboratory benchmarks systematically overstate "
            "real-world performance."
        ),
        body=[SHARED_PARAGRAPH, "This resubmission extends our earlier workshop paper with a larger field dataset collected across four deployment sites over six months, and adds two additional baseline algorithms not covered previously."],
        author_idx=[0, 10], status='under_review',
    ),
    dict(
        title='A Winnowing-Based Approach to Cross-Lingual Plagiarism Detection',
        category='Computer Science', article_type='Research Article',
        abstract=(
            "Cross-lingual plagiarism detection remains difficult because surface-level "
            "fingerprinting methods assume matching vocabulary. We propose a hybrid "
            "approach that pairs machine-translated normalization with k-gram winnowing "
            "to recover matches lost to translation variance."
        ),
        body=[
            "We evaluate the approach on a corpus of 4,200 document pairs spanning six language combinations, showing a 22% relative improvement in recall over translation-only baselines at matched precision.",
            "A qualitative error analysis identifies idiomatic paraphrase as the dominant remaining failure mode, suggesting that future work should incorporate semantic embeddings alongside lexical fingerprinting rather than replacing it.",
        ],
        author_idx=[1], status='under_review',
    ),
    dict(
        title='Thermal Stability of Perovskite Solar Cells Under Cyclic Humidity Stress',
        category='Physics', article_type='Research Article',
        abstract=(
            "Perovskite photovoltaic cells degrade rapidly under combined heat and "
            "humidity exposure. This study characterizes degradation pathways under "
            "cyclic (rather than constant) humidity stress, which better reflects "
            "outdoor deployment conditions."
        ),
        body=[
            "Devices encapsulated with a dual-layer barrier retained 91% of initial power conversion efficiency after 500 cycles, compared to 34% for unencapsulated controls.",
            "X-ray diffraction confirms that cyclic stress accelerates ion migration at grain boundaries more than constant exposure at the same cumulative humidity dose, a finding with direct implications for accelerated-aging test protocols.",
        ],
        author_idx=[2], status='accepted',
    ),
    dict(
        title='Fjord Bathymetry Estimation from Sparse Sonar Transects Using Gaussian Processes',
        category='Environmental Science', article_type='Research Article',
        abstract=(
            "Full-coverage sonar surveys of Norwegian fjords are costly. We evaluate "
            "Gaussian process regression for interpolating bathymetry from sparse "
            "transect data, comparing against standard kriging."
        ),
        body=[
            "On a held-out validation transect from Trondheimsfjord, the Gaussian process model achieved 18% lower RMSE than ordinary kriging, with the improvement most pronounced near steep bathymetric gradients.",
            "We release the interpolation code as an open-source package to support future fjord survey planning with reduced vessel time.",
        ],
        author_idx=[4], status='published',
    ),
    dict(
        title='Remittance Flows and Household Investment in Education: Evidence from Rural Mexico',
        category='Economics', article_type='Research Article',
        abstract=(
            "Using a household panel spanning eight years, we estimate the effect of "
            "international remittances on secondary-school enrollment decisions in "
            "rural Mexican households, addressing endogeneity via a migrant-network "
            "instrument."
        ),
        body=[
            "A 10% increase in remittance income is associated with a 3.2 percentage point increase in secondary enrollment for girls, but no statistically significant effect for boys, consistent with remittances relaxing a binding credit constraint specific to girls' schooling.",
            "Placebo tests using pre-migration enrollment trends find no evidence that the estimated effect is driven by pre-existing household differences.",
        ],
        author_idx=[5], status='under_review',
    ),
    dict(
        title='Attention Bottlenecks in Long-Document Transformers: A Diagnostic Study',
        category='Computer Science', article_type='Research Article',
        abstract=(
            "Long-document transformer variants claim to model dependencies across "
            "thousands of tokens, but the extent to which they actually use distant "
            "context is unclear. We introduce a diagnostic probing suite to measure "
            "effective context usage directly."
        ),
        body=[
            "Across five popular long-context architectures, effective usable context is consistently 3-6x shorter than the architectural maximum, with usage dropping sharply past the position seen most frequently during pretraining.",
            "We show that a simple curriculum extending training-time context length recovers roughly half of the gap, suggesting the limitation is largely a training-distribution artifact rather than an architectural ceiling.",
        ],
        author_idx=[6], status='submitted',
    ),
    dict(
        title='Heat-Tolerant Wheat Cultivars: A Multi-Site Field Trial Across the Arabian Peninsula',
        category='Biology', article_type='Research Article',
        abstract=(
            "Rising growing-season temperatures threaten wheat yields across arid "
            "regions. We report a three-site field trial of six heat-tolerant "
            "cultivars against a regional control variety."
        ),
        body=[
            "The best-performing cultivar maintained 87% of its cool-season yield under a simulated +3C heat stress treatment, compared to 52% for the control variety, with the yield advantage driven primarily by delayed anthesis rather than grain-filling duration.",
            "Water-use efficiency did not differ significantly between cultivars, indicating that heat tolerance and drought tolerance are not necessarily co-selected traits in this germplasm set.",
        ],
        author_idx=[7], status='revisions_requested',
    ),
    dict(
        title='Explaining Reviewer Disagreement in Peer Review Using Topic-Level Confidence',
        category='Computer Science', article_type='Research Article',
        abstract=(
            "Reviewer score disagreement is often attributed to subjective taste, but "
            "we hypothesize that a meaningful portion is explained by variation in "
            "topic-specific reviewer confidence. We test this using a dataset of "
            "12,000 peer reviews with self-reported confidence scores."
        ),
        body=[
            "Pairs of reviewers with matched self-reported confidence disagree 34% less often than confidence-mismatched pairs on the same paper, even after controlling for reviewer seniority.",
            "We propose a confidence-weighted aggregation scheme for area-chair decision support and show it reduces disagreement-driven overturns in a retrospective simulation.",
        ],
        author_idx=[8], status='accepted',
    ),
    dict(
        title='Post-Apartheid Spatial Segregation and Access to Primary Healthcare in Cape Town',
        category='Public Health', article_type='Research Article',
        abstract=(
            "We map travel-time access to primary healthcare facilities across Cape "
            "Town's post-apartheid urban geography, linking access gaps to historical "
            "spatial planning boundaries that persist in the current built environment."
        ),
        body=[
            "Median travel time to the nearest primary clinic is 2.4x longer in historically designated townships than in adjacent formerly-white suburbs, despite comparable population density.",
            "New clinic siting proposals under the current municipal plan would close only 18% of this access gap, suggesting that siting criteria should more explicitly weight historical disadvantage.",
        ],
        author_idx=[9], status='under_review',
    ),
    dict(
        title='Code-Switching Detection in Low-Resource Malay-English Social Media Text',
        category='Linguistics', article_type='Research Article',
        abstract=(
            "Automatic code-switching detection for Malay-English text is hampered by "
            "a lack of annotated data and by orthographic overlap between the two "
            "languages. We introduce a 15,000-token annotated corpus and a "
            "character-level model tailored to this setting."
        ),
        body=[
            "Our character-level CRF model achieves 89.4% token-level F1, outperforming a word-level baseline by 11 points, with most remaining errors concentrated in borrowed loanwords that are orthographically identical across both languages.",
            "We release the annotated corpus and model under a permissive license to support further work on Southeast Asian code-switching.",
        ],
        author_idx=[10, 14], status='submitted',
    ),
    dict(
        title='Byzantine Fault Tolerance Overhead in Permissioned Blockchain Consensus at Scale',
        category='Computer Science', article_type='Research Article',
        abstract=(
            "We benchmark PBFT-family consensus protocols on permissioned blockchain "
            "networks ranging from 4 to 256 validator nodes, quantifying the "
            "throughput cost of Byzantine fault tolerance as network size grows."
        ),
        body=[
            "Throughput degrades near-quadratically past 64 nodes for classical PBFT, while the HotStuff-derived protocol we benchmark alongside it degrades linearly, confirming the theoretical complexity advantage translates into practice at this scale.",
            "We identify view-change latency, not message complexity, as the dominant practical bottleneck under simulated network partitions, an effect not captured by the standard asymptotic analysis.",
        ],
        author_idx=[11], status='rejected',
    ),
    dict(
        title='Azulejo Motif Classification Using Convolutional Neural Networks for Heritage Digitization',
        category='Arts and Humanities', article_type='Research Article',
        abstract=(
            "Portuguese azulejo tile motifs are catalogued largely by manual expert "
            "inspection. We train a convolutional classifier on a newly digitized "
            "collection of 3,400 tile photographs to automate motif-family "
            "classification for heritage archives."
        ),
        body=[
            "The classifier reaches 92.1% top-1 accuracy across 14 motif families, with confusion concentrated between geometric and interlace motif families that art historians also report as visually ambiguous.",
            "We discuss deployment of the tool within a regional heritage archive's cataloguing workflow, where it now serves as a first-pass suggestion for human archivists rather than a fully automated classifier.",
        ],
        author_idx=[12], status='under_review',
    ),
    dict(
        title='Energy-Aware Task Scheduling for Heterogeneous Edge Computing Clusters',
        category='Engineering', article_type='Research Article',
        abstract=(
            "Edge computing clusters increasingly mix low-power and high-performance "
            "nodes. We propose an energy-aware scheduler that jointly optimizes "
            "latency SLAs and total cluster energy draw."
        ),
        body=[
            "Against a latency-only baseline scheduler, our approach reduces total energy consumption by 27% while missing only 1.3% more SLA deadlines, evaluated on a 40-node heterogeneous testbed under realistic diurnal load patterns.",
            "Ablations show that the energy gain comes primarily from workload-aware node selection rather than from the dynamic voltage-frequency scaling component, contrary to our initial hypothesis.",
        ],
        author_idx=[13], status='submitted',
    ),
    dict(
        title='Microplastic Accumulation Gradients in Great Barrier Reef Sediment Cores',
        category='Environmental Science', article_type='Research Article',
        abstract=(
            "We analyze microplastic concentration in sediment cores from twelve "
            "sites across the Great Barrier Reef, reconstructing a 15-year "
            "accumulation trend from dated core layers."
        ),
        body=[
            "Microplastic density increases significantly with proximity to the two nearest coastal population centers, and the accumulation rate has approximately doubled over the most recent five-year period relative to the preceding decade.",
            "Polymer identification via FTIR indicates polypropylene and polyethylene fragments dominate, consistent with degraded single-use packaging as the primary source rather than fishing gear.",
        ],
        author_idx=[14], status='revisions_requested',
    ),
    dict(
        title='Transfer Learning from Protein Language Models to Enzyme Thermostability Prediction',
        category='Biology', article_type='Research Article',
        abstract=(
            "We fine-tune a pretrained protein language model on a curated dataset of "
            "enzyme melting temperatures, comparing transfer-learning performance "
            "against features engineered from first-principles structural modeling."
        ),
        body=[
            "The fine-tuned language model predicts melting temperature within 4.1C RMSE on held-out enzyme families, outperforming the structure-based baseline (6.8C RMSE) while requiring no crystal structure as input.",
            "Performance degrades substantially on enzyme families absent from the pretraining corpus, underscoring that the gain reflects pretraining coverage rather than a general solution to thermostability prediction.",
        ],
        author_idx=[15], status='under_review',
    ),
    dict(
        title='Informal Settlement Growth Detection from Satellite Imagery Using Change-Point Segmentation',
        category='Urban Studies', article_type='Research Article',
        abstract=(
            "Municipal planning in rapidly urbanizing regions often lacks timely data "
            "on informal settlement growth. We apply change-point segmentation to "
            "multi-year satellite imagery to detect settlement expansion "
            "automatically."
        ),
        body=[
            "The method flags 84% of settlement boundary changes confirmed by ground survey, with a median detection lag of 7 months behind actual expansion, meaningfully faster than the municipality's prior 2-3 year survey cycle.",
            "False positives cluster around informal agricultural structures that share spectral signatures with early-stage settlement, a limitation we discuss alongside possible multi-spectral mitigations.",
        ],
        author_idx=[16], status='submitted',
    ),
    dict(
        title='Consumer Trust Recovery Strategies Following Data Breach Disclosure: A Field Experiment',
        category='Business', article_type='Research Article',
        abstract=(
            "We run a field experiment with a mid-sized e-commerce retailer following "
            "a real data breach disclosure, randomizing customers into three "
            "post-breach communication strategies to measure effects on repurchase "
            "behavior."
        ),
        body=[
            "Customers receiving a concrete-remediation message (specific technical fixes described) repurchased at a 14% higher rate over the following quarter than those receiving a generic apology, while a compensation-only message showed no significant advantage over the generic apology.",
            "Effects were concentrated among customers with prior purchase history exceeding one year, suggesting trust recovery messaging may need to be tailored by customer tenure.",
        ],
        author_idx=[17], status='accepted',
    ),
    dict(
        title='Post-Communist Institutional Persistence in Regional Judicial Appointment Patterns',
        category='Political Science', article_type='Research Article',
        abstract=(
            "We examine judicial appointment patterns across Polish regional courts "
            "over three decades, testing whether appointment networks established "
            "under the prior political system persist despite formal institutional "
            "reform."
        ),
        body=[
            "Network analysis of appointment committees shows that career pathways established before 1990 continue to predict appointment likelihood as late as the 2010s, even after controlling for stated qualification criteria.",
            "The effect weakens substantially for cohorts of judges who entered legal training entirely after the transition, consistent with network persistence operating through personal ties rather than through the formal rules themselves.",
        ],
        author_idx=[18], status='submitted',
    ),
    dict(
        title='Anxiety Symptom Trajectories in First-Generation University Students: A Longitudinal Cohort Study',
        category='Psychology', article_type='Research Article',
        abstract=(
            "First-generation university students face distinct stressors relative to "
            "continuing-generation peers. We track anxiety symptom trajectories "
            "across the first two years of university using monthly self-report "
            "surveys."
        ),
        body=[
            "First-generation students show significantly higher anxiety symptom scores in the first semester, but the gap narrows by the end of year two and is no longer statistically significant, driven primarily by first-generation students who successfully connect with a peer mentoring program.",
            "Students who did not engage with any formal support program showed no significant narrowing of the gap, suggesting the convergence is program-driven rather than a general adjustment effect.",
        ],
        author_idx=[19], status='rejected',
    ),
]

STORY_HOURS_AGO_BY_STATUS = {
    'submitted': (0, 4),
    'under_review': (6, 12),
    'revisions_requested': (10, 16),
    'accepted': (14, 22),
    'rejected': (10, 18),
    'published': (20, 30),
}


def build_pdf_bytes(title, authors_line, abstract, body_paragraphs):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=LETTER, title=title)
    styles = getSampleStyleSheet()
    story = [
        Paragraph(title, styles['Title']),
        Spacer(1, 10),
        Paragraph(authors_line, styles['Normal']),
        Spacer(1, 14),
        Paragraph('Abstract', styles['Heading2']),
        Paragraph(abstract, styles['BodyText']),
    ]
    for p in body_paragraphs:
        story.append(Spacer(1, 8))
        story.append(Paragraph(p, styles['BodyText']))
    doc.build(story)
    buf.seek(0)
    return buf.read()


class Command(BaseCommand):
    help = 'Wipe all manuscripts (DB + Supabase Storage) and seed 20 realistic demo authors/submissions.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-plagiarism-checks', action='store_true',
            help='Skip submitting/polling the live noplag engine (faster, no PlagiarismCheck results).',
        )

    def handle(self, *args, **options):
        if not DEMO_PASSWORD:
            raise CommandError(
                'SEED_DEMO_AUTHOR_PASSWORD is not set. Add it to backend/.env (see .env.example).'
            )
        run_checks = not options['skip_plagiarism_checks']

        self.stdout.write('Deleting existing manuscripts (DB rows) ...')
        deleted_count, _ = Manuscript.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'  Deleted {deleted_count} related rows.'))

        self.stdout.write("Wiping 'manuscripts/' prefix in Supabase Storage ...")
        keys = storage.list_all_keys('manuscripts/')
        storage.delete_files(keys)
        self.stdout.write(self.style.SUCCESS(f'  Deleted {len(keys)} object(s) from the bucket.'))

        self.stdout.write('Creating 20 demo author accounts ...')
        users = self._create_authors()
        self.stdout.write(self.style.SUCCESS(f'  {len(users)} author accounts ready (password: {DEMO_PASSWORD}).'))

        self.stdout.write('Generating PDFs, uploading to storage, and creating manuscripts ...')
        manuscripts = self._create_manuscripts(users)
        self.stdout.write(self.style.SUCCESS(f'  {len(manuscripts)} manuscripts created.'))

        if run_checks:
            self._run_plagiarism_checks(manuscripts)
        else:
            self.stdout.write(self.style.WARNING('  Skipped plagiarism checks (--skip-plagiarism-checks).'))

        self.stdout.write(self.style.SUCCESS('Done.'))

    def _create_authors(self):
        users = []
        for a in AUTHORS:
            user, created = User.objects.get_or_create(
                email=a['email'],
                defaults={
                    'username': a['email'],
                    'first_name': a['given_name'],
                    'last_name': a['family_name'],
                },
            )
            user.set_password(DEMO_PASSWORD)
            user.save()
            UserProfile.objects.update_or_create(
                user=user,
                defaults={
                    'role': UserProfile.Role.AUTHOR,
                    'status': UserProfile.Status.ACTIVE,
                    'institution': a['institution'],
                },
            )
            UserRole.objects.update_or_create(
                user=user, role=UserProfile.Role.AUTHOR,
                defaults={'status': UserRole.Status.ACTIVE},
            )
            users.append(user)
        return users

    def _create_manuscripts(self, users):
        created = []
        now = timezone.now()
        with transaction.atomic():
            for spec in MANUSCRIPTS:
                author_specs = [AUTHORS[i] for i in spec['author_idx']]
                users_for_paper = [users[i] for i in spec['author_idx']]
                owner = users_for_paper[0]

                authors_line = '; '.join(f"{s['given_name']} {s['family_name']}" for s in author_specs)
                pdf_bytes = build_pdf_bytes(spec['title'], authors_line, spec['abstract'], spec['body'])
                pdf_name = spec['title'][:40].strip().replace(' ', '_').replace('/', '-') + '.pdf'
                key = storage.build_key(owner.id, 'manuscript', pdf_name)
                storage.upload_file(io.BytesIO(pdf_bytes), key, content_type='application/pdf')

                manuscript = Manuscript.objects.create(
                    owner=owner,
                    article_type=spec['article_type'],
                    title=spec['title'],
                    abstract=spec['abstract'] + ' ' + ' '.join(spec['body']),
                    category=spec['category'],
                    file_key=key,
                    file_name=pdf_name,
                    file_size=len(pdf_bytes),
                    no_funding=True,
                    no_competing=True,
                    ethics_na=True,
                    agreed_original=True,
                    agreed_not_under_review=True,
                    agreed_all_approve=True,
                    agreed_policies=True,
                    status=spec['status'],
                )

                for order, (a_spec, a_user) in enumerate(zip(author_specs, users_for_paper)):
                    author = ManuscriptAuthor.objects.create(
                        manuscript=manuscript,
                        order=order,
                        given_name=a_spec['given_name'],
                        family_name=a_spec['family_name'],
                        degree=a_spec['degree'],
                        email=a_user.email,
                        corresponding=(order == 0),
                    )
                    ManuscriptAffiliation.objects.create(
                        author=author,
                        institution=a_spec['institution'],
                        city=a_spec['city'],
                        country=a_spec['country'],
                    )

                lo, hi = STORY_HOURS_AGO_BY_STATUS.get(spec['status'], (0, 4))
                backdated = now - timedelta(hours=random.uniform(lo, hi))
                Manuscript.objects.filter(pk=manuscript.pk).update(submitted_at=backdated, updated_at=backdated)

                created.append(manuscript)
        return created

    def _run_plagiarism_checks(self, manuscripts):
        # Process the two manuscripts sharing SHARED_PARAGRAPH sequentially and
        # first, so the second one is genuinely checked against a corpus that
        # already contains the first — a real, non-trivial flagged match rather
        # than two independent near-zero scores.
        first, second, *rest = manuscripts

        self.stdout.write('Running plagiarism checks (this hits the live noplag engine) ...')
        self.stdout.write(f'  [1/{len(manuscripts)}] Submitting "{first.title[:50]}" ...')
        self._submit_and_wait(first, add_after=True)

        self.stdout.write(f'  [2/{len(manuscripts)}] Submitting "{second.title[:50]}" (expects a real match against #1) ...')
        self._submit_and_wait(second, add_after=True)

        # Submit the rest concurrently (the engine processes checks in the
        # background), then poll them together.
        pending = {}
        for i, m in enumerate(rest, start=3):
            check = PlagiarismCheck.objects.create(manuscript=m)
            try:
                result = submit_check(m)
            except NoPlagClientError as exc:
                check.status = PlagiarismCheck.Status.FAILED
                check.error_message = str(exc)
                check.save()
                self.stdout.write(self.style.WARNING(f'  [{i}/{len(manuscripts)}] Submit failed for "{m.title[:50]}": {exc}'))
                continue
            check.check_id = result.get('check_id', '')
            check.save()
            pending[m.id] = check
            self.stdout.write(f'  [{i}/{len(manuscripts)}] Submitted "{m.title[:50]}"')

        self._poll_until_done(pending)

    def _submit_and_wait(self, manuscript, add_after=False, timeout_s=180, poll_every_s=5):
        check = PlagiarismCheck.objects.create(manuscript=manuscript)
        try:
            result = submit_check(manuscript)
        except NoPlagClientError as exc:
            check.status = PlagiarismCheck.Status.FAILED
            check.error_message = str(exc)
            check.save()
            self.stdout.write(self.style.WARNING(f'    Submit failed: {exc}'))
            return
        check.check_id = result.get('check_id', '')
        check.save()
        self._poll_until_done({manuscript.id: check}, timeout_s=timeout_s, poll_every_s=poll_every_s, add_after=add_after)

    def _poll_until_done(self, pending, timeout_s=420, poll_every_s=5, add_after=True):
        deadline = time.time() + timeout_s
        while pending and time.time() < deadline:
            for manuscript_id in list(pending.keys()):
                check = pending[manuscript_id]
                try:
                    status_result = get_check_status(check.check_id)
                except NoPlagClientError:
                    continue
                raw_status = (status_result.get('status') or '').lower()
                if 'complete' in raw_status or 'done' in raw_status:
                    try:
                        report = get_check_report(check.check_id)
                    except NoPlagClientError as exc:
                        check.status = PlagiarismCheck.Status.FAILED
                        check.error_message = str(exc)
                        check.save()
                    else:
                        check.status = PlagiarismCheck.Status.COMPLETED
                        check.similarity_score = report.get('overall_similarity_pct')
                        check.report = report
                        check.save()
                        self.stdout.write(f'    Completed: {check.manuscript.title[:50]} — {check.similarity_score}% similarity')
                        if add_after:
                            try:
                                add_to_corpus(check.manuscript)
                            except NoPlagClientError:
                                self.stdout.write(self.style.WARNING('    Could not add to corpus.'))
                    del pending[manuscript_id]
                elif 'fail' in raw_status or 'error' in raw_status:
                    check.status = PlagiarismCheck.Status.FAILED
                    check.error_message = status_result.get('error_message', '')
                    check.save()
                    self.stdout.write(self.style.WARNING(f'    Failed: {check.manuscript.title[:50]}'))
                    del pending[manuscript_id]
            if pending:
                time.sleep(poll_every_s)
        for manuscript_id, check in pending.items():
            self.stdout.write(self.style.WARNING(f'    Timed out waiting on: {check.manuscript.title[:50]} (left as pending)'))
