import * as path from "node:path";

export function expandHome(input: string, home: string): string {
  const value = input.trim();
  if (value === "~") {
    return home;
  }
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.join(home, value.slice(2));
  }
  return value;
}

export function normalize(input: string): string {
  const trimmed = input.replace(/[\\/]+$/, "");
  return path.normalize(trimmed || input);
}

export function pathKey(input: string): string {
  const resolved = normalize(path.resolve(input));
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function isSubPath(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

export function baseName(input: string): string {
  return path.basename(input);
}

export function parentDir(input: string): string {
  return path.dirname(input);
}

export function relativeSegments(from: string, to: string): string[] {
  return path
    .relative(from, to)
    .split(/[\\/]+/)
    .filter(Boolean);
}

export function joinPath(...parts: string[]): string {
  return path.join(...parts);
}
