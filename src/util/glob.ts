const MAGIC = /[*?[{]/;

export function hasMagic(pattern: string): boolean {
  return MAGIC.test(pattern);
}

export function globToRegExp(
  pattern: string,
  caseInsensitive = process.platform === "win32",
): RegExp {
  let out = "";
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        index++;
        const next = pattern[index + 1];
        if (next === "/" || next === "\\") {
          index++;
          out += "(?:.*[\\\\/])?";
        } else {
          out += ".*";
        }
      } else {
        out += "[^\\\\/]*";
      }
    } else if (char === "?") {
      out += "[^\\\\/]";
    } else if (char === "/" || char === "\\") {
      out += "[\\\\/]";
    } else if ("\\^$.|+()[]{}".includes(char)) {
      out += `\\${char}`;
    } else {
      out += char;
    }
  }
  return new RegExp(`^${out}$`, caseInsensitive ? "i" : "");
}

export function isIgnored(name: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => {
    const value = pattern.trim();
    if (!value) {
      return false;
    }
    return hasMagic(value) ? globToRegExp(value).test(name) : value === name;
  });
}
