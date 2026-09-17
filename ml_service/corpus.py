"""
Synthetic corpus for the reviewer-matching dataset (see generate_dataset.py).

Content here is PROGRAMMATICALLY ASSEMBLED, not individually hand-written:
each "subtopic" below is a fine-grained slice of one of PaperBridge's 41
specialty tags (backend/apps/users/taxonomy.py) with a small bank of
domain-appropriate phrases. generate_dataset.py composes those phrases into
titles, abstracts and reviewer blurbs using sentence templates, with a
seeded RNG so the corpus is reproducible and each item's text is
distinctive without hand-authoring 120+ full paragraphs individually. See
ml_service/README.md for why this is an honest way to build a corpus large
enough to train and evaluate a ranker.

Deliberately picks 16 of the 41 tags (2 per specialty-tag group), not all
41 — enough to cover every group and every planned hard case at this
dataset size (120 manuscripts / 60 reviewers) without spreading them so
thin that most subtopics get 1-2 manuscripts. Every tag not used here
still exists in the taxonomy and works fine for auto-suggest and for any
manuscript/reviewer created through the live app.

SUBTOPICS entries are the hidden ground truth the ranker is evaluated
against: generate_dataset.py uses `id`/`tag`/`group` to grade relevance (see
relevance_for in that file). No subtopic label, weight or id is written into
any text the matcher reads (titles, abstracts, keywords, expertise blurbs,
research areas, publications) -- only `vocab` and `keywords` phrases are.
Specialty tags are derived from the hidden tags but deliberately noisy
(generate_dataset.apply_tag_noise), the way real self-selected tags are.
The group name does still appear as the manuscript's broad `category` and a
publication `venue`; neither is read by the ranker's features.
"""

