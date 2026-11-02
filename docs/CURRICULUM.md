# Pasathai – Thai curriculum (Phase E)

The curriculum below is Pasathai's own teaching plan. It is **not** certified or approved by any authority, and the app does
not claim that it follows a national curriculum (Swedish *modersmål* or Thai). Teachers decide how to use it.

## 1. Audit of the source material (31 Oct 2026)

| Source | What it is | Where | Use |
|---|---|---|---|
| "Lär dig thailändska" (`th`) | Pasathai's own course, Swedish explanations; before Phase E 14 lessons on L1–L5, Swedish only | `content/academy-th.js` | Main course; Thai explanations and 8 new lessons added in Phase E |
| "Läsa och skriva thailändska" (`thr`) | Pasathai's reading/writing course in the order of BOOK 42 (10 chapters), written for the app; Swedish + Thai | `content/academy-th-read.js` | Reading track; public |
| BOOK 42 (`b42`) | The book itself as exercises in the app (10 chapters, 79 reading lines, 168 words, 113 exercises) | Database only (`course_content`), never in the public repository | Teachers and signed-in students only |
| Pronunciation module | Consonants, vowels, tones, finals, live/dead, clusters, leading consonants, rhythm | `content/pronunciation-th.js` | Practice area, all levels |
| Teacher courses (`t-…`) | Made in the Content Manager (Excel, Word, PDF) | Database | Each teacher's own |

Known issues in BOOK 42 already reported to the owner (Swedish tone labels that look swapped; แม่ฮันนา/แม่แอนนา; a few typos).
They are not corrected in the app until the owner decides.

## 2. Structure

Course › Level › Unit › Lesson › Exercise. A *chapter* is a lesson in the book-based courses.

Each lesson has nine parts: 🎯 objectives · teacher explanation · Thai examples (reading or dialogue) · Swedish **or** Thai
explanation (the learner's choice) · Thai audio on every Thai text · vocabulary · practice (▶ Practise) · short assessment
(📝 5 questions, pass mark 70 %) · completion status.

The curriculum is data: a course lists `levels`, `units` (`{ id, level, title, lessons: [ids] }`) and `lessons`. New lessons,
units or whole courses need no code changes. A course without `units` shows one unit per level; lessons not listed in a unit
still appear at the end of their level.

## 3. Levels and units of "Lär dig thailändska"

Learners are placed by **ability, not age**: the setup screen has a placement test (3 questions per level; the suggestion is
the first level with fewer than 60 % right). The learner or teacher can always choose another level.

| Level | Plan (spec) | Units → lessons |
|---|---|---|
| **L1 Beginner** | alphabet, basic vowels, basic vocabulary, greetings, simple pronunciation | *Skrift och ljud*: Introduktion, Konsonanter, Vokaler och vokallängd, De fem tonerna · *Första orden*: Hälsningar, Siffror och priser |
| **L2 Foundation** | short/long vowels, spelling, basic tones, everyday words, simple sentences | *Läsa och stava*: **Stava: korta och långa vokaler**, **Enkla meningar** · *Vardag*: Familjen, Beställa mat |
| **L3 Elementary** | final consonants, live/dead syllables, sentence construction, everyday conversation | *Ljud och meningar*: **Slutkonsonanter och levande/döda stavelser**, **Bygga meningar: tid och sambandsord** · *Ute i stan*: Handla och pruta, Hitta vägen |
| **L4 Intermediate** | clusters, leading consonants, reading comprehension, writing, listening | *Läsa mer*: **Kluster och ledande konsonanter**, **Läsförståelse: ett brev från Bangkok** · *Praktisk thailändska*: På apoteket, Telefon och möten |
| **L5 Advanced** | complex sentences, longer texts, writing, conversation, translation, culture | *Texter och kultur*: **Längre text: Songkran**, **Översätta och sammansatta meningar** · *Kommunikation*: Säga vad du tycker, Formellt och vardagligt språk |

Bold = new in Phase E. Every lesson has Swedish and Thai explanations, objectives in both languages and exercise instructions
in both languages.

## 4. Practice area (Academy → Practice)

Pronunciation module (Phase D) and eight drills built from every lesson up to the learner's level: listening comprehension,
reading (no sound), spelling (build the word from its letters), sentence building, vocabulary Thai → Swedish and Swedish → Thai,
translating sentences Swedish → Thai and Thai → Swedish. Learning games (Games tab) and spaced-repetition review stay.

## 5. Explanation language

Svenska or ภาษาไทย, chosen in the setup and on every Academy screen, saved in the learner's profile and synced to the student's
account. It changes lesson titles, objectives, explanations, exercise instructions and tips where a Thai text exists; Thai
examples and Thai audio are always there. Swedish meanings of words stay visible in both modes (useful for children in Sweden).
