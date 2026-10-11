# Catalog extraction from the source PDFs

The season / episode catalog comes **only** from the three PDFs in
[`docs/source-pdfs/`](source-pdfs) (copied from `Downloads/Projects/`; the originals are untouched):

| File | Series | Seasons | Episodes | Movies / OVAs / specials |
| --- | --- | --- | --- | --- |
| `Naruto (0_220).pdf` | Naruto | 5 | 220 | 7 |
| `Naruto_ Shippuden (0_500).pdf` | Naruto: Shippuden | 22 | 500 | 16 |
| `Boruto_ Naruto Next Generations (0_293).pdf` | Boruto: Naruto Next Generations | 6 ("List 1" – "List 6") | 293 | 0 |
| **Total** | | **33** | **1,013** | **23** |

Output: [`server/data/catalog.json`](../server/data/catalog.json), regenerated with `npm run extract:catalog`.

## What the PDFs contain

They are checklist exports with a strict visual hierarchy, which the extractor reads by font size
using `pdfjs-dist`:

| Font size | Meaning | Example |
| --- | --- | --- |
| 26 pt | Series heading (may wrap onto two lines) | `Naruto (0/220)` |
| 20 pt | Season heading | `Season 1: 1st Stage (0/35)`, `List 1 (0/52)` |
| 16 pt | Arc heading | `Land of Waves Escort` |
| 11 pt after `●` | Metadata: air dates, stated counts | `10/03/2002 - 05/28/2003`, `35 Episodes` |
| 11 pt checklist item | An episode number **or** a movie/OVA/special title | `6`, `12`, `Find the Crimson Four-Leaf Clover! (OVA)` |

## Interpretation rules

1. **Episode ranges.** Within an arc, consecutive numbers come in pairs that mark an inclusive range:
   `6`, `12` → episodes 6–12. A lone number is a single episode (e.g. `101` under "Standalone side story").
   This interpretation is verified, not assumed: the extracted count for **every season and every series
   matches the "N Episodes" figure printed in the PDF** (the validator fails otherwise).
2. **Movies / OVAs / specials** are checklist items with text instead of a number. They are kept as
   catalog entries (`kind: "special"`) in the exact position they appear, so the global `orderIndex`
   reproduces the PDF's recommended watch order (e.g. *Find the Crimson Four-Leaf Clover! (OVA)* between
   episodes 12 and 13). Type is `ova` if the title contains "(OVA)", `movie` if it contains "Movie",
   otherwise `special`. They are not counted in the PDF's episode totals, so the app reports them separately.
3. **Arcs** are attached to each episode. Arcs that resume after an interruption (e.g. *Master's Prophecy
   and Vengeance* in Shippuden season 6) are kept as separate segments in order. Specials have no arc.
4. **Seasons** keep their original names (`Season 1: 1st Stage`, `Season 12`, `List 3`) and air dates.
5. **Stable keys** are used for idempotent seeding: `naruto`, `naruto-s01`, `naruto-e001`,
   `naruto-s01-sp1`.

## Limitations (handled transparently)

- **No per-episode titles.** The PDFs list episode-number ranges per arc only. Titles are stored as
  `null` and the UI shows "Episode N" plus the arc, rather than inventing titles. The validator reports
  this as a warning. If you later have a reliable title source, add `title` values to `catalog.json`
  and re-run `npm run seed`; the schema already supports it.
- **No descriptions** are present for seasons or episodes, so `description` is empty.
- **Diacritics.** `pdftotext` dropped characters such as "ū" ("Chnin"); `pdfjs-dist` extracts them
  correctly ("Chūnin Exams", "Ninshū"), so the latter is used.
- **One unlabelled special.** *Finally a clash! Jonin VS Genin!! Indiscriminate grand melee tournament
  meeting!* has no "(OVA)"/"Movie" marker in the PDF, so it is typed as a generic `special`.
- No overlaps exist between the three PDFs (each covers one series), so no de-duplication was needed;
  the validator still checks for duplicate keys and duplicate episode numbers.

## Validation checks

`npm run validate:catalog` (and the seed script, which refuses to import on errors) checks:

- duplicate series / season / episode keys and duplicate `orderIndex`
- duplicate or missing episode numbers within a series (1..N must be contiguous)
- episodes assigned to a season of a different series, or to an unknown season
- specials without a title, episodes without a number
- extracted vs. stated episode counts per season and per series, and stated season counts