SUBTOPICS = [
    # ---- Computer Science: machine-learning ----------------------------
    {
        'id': 'ml-vision', 'tag': 'machine-learning', 'group': 'Computer Science',
        'label': 'Deep learning for image classification',
        'keywords': ['convolutional neural networks', 'image classification', 'transfer learning', 'data augmentation'],
        'vocab': {
            'applications': ['medical image classification', 'defect detection on manufacturing lines', 'satellite land-cover mapping', 'wildlife camera-trap identification'],
            'methods': ['a convolutional neural network trained with transfer learning', 'an ensemble of pretrained vision backbones', 'a lightweight CNN designed for edge deployment', 'a self-supervised pretraining pipeline'],
            'gaps': ['labelled examples are scarce and expensive to collect', 'existing classifiers degrade sharply under distribution shift', 'current models are too large to run on embedded hardware'],
            'findings': ['accuracy improves by a wide margin over the strongest baseline', 'the approach generalises to unseen classes with little extra data', 'inference latency drops substantially with no loss in accuracy'],
        },
    },
    {
        'id': 'ml-network', 'tag': 'machine-learning', 'group': 'Computer Science',
        'label': 'Neural network architecture design',
        'keywords': ['neural network architecture', 'model compression', 'architecture search', 'generalisation'],
        'vocab': {
            'applications': ['tabular data prediction', 'time-series forecasting', 'graph-structured data', 'resource-constrained inference'],
            'methods': ['a neural architecture search procedure', 'a pruning and quantisation pipeline', 'a graph neural network with attention pooling', 'a residual network with novel skip connections'],
            'gaps': ['manually designed architectures under-perform on this data modality', 'existing networks over-fit on small tabular datasets', 'current search methods are prohibitively expensive to run'],
            'findings': ['the discovered architecture outperforms hand-designed baselines', 'parameter count falls sharply with accuracy preserved', 'training converges faster and more reliably'],
        },
    },
    {
        'id': 'ml-rl', 'tag': 'machine-learning', 'group': 'Computer Science',
        'label': 'Reinforcement learning for sequential decisions',
        'keywords': ['reinforcement learning', 'sequential decision making', 'reward shaping', 'sample efficiency'],
        'vocab': {
            'applications': ['warehouse robot scheduling', 'adaptive recommendation ranking', 'traffic signal control', 'inventory replenishment'],
            'methods': ['a model-based reinforcement learning agent', 'an actor-critic algorithm with reward shaping', 'an offline reinforcement learning approach', 'a multi-agent policy gradient method'],
            'gaps': ['online exploration is costly or unsafe in this setting', 'sample efficiency remains poor for long-horizon tasks', 'reward signals are sparse and delayed'],
            'findings': ['the agent reaches a strong policy with far fewer interactions', 'cumulative reward improves consistently across random seeds', 'the policy transfers to held-out environment configurations'],
        },
    },
    # ---- Computer Science: nlp ------------------------------------------
    {
        'id': 'nlp-transformer', 'tag': 'nlp', 'group': 'Computer Science',
        'label': 'Attention mechanisms in transformer models',
        'keywords': ['transformer models', 'attention mechanism', 'language modelling', 'fine-tuning'],
        'vocab': {
            'applications': ['document summarisation', 'question answering', 'low-resource machine translation', 'code generation'],
            'methods': ['a transformer encoder-decoder with modified attention', 'a fine-tuned pretrained language model', 'a sparse-attention transformer variant', 'a retrieval-augmented generation pipeline'],
            'gaps': ['quadratic attention cost limits sequence length in practice', 'fine-tuning on small datasets causes catastrophic forgetting', 'generated text is frequently unfaithful to the source'],
            'findings': ['the model attains state-of-the-art scores on standard benchmarks', 'output faithfulness improves without sacrificing fluency', 'training and inference cost fall substantially'],
        },
    },
    {
        'id': 'nlp-mt', 'tag': 'nlp', 'group': 'Computer Science',
        'label': 'Low-resource machine translation',
        'keywords': ['machine translation', 'low-resource languages', 'multilingual modelling', 'back-translation'],
        'vocab': {
            'applications': ['translating regional and minority languages', 'cross-lingual information retrieval', 'multilingual customer support', 'code-switched text processing'],
            'methods': ['a multilingual sequence-to-sequence model', 'a back-translation data augmentation scheme', 'a shared-vocabulary transfer learning approach', 'a pivot-language translation pipeline'],
            'gaps': ['parallel corpora barely exist for these language pairs', 'translation quality drops sharply outside high-resource languages', 'existing systems mishandle code-switching entirely'],
            'findings': ['translation quality improves markedly for the target language pair', 'the approach needs an order of magnitude less parallel data', 'human evaluators rate fluency and adequacy substantially higher'],
        },
    },
    {
        'id': 'nlp-sentiment', 'tag': 'nlp', 'group': 'Computer Science',
        'label': 'Sentiment and opinion mining',
        'keywords': ['sentiment analysis', 'opinion mining', 'aspect extraction', 'social media text'],
        'vocab': {
            'applications': ['product review analysis', 'social media monitoring during crises', 'financial news sentiment', 'aspect-based restaurant review mining'],
            'methods': ['an aspect-based sentiment classifier', 'a fine-tuned transformer for opinion mining', 'a lexicon-augmented neural model', 'a weakly supervised sentiment tagger'],
            'gaps': ['sarcasm and negation are systematically mishandled', 'labelled sentiment data is scarce in this domain', 'aspect boundaries are ambiguous in informal text'],
            'findings': ['aspect-level accuracy improves over prior lexicon-based methods', 'the classifier handles negation and sarcasm noticeably better', 'performance transfers well to a new domain with light tuning'],
        },
    },
    # ---- Medicine & Health: medical-imaging -----------------------------
    {
        'id': 'med-radiology', 'tag': 'medical-imaging', 'group': 'Medicine & Health',
        'label': 'Radiology image analysis',
        'keywords': ['radiology', 'medical image segmentation', 'diagnostic imaging', 'clinical validation'],
        'vocab': {
            'applications': ['detecting lung nodules on chest CT scans', 'segmenting tumours on MRI', 'grading diabetic retinopathy from fundus photographs', 'triaging chest X-rays'],
            'methods': ['a segmentation network validated against radiologist annotations', 'a multi-centre retrospective imaging study', 'an ensemble diagnostic model', 'a weakly supervised localisation approach'],
            'gaps': ['expert annotation time is the main bottleneck to scale', 'models trained at one hospital generalise poorly to another', 'small lesions are frequently missed by automated tools'],
            'findings': ['sensitivity matches or exceeds board-certified radiologists on the test set', 'the model generalises across scanners from different manufacturers', 'reading time for radiologists falls with no drop in accuracy'],
        },
    },
    {
        'id': 'med-imaging-recon', 'tag': 'medical-imaging', 'group': 'Medicine & Health',
        'label': 'Medical image reconstruction',
        'keywords': ['image reconstruction', 'MRI acceleration', 'denoising', 'inverse problems'],
        'vocab': {
            'applications': ['accelerating MRI acquisition', 'low-dose CT denoising', 'ultrasound image enhancement', 'sparse-view tomographic reconstruction'],
            'methods': ['a deep learning-based reconstruction model', 'a model-based iterative reconstruction approach', 'a diffusion-model image prior', 'an unrolled optimisation network'],
            'gaps': ['acquisition time remains a burden for patients', 'radiation dose reduction degrades image quality', 'reconstruction artefacts obscure diagnostically relevant detail'],
            'findings': ['scan time is cut substantially with diagnostic quality preserved', 'radiation dose falls while lesion conspicuity is maintained', 'reconstruction artefacts are visibly reduced in blinded review'],
        },
    },
    # ---- Medicine & Health: epidemiology ---------------------------------
    {
        'id': 'epi-network', 'tag': 'epidemiology', 'group': 'Medicine & Health',
        'label': 'Contact network modelling of disease spread',
        'keywords': ['contact network', 'disease transmission modelling', 'outbreak simulation', 'network epidemiology'],
        'vocab': {
            'applications': ['modelling respiratory disease spread in schools', 'simulating outbreak control measures in urban areas', 'estimating transmission on contact networks', 'evaluating quarantine policies'],
            'methods': ['an agent-based contact network simulation', 'a compartmental model calibrated to surveillance data', 'a network-based transmission model', 'a stochastic branching-process model'],
            'gaps': ['contact patterns are poorly captured by simple mixing assumptions', 'intervention timing is difficult to optimise under uncertainty', 'surveillance data arrives with substantial reporting delay'],
            'findings': ['the model reproduces observed outbreak trajectories closely', 'targeted interventions on network hubs reduce spread most effectively', 'estimated transmission parameters are consistent with independent studies'],
        },
    },
    {
        'id': 'epi-surveillance', 'tag': 'epidemiology', 'group': 'Medicine & Health',
        'label': 'Disease surveillance and risk factors',
        'keywords': ['disease surveillance', 'risk factor analysis', 'cohort study', 'population health'],
        'vocab': {
            'applications': ['tracking chronic disease incidence in a national cohort', 'identifying risk factors for cardiovascular disease', 'surveillance of antimicrobial resistance', 'monitoring maternal health outcomes'],
            'methods': ['a large prospective cohort study', 'a case-control study with multivariable adjustment', 'a retrospective analysis of registry data', 'a longitudinal survey with repeated measures'],
            'gaps': ['confounding factors are inconsistently accounted for in prior work', 'existing registries under-represent rural populations', 'risk estimates vary widely across studies'],
            'findings': ['several previously unreported risk factors reach statistical significance', 'the association remains robust after adjusting for known confounders', 'risk estimates are consistent across subgroups'],
        },
    },
    # ---- Engineering: robotics -------------------------------------------
    {
        'id': 'robo-manipulation', 'tag': 'robotics', 'group': 'Engineering',
        'label': 'Robotic manipulation and grasping',
        'keywords': ['robotic manipulation', 'grasp planning', 'manipulation learning', 'tactile sensing'],
        'vocab': {
            'applications': ['grasping irregularly shaped objects in warehouses', 'assembly-line part manipulation', 'fruit picking with soft grippers', 'in-hand object reorientation'],
            'methods': ['a learned grasp-planning policy', 'a tactile-feedback control loop', 'a simulation-to-real transfer pipeline', 'a vision-guided manipulation controller'],
            'gaps': ['grasp success rates drop sharply for novel object shapes', 'sim-to-real transfer introduces persistent errors', 'tactile feedback is underused in current controllers'],
            'findings': ['grasp success rate improves markedly on unseen objects', 'the sim-to-real gap narrows substantially', 'the controller adapts to slippage in real time'],
        },
    },
    {
        'id': 'robo-navigation', 'tag': 'robotics', 'group': 'Engineering',
        'label': 'Autonomous navigation and localisation',
        'keywords': ['autonomous navigation', 'SLAM', 'path planning', 'localisation'],
        'vocab': {
            'applications': ['warehouse mobile robot navigation', 'agricultural field robots', 'indoor service robot localisation', 'multi-robot exploration'],
            'methods': ['a visual SLAM pipeline', 'a learning-based path planner', 'a sensor-fusion localisation system', 'a decentralised multi-robot coordination scheme'],
            'gaps': ['localisation drifts in visually repetitive environments', 'path planning is too slow for real-time replanning', 'coordination overhead grows sharply with fleet size'],
            'findings': ['localisation error falls well below the required tolerance', 'planning runs comfortably within the real-time budget', 'the fleet coordinates with modest communication overhead'],
        },
    },
    # ---- Engineering: renewable-energy ------------------------------------
    {
        'id': 'energy-solar', 'tag': 'renewable-energy', 'group': 'Engineering',
        'label': 'Solar photovoltaic system optimisation',
        'keywords': ['photovoltaic systems', 'solar energy forecasting', 'maximum power point tracking', 'grid integration'],
        'vocab': {
            'applications': ['forecasting solar output for grid balancing', 'maximum power point tracking under partial shading', 'sizing rooftop solar installations', 'hybrid solar-storage system design'],
            'methods': ['a data-driven solar output forecasting model', 'an improved maximum power point tracking algorithm', 'a techno-economic optimisation model', 'a physics-informed forecasting approach'],
            'gaps': ['forecast accuracy degrades sharply under variable cloud cover', 'existing tracking algorithms respond slowly to shading changes', 'sizing decisions rarely account for long-term weather variability'],
            'findings': ['forecast error falls substantially against the operational baseline', 'tracking efficiency improves under rapidly changing irradiance', 'the optimised system size cuts levelised cost of energy'],
        },
    },
    {
        'id': 'energy-wind', 'tag': 'renewable-energy', 'group': 'Engineering',
        'label': 'Wind energy systems',
        'keywords': ['wind turbine', 'wind resource assessment', 'turbine control', 'offshore wind'],
        'vocab': {
            'applications': ['offshore wind farm layout optimisation', 'wind turbine blade fault detection', 'short-term wind power forecasting', 'turbine control under turbulent inflow'],
            'methods': ['a computational fluid dynamics wake model', 'a data-driven fault-detection classifier', 'a model predictive turbine controller', 'a probabilistic wind power forecasting model'],
            'gaps': ['wake interactions between turbines are poorly captured by simple models', 'blade faults are often detected only after failure', 'short-term forecasts remain too noisy for dispatch planning'],
            'findings': ['predicted farm output matches field measurements closely', 'faults are flagged well ahead of catastrophic failure', 'forecast skill improves meaningfully over the persistence baseline'],
        },
    },
    # ---- Physics: quantum-computing ---------------------------------------
    {
        'id': 'quantum-algo', 'tag': 'quantum-computing', 'group': 'Physics',
        'label': 'Quantum algorithms and complexity',
        'keywords': ['quantum algorithms', 'quantum complexity', 'variational quantum circuits', 'quantum advantage'],
        'vocab': {
            'applications': ['combinatorial optimisation on near-term hardware', 'quantum chemistry simulation', 'quantum machine learning classification', 'cryptographic problems'],
            'methods': ['a variational quantum eigensolver', 'a quantum approximate optimisation algorithm', 'a hybrid quantum-classical training loop', 'a resource-efficient quantum circuit design'],
            'gaps': ['circuit depth is limited by current hardware noise', 'classical simulation still outperforms near-term quantum hardware here', 'barren plateaus stall variational training'],
            'findings': ['the circuit achieves the target result within noise tolerances', 'trainability improves markedly over standard ansätze', 'resource requirements fall well within near-term hardware limits'],
        },
    },
    {
        'id': 'quantum-error', 'tag': 'quantum-computing', 'group': 'Physics',
        'label': 'Quantum error correction and noise mitigation',
        'keywords': ['quantum error correction', 'noise mitigation', 'fault tolerance', 'decoherence'],
        'vocab': {
            'applications': ['stabilising qubits against decoherence', 'error mitigation on noisy intermediate-scale hardware', 'surface-code fault tolerance', 'improving gate fidelity'],
            'methods': ['a surface-code error-correction scheme', 'a zero-noise extrapolation technique', 'a dynamical decoupling protocol', 'a machine-learning-assisted decoder'],
            'gaps': ['current error rates remain above the fault-tolerance threshold', 'decoding latency limits real-time correction', 'noise mitigation overhead grows quickly with circuit size'],
            'findings': ['logical error rate falls below the fault-tolerance threshold', 'decoding runs fast enough for real-time correction', 'mitigation overhead scales more favourably than prior methods'],
        },
    },
    # ---- Physics: optics ----------------------------------------------------
    {
        'id': 'optics-imaging', 'tag': 'optics', 'group': 'Physics',
        'label': 'Computational and biomedical optics',
        'keywords': ['computational imaging', 'optical coherence tomography', 'super-resolution microscopy', 'light-field imaging'],
        'vocab': {
            'applications': ['retinal imaging with optical coherence tomography', 'super-resolution fluorescence microscopy', 'light-field camera design', 'label-free cell imaging'],
            'methods': ['a computational imaging reconstruction algorithm', 'a super-resolution microscopy technique', 'a compressive sensing acquisition scheme', 'a phase-retrieval imaging method'],
            'gaps': ['spatial resolution is fundamentally limited by diffraction', 'acquisition speed trades off sharply against resolution', 'reconstruction artefacts limit clinical usefulness'],
            'findings': ['resolution improves beyond the classical diffraction limit', 'acquisition time falls with resolution preserved', 'reconstructed images match ground truth closely in blinded comparison'],
        },
    },
    {
        'id': 'optics-photonics', 'tag': 'optics', 'group': 'Physics',
        'label': 'Photonic integrated devices',
        'keywords': ['integrated photonics', 'silicon photonics', 'optical waveguides', 'photonic circuits'],
        'vocab': {
            'applications': ['on-chip optical interconnects for data centres', 'photonic neural network accelerators', 'integrated optical sensors', 'silicon photonic modulators'],
            'methods': ['a silicon photonic waveguide design', 'an integrated photonic circuit fabrication process', 'a photonic neural network architecture', 'a low-loss coupler design'],
            'gaps': ['insertion loss remains too high for large-scale integration', 'fabrication tolerances limit device yield', 'thermal drift degrades circuit performance over time'],
            'findings': ['insertion loss falls to among the lowest reported values', 'device yield improves markedly across fabrication runs', 'performance remains stable across the tested temperature range'],
        },
    },
    # ---- Business & Economics: finance --------------------------------------
    {
        'id': 'fin-risk', 'tag': 'finance', 'group': 'Business & Economics',
        'label': 'Quantitative risk analysis in finance',
        'keywords': ['financial risk modelling', 'credit risk', 'volatility forecasting', 'stress testing'],
        'vocab': {
            'applications': ['forecasting portfolio volatility', 'credit default prediction for retail lending', 'stress-testing bank balance sheets', 'systemic risk measurement'],
            'methods': ['a machine-learning-based credit risk model', 'a GARCH-family volatility model', 'a network-based systemic risk measure', 'a stress-testing simulation framework'],
            'gaps': ['existing risk models under-react to regime changes', 'rare tail events are poorly captured by standard models', 'interconnected exposures are hard to quantify'],
            'findings': ['default prediction accuracy improves over the industry-standard scorecard', 'volatility forecasts track realised volatility more closely', 'the model flags emerging systemic risk earlier than existing indicators'],
        },
    },
    {
        'id': 'fin-market', 'tag': 'finance', 'group': 'Business & Economics',
        'label': 'Market microstructure and trading',
        'keywords': ['market microstructure', 'algorithmic trading', 'liquidity', 'price impact'],
        'vocab': {
            'applications': ['modelling price impact of large trades', 'high-frequency liquidity provision', 'optimal trade execution', 'market-making strategy design'],
            'methods': ['a limit order book simulation', 'a reinforcement-learning execution strategy', 'an empirical microstructure analysis', 'an agent-based market model'],
            'gaps': ['execution costs are underestimated by simplified models', 'liquidity dries up unpredictably during stress periods', 'existing strategies overfit to historical regimes'],
            'findings': ['execution cost falls relative to a standard benchmark strategy', 'the model reproduces observed liquidity dynamics closely', 'performance holds up out-of-sample across market regimes'],
        },
    },
    # ---- Business & Economics: supply-chain ----------------------------------
    {
        'id': 'sc-logistics', 'tag': 'supply-chain', 'group': 'Business & Economics',
        'label': 'Logistics network optimisation',
        'keywords': ['logistics optimisation', 'vehicle routing', 'network design', 'last-mile delivery'],
        'vocab': {
            'applications': ['last-mile delivery route optimisation', 'warehouse network design', 'cold-chain logistics planning', 'multi-modal freight routing'],
            'methods': ['a mixed-integer optimisation model', 'a metaheuristic vehicle routing algorithm', 'a simulation-optimisation framework', 'a machine-learning-augmented routing heuristic'],
            'gaps': ['routing decisions rarely account for real-time demand variability', 'network designs are optimised for cost alone, ignoring resilience', 'existing heuristics scale poorly to large instances'],
            'findings': ['total delivery cost falls substantially against current practice', 'the redesigned network is markedly more resilient to disruption', 'the heuristic scales to instances an order of magnitude larger'],
        },
    },
    {
        'id': 'sc-resilience', 'tag': 'supply-chain', 'group': 'Business & Economics',
        'label': 'Supply chain risk and resilience',
        'keywords': ['supply chain resilience', 'disruption risk', 'inventory strategy', 'supplier diversification'],
        'vocab': {
            'applications': ['assessing supplier concentration risk', 'inventory buffering against disruption', 'post-pandemic supply chain redesign', 'supplier diversification strategy'],
            'methods': ['a network-based disruption risk model', 'a scenario-based resilience simulation', 'an empirical study of disruption events', 'a multi-tier supplier risk assessment framework'],
            'gaps': ['single-supplier dependence is systematically under-priced as a risk', 'resilience investments are hard to justify against short-term cost', 'multi-tier supplier risk is rarely visible to focal firms'],
            'findings': ['the model identifies concentration risks missed by standard audits', 'resilience investments pay back within a plausible disruption scenario', 'visibility into upstream tiers meaningfully reduces exposure'],
        },
    },
    # ---- Linguistics & Social Science: psychology ----------------------------
    {
        'id': 'psych-attention', 'tag': 'psychology', 'group': 'Linguistics & Social Science',
        'label': 'Visual attention and eye-tracking',
        'keywords': ['visual attention', 'eye-tracking', 'cognitive load', 'gaze behaviour'],
        'vocab': {
            'applications': ['studying visual attention during reading', 'eye-tracking analysis of driver distraction', 'attention allocation under cognitive load', 'gaze behaviour in visual search tasks'],
            'methods': ['an eye-tracking experiment with controlled stimuli', 'a within-subjects behavioural study', 'a gaze-contingent display paradigm', 'a mixed-methods observational study'],
            'gaps': ['attention allocation under real-world distraction is poorly understood', 'lab-based findings often fail to generalise to naturalistic settings', 'individual differences in gaze behaviour are rarely modelled'],
            'findings': ['gaze patterns differ systematically between the experimental conditions', 'attentional lapses correlate strongly with the cognitive-load manipulation', 'the effect replicates in a more naturalistic setting'],
        },
    },
    {
        'id': 'psych-wellbeing', 'tag': 'psychology', 'group': 'Linguistics & Social Science',
        'label': 'Mental health and wellbeing interventions',
        'keywords': ['mental health intervention', 'wellbeing', 'stress and coping', 'behavioural intervention'],
        'vocab': {
            'applications': ['evaluating a workplace stress-reduction programme', 'a digital mental health intervention for students', 'a mindfulness-based coping intervention', 'a peer-support wellbeing programme'],
            'methods': ['a randomised controlled trial', 'a pre-post intervention study', 'a longitudinal survey of participants', 'a mixed-methods evaluation'],
            'gaps': ['intervention effects often fade after the study period ends', 'existing programmes are rarely evaluated with a control group', 'engagement drops off sharply after the first few weeks'],
            'findings': ['participants report significantly lower stress at follow-up', 'engagement remains high throughout the intervention period', 'effects are sustained at the three-month follow-up'],
        },
    },
    # ---- Linguistics & Social Science: education ------------------------------
    {
        'id': 'edu-online', 'tag': 'education', 'group': 'Linguistics & Social Science',
        'label': 'Online and blended learning',
        'keywords': ['online learning', 'blended learning', 'learning analytics', 'student engagement'],
        'vocab': {
            'applications': ['designing a blended undergraduate course', 'analysing engagement in a MOOC', 'personalised feedback in online learning platforms', 'predicting at-risk students from learning analytics'],
            'methods': ['a quasi-experimental comparison of course formats', 'a learning-analytics dashboard evaluation', 'a survey-based engagement study', 'a predictive model of student outcomes'],
            'gaps': ['engagement in fully online formats drops off over the term', 'at-risk students are often identified too late to intervene', 'existing analytics dashboards are rarely acted on by instructors'],
            'findings': ['engagement in the blended format exceeds the fully online comparison group', 'the predictive model flags at-risk students early enough to intervene', 'instructors who used the dashboard reported it changed how they taught'],
        },
    },
    {
        'id': 'edu-assessment', 'tag': 'education', 'group': 'Linguistics & Social Science',
        'label': 'Assessment and feedback design',
        'keywords': ['formative assessment', 'feedback design', 'rubric design', 'peer assessment'],
        'vocab': {
            'applications': ['redesigning formative assessment in a large course', 'peer-assessment calibration', 'rubric design for open-ended tasks', 'automated feedback generation'],
            'methods': ['a design-based research study', 'a comparative study of assessment formats', 'a rubric-validation study with inter-rater reliability', 'an automated feedback system evaluation'],
            'gaps': ['feedback often arrives too late to change student behaviour', 'peer assessments show weak inter-rater reliability without calibration', 'rubrics are inconsistently applied across markers'],
            'findings': ['feedback turnaround falls from weeks to days', 'inter-rater reliability improves substantially after calibration training', 'students report the revised rubric as noticeably clearer'],
        },
    },
    # ---- Mathematics & Statistics: statistics ---------------------------------
    {
        'id': 'stat-causal', 'tag': 'statistics', 'group': 'Mathematics & Statistics',
        'label': 'Causal inference methods',
        'keywords': ['causal inference', 'propensity score', 'instrumental variables', 'observational data'],
        'vocab': {
            'applications': ['estimating treatment effects from observational health data', 'evaluating a policy intervention without randomisation', 'causal effect estimation in economics', 'confounding adjustment in epidemiological studies'],
            'methods': ['a propensity-score matching approach', 'an instrumental-variables estimator', 'a doubly robust causal estimator', 'a difference-in-differences design'],
            'gaps': ['unmeasured confounding threatens standard observational estimates', 'existing estimators perform poorly with high-dimensional covariates', 'treatment effect heterogeneity is rarely modelled explicitly'],
            'findings': ['the estimator remains stable under a range of confounding scenarios', 'estimated treatment effects match those from a benchmark randomised trial', 'heterogeneous effects are recovered accurately across subgroups'],
        },
    },
    {
        'id': 'stat-bayesian', 'tag': 'statistics', 'group': 'Mathematics & Statistics',
        'label': 'Bayesian modelling and inference',
        'keywords': ['Bayesian inference', 'hierarchical models', 'Markov chain Monte Carlo', 'probabilistic modelling'],
        'vocab': {
            'applications': ['hierarchical modelling of multi-site clinical trial data', 'Bayesian forecasting of epidemic trajectories', 'probabilistic modelling of sensor data', 'Bayesian model comparison in ecology'],
            'methods': ['a hierarchical Bayesian model', 'a Markov chain Monte Carlo sampling scheme', 'a variational inference approximation', 'a Bayesian nonparametric model'],
            'gaps': ['posterior sampling is prohibitively slow at this data scale', 'model comparison is sensitive to prior specification', 'existing approximations underestimate posterior uncertainty'],
            'findings': ['sampling converges an order of magnitude faster than standard MCMC', 'inferences are robust across a wide range of reasonable priors', 'uncertainty estimates match a gold-standard sampler closely'],
        },
    },
    # ---- Mathematics & Statistics: optimization ---------------------------------
    {
        'id': 'opt-combinatorial', 'tag': 'optimization', 'group': 'Mathematics & Statistics',
        'label': 'Combinatorial and integer optimisation',
        'keywords': ['combinatorial optimisation', 'integer programming', 'heuristic search', 'scheduling'],
        'vocab': {
            'applications': ['workforce scheduling under complex constraints', 'facility location planning', 'exam timetabling', 'production scheduling'],
            'methods': ['a mixed-integer programming formulation', 'a metaheuristic local-search algorithm', 'a branch-and-cut solution approach', 'a constraint-programming model'],
            'gaps': ['exact solvers do not scale to realistic problem sizes', 'existing heuristics get stuck in poor local optima', 'real-world constraints are often simplified away in prior models'],
            'findings': ['solution quality improves markedly over the previous heuristic', 'the exact method solves instances an order of magnitude larger', 'solve time falls from hours to minutes'],
        },
    },
    {
        'id': 'opt-convex', 'tag': 'optimization', 'group': 'Mathematics & Statistics',
        'label': 'Convex and large-scale optimisation',
        'keywords': ['convex optimisation', 'first-order methods', 'distributed optimisation', 'large-scale learning'],
        'vocab': {
            'applications': ['training large-scale machine learning models', 'distributed optimisation across data centres', 'sparse regression at scale', 'resource allocation in networks'],
            'methods': ['an accelerated first-order optimisation method', 'a distributed consensus optimisation algorithm', 'a stochastic variance-reduced gradient method', 'a proximal splitting algorithm'],
            'gaps': ['communication overhead dominates runtime in distributed settings', 'convergence guarantees for existing methods are overly pessimistic', 'first-order methods converge slowly on ill-conditioned problems'],
            'findings': ['convergence speed improves substantially over standard gradient methods', 'communication cost falls without hurting solution quality', 'the method converges reliably even on ill-conditioned instances'],
        },
    },
    # ---- Environmental Science: climate-science ---------------------------------
    {
        'id': 'climate-modelling', 'tag': 'climate-science', 'group': 'Environmental Science',
        'label': 'Climate risk prediction with machine learning',
        'keywords': ['climate risk prediction', 'machine learning for climate', 'extreme weather forecasting', 'climate model downscaling'],
        'vocab': {
            'applications': ['predicting extreme rainfall events', 'downscaling coarse climate model output', 'forecasting drought risk for agriculture', 'wildfire risk prediction'],
            'methods': ['a deep learning-based downscaling model', 'a machine-learning extreme-event classifier', 'a hybrid physics-ML forecasting model', 'a statistical downscaling approach'],
            'gaps': ['coarse climate models miss regionally important detail', 'extreme events are rare, leaving little labelled training data', 'existing forecasts provide too little lead time for planning'],
            'findings': ['downscaled output matches high-resolution simulations closely', 'the classifier detects extreme events with useful lead time', 'forecast skill improves meaningfully over the climatological baseline'],
        },
    },
    {
        'id': 'climate-carbon', 'tag': 'climate-science', 'group': 'Environmental Science',
        'label': 'Carbon cycle and emissions modelling',
        'keywords': ['carbon cycle modelling', 'emissions inventory', 'land-use change', 'carbon sequestration'],
        'vocab': {
            'applications': ['estimating regional carbon emissions from satellite data', 'modelling land-use change impacts on carbon storage', 'quantifying soil carbon sequestration potential', 'tracking deforestation-driven emissions'],
            'methods': ['a satellite-data-driven emissions inventory', 'a land-surface carbon cycle model', 'a remote-sensing change-detection pipeline', 'a process-based carbon flux model'],
            'gaps': ['emissions inventories rely on outdated or coarse activity data', 'land-use change is poorly captured at fine spatial resolution', 'soil carbon estimates vary widely across measurement methods'],
            'findings': ['the inventory resolves emissions hotspots missed by coarser estimates', 'estimated carbon storage aligns closely with field measurements', 'the change-detection pipeline flags deforestation events promptly'],
        },
    },
    # ---- Environmental Science: sustainability -----------------------------------
    {
        'id': 'sus-circular', 'tag': 'sustainability', 'group': 'Environmental Science',
        'label': 'Circular economy and resource efficiency',
        'keywords': ['circular economy', 'resource efficiency', 'life-cycle assessment', 'waste valorisation'],
        'vocab': {
            'applications': ['life-cycle assessment of packaging alternatives', 'designing a circular economy strategy for electronics', 'waste valorisation in food processing', 'material recovery from end-of-life products'],
            'methods': ['a life-cycle assessment study', 'a material-flow analysis', 'a techno-economic circularity assessment', 'a case study of an industrial symbiosis network'],
            'gaps': ['recovery rates for these materials remain low in current practice', 'life-cycle assessments rarely account for regional supply chains', 'economic incentives for circularity are weak without policy support'],
            'findings': ['the proposed pathway cuts life-cycle emissions substantially', 'material recovery rates improve markedly over current practice', 'the strategy is cost-competitive under a plausible policy scenario'],
        },
    },
    {
        'id': 'sus-water', 'tag': 'sustainability', 'group': 'Environmental Science',
        'label': 'Water resource sustainability',
        'keywords': ['water resource management', 'water scarcity', 'watershed modelling', 'water reuse'],
        'vocab': {
            'applications': ['modelling watershed response to land-use change', 'evaluating water reuse for urban agriculture', 'assessing water scarcity risk under climate change', 'optimising reservoir operation'],
            'methods': ['a hydrological watershed model', 'a water-scarcity risk assessment framework', 'a reservoir-operation optimisation model', 'a survey-based water-reuse feasibility study'],
            'gaps': ['watershed models are rarely validated against long-term observed data', 'water scarcity projections vary widely across climate scenarios', 'reservoir operating rules are seldom updated with new inflow data'],
            'findings': ['the model reproduces observed streamflow closely over the validation period', 'the reuse scheme meets a meaningful share of non-potable demand', 'the optimised operating rule improves reliability under drought scenarios'],
        },
    },
]

