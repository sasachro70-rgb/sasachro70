# Thai audio in Pasathai – research and decisions (Phase D)

Checked 31 Oct 2026 against the providers' own pages where they could be read. Prices and voice lists change: check the
links before you rely on a number. "Not verified" means the source could not be read or did not say.

## 1. Options

| Option | Thai? | Voices (documented) | Quality / tones | API | Price (official page) | Use rights | Privacy |
|---|---|---|---|---|---|---|---|
| **Google Cloud Text-to-Speech** | Yes (th-TH) | Chirp 3 HD voices list th-TH; Standard/WaveNet/Neural2 Thai voices exist but the voice table did not load in my check. Pasathai asks the API for the list at run time and picks the best (Chirp3-HD → Neural2 → WaveNet → Standard), female or male. | Neural/Chirp: natural; tones follow the written tone rules well for ordinary words | REST, key on the server | Free each month: 4 M characters Standard/WaveNet, 1 M Neural2 and Chirp 3 HD; then 4 / 4 / 16 / 30 USD per 1 M | Generated audio may be used in your app (Google Cloud terms) | Only the text is sent from the server function; no student data |
| **Microsoft Azure AI Speech** | Yes (th-TH) | th-TH-PremwadeeNeural (female), th-TH-NiwatNeural (male), th-TH-AcharaNeural (female) – from a voice catalogue; Microsoft's own list did not load here | Neural, natural; same voices as Microsoft Edge "read aloud" | REST/SDK, key on the server | Free tier (F0): 0.5 M characters a month for neural voices; the paid price was not shown on the page I could read | Generated audio may be used in your app (Azure terms) | Text only |
| **Amazon Polly** | **No** | Thai is not in Polly's list of 41 supported languages | – | – | – | – | – |
| **ElevenLabs** | Only the Eleven v3 model (Multilingual v2, Flash: no) | Many voices, not Thai-native by default | Natural, but tone accuracy for Thai not documented | REST | Paid plans | Plan-dependent | Text to a US company |
| **NECTEC Vaja 8** (Thailand) | Yes, Thai/English | Nok (female), A (male) | Thai-made | Library API | Licence by agreement with NECTEC (no public price) | By licence | Runs where you install it |
| **iApp Thai TTS** (Thailand) | Yes | Not verified (page did not load) | Not verified | REST | Not verified | Not verified | Not verified |
| **Browser Web Speech API** | Depends on the device | Only what the device has: e.g. Apple "Kanya" (iPhone/iPad/Mac, must be downloaded), Microsoft Edge's online Thai voices (Premwadee, Niwat), Google's Thai voice on Android. Many Windows PCs and Chromebooks have **none** | Varies a lot | In the browser, free | Free | Free | Text stays on the device (online voices send it to the browser maker) |
| **Licensed recordings** | – | Own recordings by a Thai teacher; Lingua Libre / Wikimedia Commons (free licence CC BY-SA, attribution required; Thai coverage small) | Best: real native speaker | Upload in the Content Manager | Own time | Own recordings: yours. Free-licence files: keep the licence and the name of the speaker | Files stay in the private bucket |

Sources: Google pricing <https://cloud.google.com/text-to-speech/pricing>, Google Chirp 3 HD <https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd>,
Amazon Polly languages <https://docs.aws.amazon.com/polly/latest/dg/supported-languages.html>,
Azure pricing <https://azure.microsoft.com/pricing/details/cognitive-services/speech-services>, Azure Thai voices (catalogue) <https://json2video.com/ai-voices/azure/languages/thai/>,
ElevenLabs languages <https://elevenlabs.io/docs/help-center/other/what-languages-do-you-support>, NECTEC Vaja <https://nectec.or.th/en/?p=17178>,
Lingua Libre <https://en.wikipedia.org/wiki/Lingua_Libre>.

## 2. What Pasathai does (priority, as the spec asks)

1. **Recorded audio** uploaded by a teacher for a word or a sentence (Content Manager → lesson → Audio). Always first.
2. **Natural Thai neural voice from the cloud** (Google Cloud Text-to-Speech through the Edge Function `tts`, see DEPLOY.md).
   Each sentence is generated once and reused by everyone. Daily limits keep it inside the free amount.
3. **The device's own Thai voice** – only a voice whose language really is Thai (`th`). If the cloud voice is not set up,
   is offline or has reached today's limit, this is used.
4. **Never** a Swedish or English voice reading Thai. With no Thai voice at all the text is shown and the page explains how
   to add a Thai voice to that kind of device.

Per device (Voice settings → Thai voice): *Automatic* (1 → 2 → 3, default), *Natural cloud voice* (1 → 2 only) or
*This device only* (1 → 3).

Azure is a good second provider (three Thai neural voices, free 0.5 M characters a month). It can be added to the same Edge
Function later if Google is not wanted.

## 3. Controls on every Thai word and sentence

▶ play (learner's speed) · 🐢 slow (0.5×) · 1× normal speed · 🔁 three times · 🧩 word by word (each word on its own, also
tappable) · speed bar 0.5× / 0.75× / 0.85× (default for beginners) / 1× / 1.25× / 1.5×. Pressing ▶ again = listen again.

## 4. Pronunciation module (Academy → Practice → Pronunciation)

Consonants (all 44, class, start and end sound), vowels (short/long pairs and the special vowels), the five tones with a
minimal set and the tone rules, final consonants (the eight groups), live and dead syllables, consonant clusters (true and
false), leading consonants (ห and อ), words, sentence rhythm. Each item: Thai, romanization, Swedish (or Thai) explanation,
audio, notes. Listening practice: hear a consonant, hear a tone, short or long.

## 5. Audio for teachers (Content Manager)

Per lesson, every word **and every sentence** has its own row: ▶ preview, ⬆ upload or replace, ✕ remove. Files go to the
private bucket `course-media` under `<course>/audio/<lesson>/…` (never inside the database row; the lesson only keeps the
path). Uploading needs a tick that the teacher has the right to use the recording, and a source/licence note is saved with
the lesson.
