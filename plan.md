# Documentation Rewrite Plan

## Analysis of Current State

### Problems with README.md
1. **Unequal weighting** -- Library usage comes first ("Use as a Library"), CLI/language second ("Use as a Language"). For a project whose identity is "a programming language where `think` is a keyword", the language should not feel secondary. Both paths need equal prominence.
2. **No clear two-path entry** -- A newcomer hits a wall of features before understanding the two distinct ways to use ThinkLang: as a language (`.tl` files + CLI) or as a JS/TS library (`import { think } from "thinklang"`).
3. **Feature showcase is inconsistent** -- Some features get full code blocks, others get one-line bullets (pipeline, reason blocks, modules, context management, error handling).
4. **Example tables are just file listings** -- Two large tables of filenames don't help a reader learn anything. They belong in docs, not the README.
5. **Project Structure / Development sections are developer-only** -- These are for contributors, not users. They belong in CLAUDE.md.

### Problems with docs/
1. **Homepage (`index.md`) is barebones** -- 30 lines total. No code examples, no quick comparison, no explanation of what makes ThinkLang different. Five feature cards with one-sentence descriptions.
2. **Sidebar buries library usage** -- "Library Usage" is categorized under "Infrastructure" alongside Testing, Cost Tracking, and Provider System. It should be a first-class entry point.
3. **Getting Started mixes both paths** -- The page starts with CLI installation, then tacks on library usage at the bottom. A newcomer who only wants the JS/TS library has to scroll past CLI content.
4. **CLI Reference uses dev commands** -- Shows `npx tsx src/cli/index.ts` instead of `thinklang` in examples. Environment Variables section only mentions `ANTHROPIC_API_KEY`, ignoring multi-provider reality.
5. **Examples page is language-only** -- No JS/TS library examples despite 10 example files existing in `examples/js/`.
6. **Inconsistent dual coverage** -- Some guide pages (big-data, agents) show both language and library syntax. Others (guards, confidence, context, match, pipeline) only show ThinkLang syntax. Library users reading those pages get nothing actionable.

---

## Rewrite Plan

### Phase 1: README.md (complete rewrite)

**New structure:**

1. **Hero** -- Name, one-line tagline, one compelling ThinkLang code example
2. **Two Paths** -- Two clearly separated, equally weighted sections:
   - **"Use as a Language"** -- `.tl` files, CLI, type system, structured output, the full language experience. Short code example + install command.
   - **"Use as a Library"** -- `npm install thinklang`, JS/TS import, zero-config. Short code example showing `import { think } from "thinklang"`.
3. **Features** -- Concise feature showcase. Each feature gets a small code snippet showing BOTH the language syntax and the library equivalent side-by-side where applicable:
   - AI Primitives (think, infer, reason)
   - Structured Types / Zod Schemas
   - Agents & Tools
   - Guards & Validation
   - Confidence Tracking
   - Big Data (batch, map, reduce, stream)
   - Pattern Matching & Pipeline
   - Multi-Provider (Anthropic, OpenAI, Gemini, Ollama)
4. **Supported Providers** -- Concise table
5. **Quick Start: Language** -- Install, configure env, run first program (compact)
6. **Quick Start: Library** -- npm install, first think() call (compact)
7. **IDE Support** -- Brief with link to docs
8. **Documentation** -- Link to thinklang.dev
9. **License** -- MIT

**Removed from README (moved to docs or CLAUDE.md):**
- Exhaustive example file tables
- Project Structure section
- Development section

### Phase 2: VitePress Config (restructure sidebar & nav)

**New nav bar:**
```
Guide | Library | Reference | Examples
```

**New sidebar structure:**
```
/guide/
  Getting Started
    |- Introduction              (getting-started.md -- rewritten, language-focused)
    |- Language Tour              (language-tour.md -- refreshed)
  Language Features
    |- Types                     (types.md)
    |- AI Primitives             (ai-primitives.md -- add library notes)
    |- Context                   (context.md -- add library notes)
    |- Confidence                (confidence.md -- add library notes)
    |- Guards                    (guards.md -- add library notes)
    |- Match                     (match.md -- add library notes)
    |- Pipeline                  (pipeline.md)
    |- Agents & Tools            (agents.md)
    |- Big Data                  (big-data.md)
    |- Error Handling            (error-handling.md -- add library notes)
  Tooling
    |- Testing                   (testing.md)
    |- Cost Tracking             (cost-tracking.md)

/library/                         <-- NEW top-level section
    |- Quick Start               (NEW)
    |- Core Functions            (NEW)
    |- Agents & Tools            (NEW)
    |- Big Data & Streaming      (NEW)
    |- Custom Providers          (NEW -- merged from guide/providers.md + library-usage.md)
    |- Error Handling            (NEW)

/reference/
    |- Syntax                    (syntax.md)
    |- Types                     (types.md)
    |- Runtime API               (runtime-api.md -- refreshed)
    |- CLI                       (cli.md -- fixed)
    |- Errors                    (errors.md)
```