SUBTOPIC_BY_ID = {s['id']: s for s in SUBTOPICS}
TAGS_USED = sorted({s['tag'] for s in SUBTOPICS})

# ---------------------------------------------------------------------------
# People: name pools and institutions, used for both the 200 demo authors and
# the 60 reviewers. Curated for broad geographic/name diversity, deliberately
# reused (with the seeded RNG) rather than needing 260 unique invented names.
# ---------------------------------------------------------------------------

GIVEN_NAMES = [
    'Amara', 'Liang', 'Sofia', 'Rajesh', 'Ingrid', 'Carlos', 'Haruto', 'Fatima', 'Emily', 'Johan',
    'Nur', 'Andrei', 'Isabel', 'Tobias', 'Priya', 'Daniel', 'Grace', 'Lucas', 'Anna', 'Michael',
    'Chidi', 'Elena', 'Hana', 'Ines', 'Kwame', 'Lukas', 'Marcus', 'Mei', 'Oluwaseun', 'Ryo',
    'Sana', 'Talia', 'Viktor', 'Wei Ling', 'Ben', 'Camille', 'Astrid', 'Yuki', 'Noor', 'Diego',
    'Freya', 'Hassan', 'Ines', 'Jana', 'Kofi', 'Leila', 'Mateus', 'Nadia', 'Omar', 'Petra',
    'Quentin', 'Rina', 'Samuel', 'Tariq', 'Uma', 'Valentina', 'Wojciech', 'Ximena', 'Yara', 'Zane',
    'Aditi', 'Bruno', 'Chiara', 'Dimitri', 'Esther', 'Felipe', 'Greta', 'Hiroshi', 'Iris', 'Jamal',
    'Katarina', 'Luca', 'Mireille', 'Nikhil', 'Olga', 'Paolo', 'Qadir', 'Rosa', 'Stefan', 'Thandiwe',
]

