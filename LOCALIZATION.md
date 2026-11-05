# English and Burmese learning

Studio 04 adds an English/Burmese choice throughout the platform and a separate mathematical terminology page. The Burmese option is **မြန်မာဘာသာ · Burma**; the document uses the standard language tag `my`.

## Scope

- All 45 original companion lessons: objectives, intuition, conditions, symbols, derivation explanations, examples, four numerical questions with hints and solutions, conceptual checks, prediction scenarios and transfer prompts.
- Navigation, settings, feedback, lesson help, model controls and interpretation, application projects and the readiness check.
- A book-scoped terminology reference with 102 bilingual entries. Each explains meaning, when and why to use the idea, an example, notation and related lessons.
- Search across English and Burmese. Myanmar section numbers such as `၇.၂` resolve to section 7.2.
- Myanmar digits and Unicode minus in answers: `၁/၂`, `−၁.၂၅` and international-digit equivalents use the same safe parser and grading rules.

The attached textbook PDF remains the learner’s own source document. Its language and contents are not altered. These are translations of the platform’s original companion material, rather than a published Burmese edition of the textbook or an official mathematics dictionary.

## Editorial approach

Write natural Unicode Burmese and explain concepts in context. Retain English technical anchors to connect explanations to textbook and university vocabulary. Preserve currencies, quantities, units, domains and mathematical conditions; USD is not converted to kyat.

Shared terminology includes ဖန်ရှင် (function), ကိန်းရှင် (variable), သတ်မှတ်နယ်ပယ် (domain), လင်မစ် (limit), ဆင်းသက်ကိန်း (derivative), အင်တီဂရယ် (integral), and ပျော့ပျောင်းမှု (elasticity). Definitions and examples establish the intended meaning where specialist Burmese usage varies.

This is authored learning content, not a certified translation. Detailed source and editorial notes are in `src/i18n/my/research-1-3.md`, `research-4-6.md` and `research-7-8.md`.

## Research informing implementation

- [Unicode Consortium: Myanmar scripts and languages FAQ](https://www.unicode.org/faq/myanmar.html): Unicode, compatible fonts, and the difference from legacy Zawgyi encodings.
- [Unicode Technical Note 11](https://www.unicode.org/notes/tn11/UTN11_3.pdf): Burmese character sequences and representation.
- [W3C: Language tags in HTML and XML](https://www.w3.org/International/articles/language-tags/): document language tags.
- [W3C: CSS Text](https://www.w3.org/TR/css-text-3/): language-sensitive typography, line breaking and spacing.
- [University of Yangon: Mathematics](https://www.uy.edu.mm/mathematics/): local curriculum names connecting calculus to English technical vocabulary. This does not establish an official Burmese glossary.
- [Noto Myanmar](https://github.com/notofonts/myanmar): the Unicode font project and SIL Open Font License.

## Typography and font

The site bundles unmodified Noto Sans Myanmar from the [Google Fonts source directory](https://github.com/google/fonts/tree/main/ofl/notosansmyanmar). The license is `assets/fonts/NOTO-MYANMAR-OFL.txt`. Runtime fonts stay on the site’s origin; no font CDN is required.

File: `assets/fonts/NotoSansMyanmar.ttf`

SHA-256: `7abbbfbe2514105d7ce94937aee3feb2ba89b73a256c8b77b5866bd9b83e32ec`

Burmese uses normal letter spacing, generous line height and script-aware wrapping. The concept map uses wrapping HTML labels inside SVG nodes. Mathematics retains its existing notation and KaTeX rendering.

## State and localization boundaries

`src/i18n/core.js` loads the pack on demand. Authored source/translation pairs become an exact-message catalog, with templates for interpolated counts and feedback. The English curriculum remains unchanged.

A switch updates presentation without reconstructing the lesson. Question input, answered state, opened reference terms, model representation and notes remain in place. Weak maps retain original generated text for switching back. Personal notes, editable values, file names, mathematics, route IDs and action attributes are protected.

The studio preference schema is 4; the existing `applied-studio-v1` storage key and version-1 backups remain compatible. Language does not change mastery. Model comparisons retain canonical source values.

## Validation

Automated checks cover all translation contracts, source-aligned symbols and choices, 102 unique reference entries covering every lesson, bilingual search, numeric parsing, formula and answer preservation, message coverage, backup compatibility and selected independent calculations.

Browser QA covers all 180 lesson modes at 390px, 15 supporting routes, switching during a question, Myanmar-numeral grading, unchanged notes, reload persistence, terminology ranking, section lookup, formula and command search, and translated lesson help.
