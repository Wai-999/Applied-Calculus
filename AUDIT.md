# Website audit — 5 November 2026

Audited Studio 04 against the published baseline `54a0ce5`, then fixed and retested the findings below. Browser tests used an isolated `localhost` origin so existing production and `127.0.0.1` learner records were preserved.

## Findings resolved

| Area | Problem | Correction |
| --- | --- | --- |
| Mobile lessons | The floating help button covered lesson-tab targets on narrow screens. | Help now sits in the sticky lesson toolbar, with responsive stacking and measured anchor offsets. |
| Dark theme | Selected practice navigation, model-note headings, and project explanations failed measured text contrast. | Foreground and background colors now follow the active theme. |
| Navigation | A superseded lazy route could change resume, practice, or diagnostic state. | Route sequence checks run before page-render side effects. |
| Language changes | A language query change could restart the current practice session; a late language request could affect a later route. | Practice identity excludes language, and cancelled route handlers ignore late requests. |
| Mastery feedback | An earlier mastery badge could remain visible after a wrong or assisted answer. | The badge updates from the current attempt record. |
| Backup and restore | Copied backup text could be stale; an old URL language could override imported preferences. | Copy reads current state, and restore/reset clears the old language override. |
| Stored records | Malformed optional review metadata could discard otherwise valid learning data. | Invalid optional schedule fields are normalized while valid notes and mastery remain. |
| Search keyboard behavior | Enter on Close or a result could invoke the dialog-wide default result; results lacked native link roles. | Native link/button activation, focused arrow navigation, IME handling, and bilingual result announcements. |
| Dialogs and landmarks | Initial dialog announcements could be English in Burmese mode; navigation landmarks lacked names. | Dialog text localizes before opening, and both navigation regions have accessible names. |
| Terminology navigation | Jumping to a term did not move keyboard focus. | The opened term summary receives focus. |
| Live localization | A synchronously updated text node could expose an outdated cached source string. | Source lookup recognizes new application text before observer delivery. |
| Graph accuracy | Off-scale curves were clamped to plot bounds, creating false flat segments. | True coordinates are rendered through a unique SVG clipping region. |
| Applied model domains | Profit and surplus graphs/tables could extend into negative modeled demand prices. | Feasible quantity limits apply consistently to graph, slider, table, and CSV samples. |
| Numeric grading | A fixed absolute tolerance was too generous for small answers such as decimal rates. | Foundational and transfer questions use scale-sensitive tolerances. |
| Mathematical wording | An objective value was described as its absolute value; a periodic rate amplitude omitted the absolute value. | Corrected English and Burmese explanations, including `|Aω|`. |

## Verification

- **66 automated tests pass.** Added 22 audit regressions covering state, localization, numerical correctness, dependencies, and generated routes. Numerical checks include 32 derivative answers by centered finite differences and 29 accumulation answers by quadrature.
- **96 general-page browser checks:** 16 routes × English/Burmese × desktop (1440px), tablet (768px), and phone (360px). Checked horizontal overflow, heading/main counts, duplicate IDs, control names, ARIA targets, unintended text clipping, and header overlap.
- **360 lesson browser checks:** all 45 lessons × four modes × both languages at 360px and maximum 26px lesson text. No layout findings, covered tab centers, duplicate help controls, missing panels, or KaTeX errors. Four additional tablet/desktop lesson checks passed.
- **32 contrast checks:** eight representative routes × two languages × light/dark themes. Previously failing direct text combinations now pass the applicable 4.5:1 normal / 3:1 large-text thresholds measured by the audit script.
- Browser interaction checks confirmed practice advances after a language switch, wrong answers remove mastery feedback, Burmese confirmation text appears before interaction, cancelling preserves records, search arrows move focus, and Enter on Close leaves the current route unchanged.
- Profit lab interaction confirmed a quantity of 120 clamps to 80 when starting price falls to 40; raising starting price to 100 restores the 120 maximum. Its sampled table remains consistent with the current model.
- **449 generated page variants** checked for internal route/ID integrity, including all lesson modes, labs, applications, lesson-specific study links, 102 term permalinks, and synthetic saved notes.
- Built asset audit: 125 files, 147 module imports, 61 CSS asset references, and seven HTML asset references, with no missing targets. No textbook PDF, credentials, private learner backups, or personal notes are packaged.
- Final `npm test`, `npm run build`, and `git diff --check` are required before publishing. GitHub Actions repeats the tests and build before deploying.

## Verification limits

Browser execution used Chrome at explicit responsive viewport sizes; it does not certify every browser/device or WCAG conformance. Accessible semantics and keyboard behavior were checked, but actual screen-reader speech was not tested. Burmese technical wording has automated consistency coverage and documented research, but has not received independent native-speaker certification.

The optional PDF attachment browser test was blocked by the Chrome extension's disabled local-file access. No browser permission was changed and no PDF was uploaded. Attachment validation, storage implementation, and page-reference tests were reviewed, but this audit does not claim a completed attachment-and-reload browser test. Extension-generated message-channel/Grammarly console messages occurred during automation and are distinct from application failures.

