# Adding courses, lessons, words and questions

Content lives in `content/` and is separate from the game logic. Add a row or a lesson object and it appears in the app;
no other file needs to change. Run `npm test` afterwards: it checks that every language is filled in, every exercise has
its right answer among the options, ids are unique and every level works for every language pair and age.

**Rule for content:** use real words and natural translations. Do not translate word-for-word when the meaning changes;
add a `note` instead (examples in the files: Thai พี่/น้อง, ยาย/ย่า, Swedish *halv nio*, Spanish *pez/pescado*).
Mark new courses `sample: true` until they are reviewed by a native speaker.

## 1. Kids Language Learning – `content/kids-language.js`

* `pairs`: the language pairs shown to children. Languages: `th`, `sv`, `en`, `es`. A new pair (e.g. `{ id: 'en-es', from: 'en', to: 'es' }`)
  works at once, because every row has all four languages; add its name to `pairs` in `js/family/i18n.js`.
* `levels[n].lessons[]`: `{ id, icon, type, name: {th, sv, en}, items: [...] }`
  * `type: 'words'` – rows `w(id, picture, th, sv, en, es, note)`; picture = emoji, `color:#hex` or `num:5`
  * `type: 'sentences'` – rows `s(id, picture, th, sv, en, es, note)`; in Thai mark word breaks with `|` (`ฉัน|ชอบ|แมว`)
  * `type: 'dialogue'` – rows with picture `'A'` or `'B'` (the speaker)
  * `type: 'story'` – lines plus `questions: [{ q: {th,sv,en,es}, opts: [{th,sv,en,es}, …], a: <index of right option> }]`
* Exercises are generated (listen, picture, match, spell, complete, build, translate, reply, questions, speak); age decides which.
* Parents can add family words and switch lessons off in the Parent Dashboard without editing files.

## 2. Knowledge & Word Games – `content/knowledge.js`

* `questions`: `q(id, band, category, picture, {th,sv,en}, [right answer, wrong, wrong])` – band 2 = ages 5–6, 3 = 7–8, 4 = 9–10
* `sounds`: animal sounds as each language writes them (used for ages 3–4)
* Word guessing uses the KeyKids vocabulary (`VOCAB` in `js/keykids/core.js`); flags use `js/data/countries.js`; maths is generated.

## 3. Adult Language Academy – `content/academy-*.js`

A course: `A.courses.<target> = { target, explain: [languages for explanations], passPct, lessons: [...] }`.
A lesson:

```js
{ id: 'sv-a2-jobb', level: 'A2', icon: '💼', skills: ['work', 'conversation', 'grammar'],
  title: { th, en }, goal: { th, en },
  dialogue: [{ who: 'A', t: 'Swedish line', tr: { th, en } }],          // who: '' for a reading text
  vocab:    [{ t: 'chef', tr: { th, en }, note: { th, en } }],
  grammar:  { title: { th, en }, body: { th, en }, table: [['8:30', 'halv nio']] },
  exercises: [
    { type: 'mc', prompt: 'halv nio', q: { th, en }, opts: [{ th, en }, …], a: 0 },
    { type: 'gap', text: 'Vi ___ börja klockan åtta.', opts: ['måste', 'har', 'är'], a: 'måste' },
    { type: 'order', answer: 'När har vi lunch?' },
    { type: 'translate', from: { th, en }, answer: 'Jag kommer från Thailand.', accept: ['other correct versions'] },
    { type: 'listen', say: 'target sentence', opts: [{ th, en }, …], a: 0 },
    { type: 'write', task: { th, en }, model: 'model answer' } ] }
```

`skills` use: vocabulary, grammar, listening, speaking, reading, writing, pronunciation, conversation, work, real.
Levels: A1, A2, B1, B2, C1. Level tests are built automatically from the level's lessons (pass mark `passPct`).
Every text in `tr`, `title`, `goal`, `grammar` must exist for every language in `explain` (checked by `npm test`).
A new course file must be added as a `<script>` line in `academy.html` and `parent.html`.

## 4. Screen texts

All texts of the family pages are in `js/family/i18n.js` (Thai, Swedish, English). `npm test` fails if a key is missing in one language.
