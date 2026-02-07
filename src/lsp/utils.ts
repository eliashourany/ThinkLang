import type { Location } from "../ast/nodes.js";
import { Position, Range } from "vscode-languageserver";

// AST Location is 1-based line/column. LSP Position is 0-based line, 0-based character.

export function astLocationToRange(loc: Location): Range {
  return {
    start: { line: loc.start.line - 1, character: loc.start.column - 1 },
    end: { line: loc.end.line - 1, character: loc.end.column - 1 },
  };
}

export function positionInRange(pos: Position, range: Range): boolean {
  if (pos.line < range.start.line || pos.line > range.end.line) return false;
  if (pos.line === range.start.line && pos.character < range.start.character) return false;
  if (pos.line === range.end.line && pos.character > range.end.character) return false;
  return true;
}

export function positionInLocation(pos: Position, loc: Location | undefined): boolean {
  if (!loc) return false;
  return positionInRange(pos, astLocationToRange(loc));
}
