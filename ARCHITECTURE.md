# Applied Studio 02 architecture

The application is a static, browser-local learning platform. GitHub Pages serves the source and bundled mathematical typesetting assets. There is no application server, account service, remote learner database or API key.

## Boundaries

| Layer | Responsibility | Location |
| --- | --- | --- |
| Curriculum | Original book-aligned overview, questions, references and projects | data.js |
| Detailed content | Objectives, prerequisites, explanations, formal rules, symbols, derivations, examples, conceptual checks and transfer prompts | src/content/ |
| Mathematical domain | Pure mathematical models, safe number parsing and sampled model data | math.js, src/engine/models.js |
| Learning domain | Review scheduling, recommendations, search ranking and chapter measures | src/engine/learning.js |
| State | Learner records, normalized preferences and persistence | store.js, src/core/session.js |
| Route lifecycle | Lazy page loading, navigation race protection and cleanup | src/core/router.js |
| User actions | Notes, bookmarks, preferences, backup, import, accessibility and book actions | src/core/actions.js |
| UI | Shared shell, question forms, mathematical rendering, command dialog and lab tools | src/ui/ |
| Pages | Deep lessons, exploration, practice and supporting pages | src/pages/ |
| File service | Local PDF validation and IndexedDB lifecycle | src/services/book.js |

## Route lifecycle

Each navigation creates an AbortController. The previous route's owned listeners and observers are disposed. A navigation sequence prevents a slow module import from replacing a newer requested page. Page modules load on demand; mathematical output is cached by expression and display mode.

Lesson tabs retain the document and its controls while updating a shareable URL through the History API. Focus mode, larger text and theme persist without rebuilding the current lesson. Mobile navigation makes the inactive surface inert and confines keyboard navigation while open.

## Content contract

All 45 sections have explicitly authored detail records: an objective, two explanatory passages, a formal statement with conditions, a symbol guide, three derivation steps, an additional worked example, a conceptual check and a transfer task. Existing worked examples remain available.

Each section has three foundational numerical questions plus a harder transfer challenge. Question keys retain the section-index convention and extend it with index 3. Numerical tolerances are explicit; small-valued challenges use tighter tolerances so zero cannot accidentally pass.

All 315 formal and worked equations are checked using strict KaTeX rendering. The prerequisite graph must reference earlier, existing sections. Mathematical invariants and selected calculations are independently checked by finite differences, quadrature and feasible-domain comparisons.

## Learner data and compatibility

The existing applied-studio-v1 localStorage key and version-1 backup envelope remain compatible. Studio 02 adds a normalized studio object with its own schema marker for theme, text size, focus mode, study goal, conceptual checks, confidence and experiment pins. Old backups receive default preferences.

Original completion, notes, bookmarks and numerical records remain intact. The PDF database remains applied-private-book, version 1. No PDF is included in source, deployment artifacts or progress exports.

Lesson evidence is four numerical checks and one conceptual check, 20% each. Exploration and self-reported confidence are separate. These are transparent practice indicators, not validated proficiency estimates.

## Review scheduling

An independent correct response advances a question through 3, 7, 14, 30 and 60 days. An incorrect or assisted response resets its streak and remains due. Legacy records without a scheduled due date retain the original three-day interpretation. Timestamps schedule reviews; the learner's local calendar records active days.

## Deployment

KaTeX is pinned in package-lock.json. Preparation copies its browser module, stylesheet, fonts and license into an ignored vendor directory. The module is served as .js for predictable static-host MIME handling. No CDN is required.

GitHub Actions runs npm ci, tests and the static build before publishing dist/. Source and deployable artifacts are separate. A failed check prevents deployment.