FAMILY_NAMES = [
    'Okafor', 'Wu', 'Rossi', 'Nair', 'Solberg', 'Mendoza', 'Sato', 'Al-Sayed', 'Carter', 'Muller',
    'Aisyah', 'Volkov', 'Fernandes', 'Weber', 'Sharma', 'Kim', 'Mwangi', 'Silva', 'Kowalski', "O'Brien",
    'Eze', 'Petrova', 'Kobayashi', 'Duarte', 'Boateng', 'Bergmann', 'Reyes', 'Zhang', 'Adeyemi', 'Tanaka',
    'Malik', 'Grunberg', 'Hoffmann', 'Tan', 'Carmichael', 'Dubois', 'Nilsen', 'Yamamoto', 'Haddad', 'Torres',
    'Lindqvist', 'Farouk', 'Costa', 'Novak', 'Mensah', 'Haddad', 'Cardoso', 'Idris', 'Castillo', 'Kowalczyk',
    'Petit', 'Sridhar', 'Osei', 'Yousef', 'Devi', 'Moreno', 'Nowak', 'Reyes', 'Haile', 'Wanjiru',
    'Bianchi', 'Kaur', 'Lindberg', 'Pereira', 'Abiodun', 'Steiner', 'Marchetti', 'Endo', 'Adler', 'Rahman',
    'Ferreira', 'Novikov', 'Larsson', 'Kariuki', 'Marino', 'Ionescu', 'Baptiste', 'Winkler', 'Osman', 'Delgado',
]

