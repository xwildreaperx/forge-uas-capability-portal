export function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${field} is required.`);
  return value.trim();
}

export function completionValue(value: unknown) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 100)
    throw new Error('Completion must be an integer from 0 to 100.');
  return number;
}

export function validUrl(value: unknown) {
  const url = requiredString(value, 'URL');
  try {
    return new URL(url).toString();
  } catch {
    throw new Error('URL must be valid.');
  }
}

export function integerIds(value: unknown, field: string) {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.some((id) => !Number.isInteger(Number(id)))
  )
    throw new Error(`${field} must contain at least one valid ID.`);
  return [...new Set(value.map(Number))];
}
