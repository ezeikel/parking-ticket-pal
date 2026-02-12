# Prompt Optimization Research (Feb 2026)

Model-specific and provider-specific prompt engineering findings for each AI
model/service in the PTP pipeline.

---

## Claude Sonnet 4.5 — `models.creative` (Script Generation)

**Used for**: Tribunal case video scripts, news video scripts, challenge letters

### What works best

- **XML tags** for structure (`<input>`, `<constraints>`, `<output_format>`) —
  Claude was trained on these
- **Few-shot examples** (2-3 input/output pairs) when output format matters
- **Explicit output contract**: "Write exactly 200-250 words", "5 segments"
- **Precise length targets** — Claude 4.x follows word counts well
- **Success criteria**: Define what "done" looks like
- **Structured output via Zod schemas** works well with `generateObject`

### What to avoid

- The word "think" (triggers extended thinking sensitivity in Sonnet 4.5)
- "Be thorough" / "go above and beyond" (causes overtriggering in Claude 4.x)
- Vague instructions expecting rich output (Claude 4.x is more concise by
  default)
- Prefilled assistant responses (deprecated in Opus 4.6)

### Sources

- [Anthropic Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)

---

## GPT-4o / GPT-4o-mini — `models.text` / `models.textFast` (Parsing, Captions)

**Used for**: Structured extraction, social media captions, text formatting

### What works best

- **Structured output via `generateObject`** with Zod schemas
- Clear role/task framing in prompt
- Concise instructions — GPT-4o follows them well

### What to avoid

- `z.string().url()` in Zod schemas — OpenAI rejects `format: "uri"` in
  structured output. Use `z.string()` instead.
- Overly complex nested schemas (simplify where possible)

---

## Gemini 3 Flash — `models.analytics` (Scoring, Analysis)

**Used for**: Scoring tribunal cases, scoring news articles, image analysis

### What works best

- **Numerical scoring prompts**: "Score from 0 to 1 based on: [criteria list]"
- **Batch processing**: Score multiple items in one call for consistency
- **Structured output** via `generateObject` with simple schemas
- Cost-effective for high-volume tasks

---

## Gemini 3 Pro Image — `models.geminiImage` (Scene Images)

**Used for**: Clay diorama scene images for video backgrounds

### What works best

- **Narrative descriptions** over keyword lists
- **Style anchor at the start**: "Generate a soft 3D clay miniature diorama
  scene. Stylised, warm tilt-shift look, rounded shapes, matte clay textures,
  soft studio lighting."
- **Specific scene details**: Reference actual case/article details (location,
  objects, situation)
- **"No text in the image"** — prevents unwanted text rendering
- Uses `generateText` (not `generateImage`) — images come back in
  `result.files`

### What to avoid

