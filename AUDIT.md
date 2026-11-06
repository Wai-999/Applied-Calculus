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

## Follow-up recovery audit — 5 November 2026

Continued from `7b82f3e` with failure recovery and keyboard transitions. Resolved these additional findings:

- A blocked `localStorage` getter prevented startup. Storage access now occurs inside guarded calls.
- Failed persistence still displayed a successful note save. Notes, restores, and resets now distinguish saved results from changes available only in the current session.
- Unreadable saved data could be overwritten by a fresh session. Its original raw bytes are preserved separately under `applied-studio-recovery-v1`, with an in-memory fallback if storage is full. Settings provides an English/Burmese recovery download. Recovery data is never inserted into page markup or automatically imported.
- Malformed optional conceptual-check records could crash workspace/insights or create misleading evidence. Invalid records are discarded while valid notes and independent results remain.
- IndexedDB aborts, blocked opens, and synchronous transaction errors could leave book actions pending indefinitely. These paths now reject with existing localized errors; the previous attachment remains usable after failed writes.
- Repeated book loads leaked object URLs, and an empty database could leave a stale link. URL replacement now releases old resources and clears missing records.
- A failed attachment retained the file-input value, preventing selection of the same file from reliably triggering a retry. The input is now released and cleared after each attempt.
- Resizing an open phone menu to desktop left the mobile keyboard trap active. The menu state and inert regions now reset, with focus moved to a visible navigation link.
- Advancing between lesson panes left focus on the body after hiding the old button. Transitions now focus the selected mode tab. Guide-to-reasoning transitions wait for native dialog close before transferring focus.
- Wider-screen checks exposed fixed-color brand text, keyboard shortcuts, learner badges, and hover backgrounds. These now use the active theme's tested color tokens.

Verification for the follow-up:

- **87/87 automated tests pass**, including 21 new book, storage, recovery UI, and navigation regressions.
- Browser checks confirmed note and language persistence after reload, backup text containing the current note/preference, invalid JSON rejection, and corrected pane/guide/menu focus behavior.
- An isolated local copy with a synthetic damaged record displayed the recovery card correctly in English and Burmese; the card survived reload. No production record was damaged or replaced.
- **12 recovery-page layout and contrast checks** passed: three viewport widths (360/768/1440px), two languages, and two themes. Checks used fresh reloads to avoid measuring intermediate color transitions.
- Recovery download handlers preserve the exact original bytes in automated tests. Browser download-event monitoring timed out, so this follow-up does **not** claim verification of the operating system's saved download file.
- Browser PDF attachment remains limited by disabled extension file access. Six controlled IndexedDB tests cover success, abort, blocked open, setup errors, URL lifecycle, and invalid files; they do not replace the outstanding real-browser upload test.

The existing Chrome-only and native-speaker/screen-reader verification limits still apply.

