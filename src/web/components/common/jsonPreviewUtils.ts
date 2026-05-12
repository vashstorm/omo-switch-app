/**
 * Utility functions for JSON preview filtering and manipulation
 */

export interface FilterResult {
  data: unknown;
  matchCount: number;
  hasMatches: boolean;
}

/**
 * Check if a value is a plain object (not array, not null)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is an array
 */
function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Recursively search for matches in JSON data
 * Returns filtered data containing only matching paths and their ancestors
 */
export function filterJsonPreviewData(data: unknown, query: string): FilterResult {
  if (!query.trim()) {
    return { data, matchCount: 0, hasMatches: true };
  }

  const lowerQuery = query.toLowerCase();
  let matchCount = 0;

  function search(value: unknown, path: string): { value: unknown; matched: boolean } {
    // Check if primitive value matches
    const valueStr = String(value).toLowerCase();
    const valueMatches = valueStr.includes(lowerQuery);

    if (isPlainObject(value)) {
      const result: Record<string, unknown> = {};
      let hasChildMatch = false;

      for (const [key, val] of Object.entries(value)) {
        const keyMatches = key.toLowerCase().includes(lowerQuery);
        const childResult = search(val, `${path}.${key}`);

        if (keyMatches || childResult.matched) {
          result[key] = childResult.value;
          hasChildMatch = true;
          if (keyMatches) matchCount++;
        }
      }

      // If this object has matches, include it
      if (hasChildMatch || valueMatches) {
        if (valueMatches) matchCount++;
        return { value: result, matched: true };
      }

      return { value: undefined, matched: false };
    }

    if (isArray(value)) {
      const result: unknown[] = [];
      let hasChildMatch = false;

      for (let i = 0; i < value.length; i++) {
        const childResult = search(value[i], `${path}[${i}]`);
        if (childResult.matched) {
          result.push(childResult.value);
          hasChildMatch = true;
        }
      }

      if (hasChildMatch || valueMatches) {
        if (valueMatches) matchCount++;
        return { value: result, matched: true };
      }

      return { value: undefined, matched: false };
    }

    // Primitive value
    if (valueMatches) {
      matchCount++;
      return { value, matched: true };
    }

    return { value: undefined, matched: false };
  }

  const result = search(data, "");

  return {
    data: result.matched ? result.value : {},
    matchCount,
    hasMatches: result.matched,
  };
}

/**
 * Count total matches in JSON data without filtering
 */
export function countJsonPreviewMatches(data: unknown, query: string): number {
  if (!query.trim()) return 0;

  const lowerQuery = query.toLowerCase();
  let count = 0;

  function countMatches(value: unknown): void {
    const valueStr = String(value).toLowerCase();

    if (valueStr.includes(lowerQuery)) {
      count++;
    }

    if (isPlainObject(value)) {
      for (const [key, val] of Object.entries(value)) {
        if (key.toLowerCase().includes(lowerQuery)) {
          count++;
        }
        countMatches(val);
      }
    } else if (isArray(value)) {
      for (const item of value) {
        countMatches(item);
      }
    }
  }

  countMatches(data);
  return count;
}

/**
 * Check if JSON data has any matches for the query
 */
export function hasJsonPreviewMatches(data: unknown, query: string): boolean {
  if (!query.trim()) return true;

  const lowerQuery = query.toLowerCase();

  function search(value: unknown): boolean {
    const valueStr = String(value).toLowerCase();
    if (valueStr.includes(lowerQuery)) return true;

    if (isPlainObject(value)) {
      for (const [key, val] of Object.entries(value)) {
        if (key.toLowerCase().includes(lowerQuery)) return true;
        if (search(val)) return true;
      }
    } else if (isArray(value)) {
      for (const item of value) {
        if (search(item)) return true;
      }
    }

    return false;
  }

  return search(data);
}

/**
 * Stringify JSON data with proper formatting
 */
export function stringifyJsonPreviewData(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Render JSON with line numbers
 * Returns array of { lineNumber, content } for each line
 */
export function renderJsonWithLineNumbers(data: unknown): Array<{ lineNumber: number; content: string }> {
  const jsonString = stringifyJsonPreviewData(data);
  const lines = jsonString.split("\n");

  return lines.map((content, index) => ({
    lineNumber: index + 1,
    content,
  }));
}
