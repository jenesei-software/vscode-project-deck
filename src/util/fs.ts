import { promises as fs } from "node:fs";

const DEFAULT_LIMIT = 4 * 1024 * 1024;

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(target: string): Promise<boolean> {
  try {
    const stats = await fs.stat(target);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function readTextFile(
  target: string,
  limit = DEFAULT_LIMIT,
): Promise<string | null> {
  try {
    const stats = await fs.stat(target);
    if (!stats.isFile() || stats.size > limit) {
      return null;
    }
    return await fs.readFile(target, "utf8");
  } catch {
    return null;
  }
}

export async function writeTextFileAtomic(
  target: string,
  data: string,
): Promise<void> {
  const temp = `${target}.tmp-${process.pid}`;
  await fs.writeFile(temp, data, "utf8");
  await fs.rename(temp, target);
}