- Disconnected keyword lists (worse results than narrative)
- Generic descriptions ("a parking scene") — be specific ("a clay car parked
  across a dropped kerb on a residential street")
- Text in images (inconsistent rendering)

### Sources

- [Google: How to Prompt Gemini 2.5 Flash](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/)

---

## Perplexity Sonar — `models.search` (News Discovery)

**Used for**: Discovering UK motorist news articles

### What works best

- **Short system prompt** (<1KB) for persona, format, constraints only
- **Search-triggering instructions in user message** (not system prompt)
- **Specific source whitelist**: Name exact publications (BBC News, The Guardian,
  Daily Mail, etc.) to avoid YouTube/Reddit results
- **Category constraints in prompt**: List exact categories to help structured
  extraction downstream
- **`generateText`** (not `generateObject`) — Sonar returns prose with citations

### What to avoid

- XML-style meta-tokens (`<goal>`, `##system##`) — blocked by Sonar
  sanitization
- Overly long system prompts (may truncate)
- Expecting structured JSON output directly from Sonar — parse with a second
  model instead
- `z.string().url()` in downstream parsing — OpenAI rejects `format: "uri"`

### Sources

- [Perplexity Prompt Engineering](https://www.datastudios.org/post/perplexity-ai-prompt-engineering-techniques-for-more-accurate-responses-in-2025)
- [Perplexity Search Context Size Guide](https://docs.perplexity.ai/guides/search-context-size-guide)

---

## ElevenLabs — Sound Effects API (Music + SFX)

**Used for**: Background music, transition SFX, verdict SFX, news alert SFX

### What works best

- **Audio terminology**: Use terms the model understands — "whoosh", "braam",
  "ambience", "drone", "impact", "sting", "chime"
- **Sequential descriptions** for multi-part effects: "short bright digital
  chime, then a subtle low braam"
- **Specific material/surface descriptors**: "wooden gavel on sounding block" >
  "gavel sound"
- **Mood + genre anchors for music**: "subtle tense suspenseful background
  music, dramatic, courtroom drama feel" works well
- **3-5 specific descriptors** per prompt — focused beats verbose
- **High prompt influence** for predictable results

### What to avoid

- **Vague genre labels alone**: "news music" or "upbeat music" produces
  generic/bad results
- **Too many adjectives** (>5-6) — prompt gets diluted
- **Asking for full songs** — the API is for sound design, not music production

### Music-specific notes

The SFX API is designed for sound design, not music production. It can generate
"instrumental musical clips of up to 22 seconds" but there is no dedicated music
prompting guide from ElevenLabs. What works:

- **Mood + genre + instrument anchors**: "subtle tense suspenseful background
  music, dramatic, news broadcast feel, modern electronic, steady pulse"
- **"seamless loop"** at the end — enables the looping feature for continuous
  playback
- **Keep it ambient/textural** — the model handles background textures and loops
  better than melodic compositions
- **Iterate empirically** — music results are more variable than SFX; re-generate
  if quality is poor

If consistent high-quality music is needed, consider a dedicated AI music API
(Suno, Udio) or curated royalty-free tracks.

### Technical constraints

- **Max 22 seconds** for music, **30 seconds** for SFX — use `loop` in Remotion
  for longer audio
- Generate components separately then combine for complex compositions

### Working prompts (PTP)

```
# Background music (tribunal + news — both work well)
subtle tense suspenseful background music, dramatic, courtroom drama feel, modern, seamless loop
subtle tense suspenseful background music, dramatic, news broadcast feel, modern electronic, steady pulse, seamless loop

# Transition SFX
soft whoosh, gentle air movement, clean minimal cinematic transition swoosh

# Verdict SFX (allowed)
single clean wooden gavel tap on sounding block, bright positive resolution chime, warm reverb, professional courtroom audio

# Verdict SFX (refused)
single clean wooden gavel tap on sounding block, low serious orchestral note, solemn mood, professional courtroom audio

# News alert SFX
short bright digital chime, then a subtle low braam, modern news broadcast alert sting
```

### Sources

- [ElevenLabs Sound Effects Docs](https://elevenlabs.io/docs/overview/capabilities/sound-effects)
- [ElevenLabs SFX Prompting Help](https://help.elevenlabs.io/hc/en-us/articles/25735604945041)

---

## ElevenLabs — Text to Speech API (Voiceover)

**Used for**: Video voiceovers with word-level timestamps

### Current config

- Model: `eleven_v3`
- Voice: `P6bTNc9ZMZitpFPNJFbo`
- Speed: `0.95` (slightly slower for clarity)
- Stability: `0.5`, Similarity: `0.75`, Style: `0.3`
- Format: `mp3_44100_128`
- Uses `convertWithTimestamps` for word-level alignment

### Tips

- Word timestamps are derived from character-level alignment data
- Duration is determined by the last word's end time
- Upload to R2 immediately after generation

---

## Summary: Key Differences

| Provider         | Model             | PTP alias        | Best use                 | Key pitfall                       |
| ---------------- | ----------------- | ---------------- | ------------------------ | --------------------------------- |
| Anthropic        | Claude Sonnet 4.5 | `models.creative`| Scripts, creative writing| Vague = minimal output            |
| OpenAI           | GPT-4o            | `models.text`    | Complex text tasks       | `z.string().url()` breaks schemas |
| OpenAI           | GPT-4o-mini       | `models.textFast`| Parsing, captions        | Same schema issue                 |
| Google           | Gemini 3 Flash    | `models.analytics`| Scoring, analysis       | N/A                               |
| Google           | Gemini 3 Pro Img  | `models.geminiImage`| Scene images          | Generic prompts = generic images  |
| Perplexity       | Sonar             | `models.search`  | News discovery           | Returns YouTube without whitelist |
| ElevenLabs       | SFX API           | —                | Music, SFX               | Vague prompts = bad audio         |
| ElevenLabs       | TTS v3            | —                | Voiceover                | N/A                               |