INSTITUTIONS = [
    ('University of Malaya', 'Kuala Lumpur', 'Malaysia'),
    ('Universiti Sains Malaysia', 'Penang', 'Malaysia'),
    ('National University of Singapore', 'Singapore', 'Singapore'),
    ('University of Tokyo', 'Tokyo', 'Japan'),
    ('Seoul National University', 'Seoul', 'South Korea'),
    ('Tsinghua University', 'Beijing', 'China'),
    ('Indian Institute of Technology Bombay', 'Mumbai', 'India'),
    ('University of Melbourne', 'Melbourne', 'Australia'),
    ('University of Auckland', 'Auckland', 'New Zealand'),
    ('ETH Zurich', 'Zurich', 'Switzerland'),
    ('Imperial College London', 'London', 'United Kingdom'),
    ('University of Edinburgh', 'Edinburgh', 'United Kingdom'),
    ('Technical University of Munich', 'Munich', 'Germany'),
    ('Delft University of Technology', 'Delft', 'Netherlands'),
    ('KTH Royal Institute of Technology', 'Stockholm', 'Sweden'),
    ('University of Toronto', 'Toronto', 'Canada'),
    ('University of British Columbia', 'Vancouver', 'Canada'),
    ('Stanford University', 'Stanford', 'United States'),
    ('University of Michigan', 'Ann Arbor', 'United States'),
    ('University of Sao Paulo', 'Sao Paulo', 'Brazil'),
    ('University of Cape Town', 'Cape Town', 'South Africa'),
    ('University of Nairobi', 'Nairobi', 'Kenya'),
    ('Cairo University', 'Cairo', 'Egypt'),
    ('King Abdullah University of Science and Technology', 'Thuwal', 'Saudi Arabia'),
    ('Pontifical Catholic University of Chile', 'Santiago', 'Chile'),
    ('University of Warsaw', 'Warsaw', 'Poland'),
    ('Charles University', 'Prague', 'Czech Republic'),
    ('University of Oslo', 'Oslo', 'Norway'),
    ('Aalto University', 'Espoo', 'Finland'),
    ('Nanyang Technological University', 'Singapore', 'Singapore'),
]

TITLE_TEMPLATES = [
    '{Method} for {application}',
    'Towards {application_bare}: a {method_bare}-based approach',
    'Evaluating {method_bare} for {application}',
    '{Method} in {application}: a case study',
    'Rethinking {application_bare} with {method_bare}',
]
