# Changelog

All notable changes to ThinkLang will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2025-06-01

### Added

- `think`, `infer`, and `reason` AI primitives as first-class keywords
- Structured type system with `@description` annotations and JSON schema compilation
- `Confident<T>` wrapper with `.unwrap()`, `.expect(threshold)`, and `.or(fallback)`
- Guards with declarative constraints (`length`, `contains_none`, etc.) and automatic retry
- `match` expression for pattern matching on AI-generated data
- Pipeline operator `|>` for chaining AI operations
- Context management with `with context:` and `without context:`
- Typed error hierarchy (`SchemaViolation`, `ConfidenceTooLow`, `GuardFailed`, etc.) with `try`/`catch`
- Module system with `import` for types and functions across `.tl` files
- CLI with `run`, `compile`, `repl`, `test`, and `cost-report` commands
- Built-in testing framework with value assertions, semantic assertions, and deterministic replay via snapshots
- Cost tracking for token usage and estimated cost per AI call
- Response caching for AI calls
- VS Code extension with syntax highlighting, snippets, and LSP integration
- Language Server Protocol support: diagnostics, hover, completion, go-to-definition, document symbols, signature help
- VitePress documentation site
- 17 example programs
