# Yunxuan Zou — academic homepage

The standalone bilingual homepage is published at https://akihixuan.github.io/new/.

## Design and content

The November 2026 revision follows the compact academic layout of https://rainbowluocs.github.io/: white background, text profile sidebar, simple blue links, ordinary lists and thin section rules. Its HTML and CSS are independently implemented. Personal copy, education, CV, thesis citation and analytics are carried forward from this repository's existing homepage. No reference-site biography, portrait or publications are reused.

- `index.html`: complete English content, navigation and real CV/BibTeX links work without JavaScript.
- `content.js`: English/Chinese copy and thesis citation. Keep academic facts synchronized with the static English HTML.
- `app.js`: optional language/theme preferences, copying and citation dialog.
- `styles.css`: responsive presentation; all navigation remains visible at narrow widths.
- `analytics*.js`, `analytics.css`: existing GoatCounter integration; local previews are not counted.
- `media/`: existing CV and assets plus a static `.bib` citation. Earlier illustration assets remain available, but the page no longer loads the observatory or method scripts.

The listed research item is a master's thesis, not a conference publication. Its repository record is public; full-text access is restricted. No confirmed personal portrait was available.

## Preview and publish

From the repository root, serve with `python3 -m http.server 4328 --bind 127.0.0.1` and open `/new/`.

Preserve the existing root homepage. Commit source changes on `main` with `[skip ci]` to avoid rebuilding the root Jekyll site. Publish only the `new/` subtree to `gh-pages`, based on its latest head, and verify GitHub Pages deployment success. Use a fast-forward update with a checked expected head; never force overwrite a newer revision.

Validation for this revision: desktop 1280px and mobile 390px/320px rendering; English/Chinese switching; light/dark theme; citation dialog and copy feedback; preference reload; no-JavaScript navigation and static citation link; local assets, unique IDs, anchor targets and JavaScript syntax. Preview browser reported no JavaScript errors.
