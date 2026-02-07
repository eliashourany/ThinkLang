# Contributing to ThinkLang

Thanks for your interest in contributing to ThinkLang! This guide will help you get started.

## Setup

```bash
git clone https://github.com/eliashourany/ThinkLang.git
cd ThinkLang
npm install        # also runs build via prepare script
```

Copy `.env.example` to `.env` and set your `ANTHROPIC_API_KEY` (required for AI features).

## Build

ThinkLang uses a two-stage build: PEG parser generation, then TypeScript compilation.

```bash
npm run build           # both stages
npm run build:parser    # regenerate PEG parser only
npm run build:ts        # TypeScript compilation only
```

You **must** run `npm run build:parser` after any change to `src/grammar/thinklang.peggy`.

## Testing

```bash
npm test              # single pass
npm run test:watch    # watch mode
```

All 13 test files should pass before submitting a PR.

## Branching Workflow

1. Fork the repository
2. Create a feature branch from `main` (`git checkout -b my-feature`)
3. Make your changes
4. Run `npm run build` and `npm test` to verify
5. Commit with a clear message
6. Push to your fork and open a pull request against `main`

## Coding Conventions

- **ESM** throughout (`"type": "module"` in package.json)
- **Strict TypeScript** (`"strict": true`, target ES2022)
- All imports use **`.js` extensions** (Node16 module resolution)
- Tests live in `tests/` using Vitest globals (`describe`, `it`, `expect` — no imports needed)

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include tests for new functionality
- Make sure `npm run build` and `npm test` pass
- Update documentation if your change affects user-facing behavior

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
