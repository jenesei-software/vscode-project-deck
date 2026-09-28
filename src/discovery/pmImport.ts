import { readTextFile } from "../util/fs";

export interface ImportedProject {
  name: string;
  rootPath: string;
  tags: string[];
}

export function mapProjectManagerProjects(input: unknown): ImportedProject[] {
  if (!isRecord(input)) {
    return [];
  }
  const source = isRecord(input.projects) ? input.projects : input;
  const result: ImportedProject[] = [];

  for (const value of Object.values(source)) {
    if (!isRecord(value)) {
      continue;
    }
    const rootPath = typeof value.rootPath === "string" ? value.rootPath : "";
    if (!rootPath) {
      continue;
    }
    const name =
      typeof value.name === "string" && value.name ? value.name : rootPath;
    const tags = Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : [];
    result.push({ name, rootPath, tags });
  }

  return result;
}

export async function readProjectManagerProjects(
  file: string,
): Promise<ImportedProject[]> {
  const text = await readTextFile(file);
  if (!text) {
    return [];
  }
  try {
    return mapProjectManagerProjects(JSON.parse(text));
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
