export function stableStringify(value: unknown): string {
  return stringifyStable(value, new WeakSet<object>());
}

export function stableHash(value: unknown): string {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stringifyStable(value: unknown, seen: WeakSet<object>): string {
  if (value === null) {
    return "null";
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return JSON.stringify(value);
  }
  if (valueType === "undefined") {
    return '"__undefined__"';
  }
  if (valueType === "bigint") {
    return `"__bigint__:${String(value)}"`;
  }
  if (valueType === "symbol" || valueType === "function") {
    return `"__${valueType}__"`;
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyStable(item, seen)).join(",")}]`;
  }

  if (valueType === "object") {
    const objectValue = value as Record<string, unknown>;
    if (seen.has(objectValue)) {
      return '"__circular__"';
    }

    seen.add(objectValue);
    const result = `{${Object.keys(objectValue)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stringifyStable(objectValue[key], seen)}`)
      .join(",")}}`;
    seen.delete(objectValue);
    return result;
  }

  return JSON.stringify(String(value));
}
