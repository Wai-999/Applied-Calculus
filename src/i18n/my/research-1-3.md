# Burmese content notes: Chapters 1–3

Prepared on 2026-11-04 for the original Applied Calculus companion lessons. This is an authored Burmese translation, not an official textbook translation, a certified translation, or a claim of approval by an educational institution.

## Scope and fidelity

`chapters-1-3.js` contains all 20 lessons from 1.1 through 3.7. It translates the lesson overview, all original worked-step prose, four numerical question prompts/hints/solutions/units per lesson, both detailed explanation paragraphs, theorem prose, symbol meanings, derivation explanations, the second worked example, conceptual check, transfer task, and prediction scenario.

The English records remain the authority for IDs, prerequisites, formula strings, equation strings, answers, tolerances and correct-choice indices. Arabic digits, currencies, variable names and quantitative assumptions remain unchanged so language switching does not change the mathematics or financial model. The `@` character remains in every mission scene for runtime substitution of the fictional learner's name.

## Research and sources

- [Unicode Consortium: Myanmar scripts and languages FAQ](https://unicode.org/faq/myanmar.html). Read for Unicode versus legacy Zawgyi encodings, valid combining-character order, and Unicode-capable fonts. Content uses Unicode Burmese and does not attempt automatic conversion of personal notes.
- [Unicode Technical Note 11, Representing Myanmar in Unicode](https://www.unicode.org/notes/tn11/UTN11_4.pdf). Reference for character representation; not a mathematics terminology source.
- [University of Yangon, Mathematics](https://www.uy.edu.mm/mathematics/). The primary curriculum page was opened and reviewed. Its first-year curriculum names Trigonometry and Differential Calculus and Differential and Integral Calculus in English, while later courses include Calculus of Several Variables. This supports retaining English technical anchors to connect Burmese explanations to university/textbook vocabulary. It does not establish an official Burmese translation for each term.
- [University of Information Technology, Calculus I syllabus](https://uit.edu.mm/degree-programs/cst-11201-syllabus/). Search results described derivative definitions, related rates and maxima/minima; direct retrieval returned HTTP 502. Used only as a curriculum-discovery lead, not as evidence for exact Burmese wording.
- [Shwebo University, Mathematics Department](https://www.sbu.edu.mm/mathematics-department/). Search results listed English mathematical module names; direct retrieval returned HTTP 403. Used only as a curriculum-discovery lead.

Searches did not produce a verifiable comprehensive official Burmese calculus glossary. The wording therefore favors a clear Burmese description plus the corresponding English technical term, rather than inventing a claim that a particular translation is officially standardized. The mathematical explanations are translated from this repository's original content, not copied from the web sources.

## Editorial terminology

| English | Burmese wording used | Meaning safeguard |
| --- | --- | --- |
| Function | ဖန်ရှင် | One output per allowed input; not merely any formula or table. |
| Domain | သတ်မှတ်နယ်ပယ် | Includes practical restrictions, not just algebraic admissibility. |
| Range | ထွက်ရှိတန်ဖိုးအစု | Actual attained outputs, distinguished from the domain. |
| Variable | ကိန်းရှင် | Dependent/independent role explained where needed. |
| Slope | တိမ်းစောင်းနှုန်း | Output units per input unit. |
| Limit | လင်မစ်; ချဉ်းကပ်တန်ဖိုး | Nearby behavior separated from the assigned point value. |
| Derivative | ဆင်းသက်ကိန်း | Team-wide editorial convention; explained as instantaneous change rate. ဒေရီဗေးတစ် may be a search alias elsewhere. |
| Differentiation | ဆင်းသက်ကိန်းရှာဖွေခြင်း; ဆင်းသက်ခြင်း | Keeps the operation distinct from its result. |
| Differential | အနည်းငယ်ပြောင်းလဲပမာဏ | Described as a tangent-predicted change, not generally the exact change. |
| Logarithm | လော့ဂရစ်သမ် | Explained as an exponent/inverse operation. |
| Exponential | ထပ်ညွှန်း | Repeated multiplication distinguished from repeated addition. |
| Polynomial | ဗဟုကိန်း | Nonnegative integer powers in this context. |
| Rational function | အချိုးဖန်ရှင် | Denominator restrictions remain explicit. |
| Asymptote | အာဆင်တိုတ် | A description of limiting behavior, not a compulsory attained value. |
| Marginal | နောက်ထပ်တစ်ယူနစ်ဆိုင်ရာ | Descriptive wording distinguishes a derivative estimate from a finite next-unit change. |
| Relative rate | နှိုင်းရနှုန်း | Absolute rate divided by the current amount. |
| Revenue / profit | ရောင်းရငွေ / အမြတ် | Costs are subtracted for profit; the terms are not interchanged. |
| Elasticity | ပျော့ပျောင်းမှု | Defined via relative/percentage response; a dimensionless measure. |

## Checks completed

The translation module imports successfully in Node. A structural validation against the English sources checks all 20 IDs; 80 question records; lengths of overview steps; 40 detailed explanation paragraphs; exact symbol keys and symbol counts; 60 derivation reasons; 60 worked-example reasons; three options per conceptual check and mission; nonempty required prose; and preservation of the `@` placeholder. Runtime/browser QA and global terminology catalog integration remain with the parent task.