### Phase 3: docs/index.md (homepage rewrite)

- Better tagline
- Two action buttons: "Get Started (Language)" + "Get Started (Library)"
- 6 updated feature cards with better descriptions:
  1. AI as Syntax
  2. Type-Safe Output
  3. Agents & Tools
  4. Use as a Library
  5. Multi-Provider
  6. Production Ready

### Phase 4: docs/guide/getting-started.md (rewrite -- language-focused)

- Focus exclusively on the language/CLI path
- Clean flow: install -> configure -> first program -> structured example -> CLI commands -> next steps
- Remove the library teaser at the bottom (it now has its own section)
- Add prominent link to "Library Quick Start" for users who want JS/TS only

### Phase 5: New docs/library/ pages (6 files)

Split current `library-usage.md` into focused pages:

1. **quick-start.md** -- Installation, zero-config, Zod schemas, explicit init, multi-provider setup. Pure TypeScript, no ThinkLang syntax.
2. **core-functions.md** -- think(), infer(), reason() with full examples, options tables, behavior notes.
3. **agents-tools.md** -- defineTool(), agent(), built-in tools, observability hooks, agent options.
4. **big-data.md** -- batch(), mapThink(), reduceThink(), Dataset, chunkText/chunkArray, streamThink/streamInfer.
5. **providers.md** -- Provider system, all 4 providers, custom providers (ModelProvider interface), registerProvider(), auto-detection. Merged content from guide/providers.md + library-usage.md.
6. **error-handling.md** -- All error types, JS/TS catch patterns, retry patterns.

### Phase 6: Fix docs/reference/cli.md

- Replace all `npx tsx src/cli/index.ts` with `thinklang`
- Update Environment Variables to list all 4 provider env vars
- Ensure multi-provider reality is reflected

### Phase 7: docs/examples/index.md (expand)

- Add "Library Examples (JS/TS)" section with the 10 `examples/js/` files
- Add brief code snippets for the most interesting library examples
- Keep existing ThinkLang examples section

### Phase 8: Guide pages -- add library equivalents

For each guide page that currently only shows ThinkLang syntax, add a brief "Using from JS/TS" or "Library equivalent" section:
- `ai-primitives.md` -- show think/infer/reason library calls
- `context.md` -- show context option in think() calls
- `confidence.md` -- show Confident<T> class usage from JS/TS
- `guards.md` -- show guards option in think()/agent() calls
- `match.md` -- note that match is a language feature, show JS switch/if equivalent
- `error-handling.md` -- show JS try/catch with ThinkLang error classes

### Phase 9: docs/guide/language-tour.md (refresh)

- Add brief library equivalent notes/links for applicable features
- Ensure it serves as a complete overview linking to both language and library docs

---

## Files Changed

### New files (6):
- `docs/library/quick-start.md`
- `docs/library/core-functions.md`
- `docs/library/agents-tools.md`
- `docs/library/big-data.md`
- `docs/library/providers.md`
- `docs/library/error-handling.md`

### Rewritten files (4):
- `README.md`
- `docs/index.md`
- `docs/guide/getting-started.md`
- `docs/.vitepress/config.ts`

### Updated files (8):
- `docs/guide/language-tour.md` -- add library links
- `docs/guide/ai-primitives.md` -- add library equivalents
- `docs/guide/context.md` -- add library equivalents
- `docs/guide/confidence.md` -- add library equivalents
- `docs/guide/guards.md` -- add library equivalents
- `docs/guide/match.md` -- add library equivalents
- `docs/guide/error-handling.md` -- add library equivalents
- `docs/reference/cli.md` -- fix dev commands, add multi-provider env vars
- `docs/examples/index.md` -- add JS/TS examples section

### Removed files (2):
- `docs/guide/library-usage.md` -- content split into `docs/library/` pages
- `docs/guide/providers.md` -- moved/merged into `docs/library/providers.md`
