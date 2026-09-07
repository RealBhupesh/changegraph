import type { InputDomainSchema, Json } from './types.js';

export function generateInputCases(
  domain: InputDomainSchema,
  options?: { maxCases?: number; seed?: number },
): Record<string, Json>[] {
  const maxCases = options?.maxCases ?? 100;
  const cases: Record<string, Json>[] = [];

  const fieldNames = Object.keys(domain.fields);
  if (fieldNames.length === 0) return cases;

  function generateFieldValues(fieldName: string): Json[] {
    const field = domain.fields[fieldName];
    switch (field.type) {
      case 'enum':
        return field.values ?? [];
      case 'boolean':
        return [true, false];
      case 'string':
        return ['', 'test'];
      case 'integer': {
        const values: number[] = [];
        const min = field.min ?? 0;
        const max = field.max ?? min + 100;
        const step = field.step ?? 1;
        for (let v = min; v <= max && values.length < 20; v += step) {
          values.push(v);
        }
        if (min !== undefined) values.unshift(min);
        if (max !== undefined && !values.includes(max)) values.push(max);
        if (min === 0) values.unshift(0);
        return [...new Set(values)];
      }
      default:
        return [];
    }
  }

  const fieldValues: Record<string, Json[]> = {};
  for (const name of fieldNames) {
    fieldValues[name] = generateFieldValues(name);
  }

  function cartesian(index: number, current: Record<string, Json>): void {
    if (cases.length >= maxCases) return;
    if (index === fieldNames.length) {
      cases.push({ ...current });
      return;
    }
    const name = fieldNames[index];
    for (const value of fieldValues[name]) {
      current[name] = value;
      cartesian(index + 1, current);
      if (cases.length >= maxCases) return;
    }
  }

  cartesian(0, {});
  return cases;
}

export function validateInput(
  input: Record<string, Json>,
  domain: InputDomainSchema,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!(key in domain.fields)) {
      if (!domain.additionalProperties) {
        errors.push(`Unknown field: ${key}`);
      }
    }
  }

  for (const [name, field] of Object.entries(domain.fields)) {
    const value = input[name];
    if (value === undefined) {
      errors.push(`Missing required field: ${name}`);
      continue;
    }

    switch (field.type) {
      case 'integer':
        if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
          errors.push(`Field ${name} must be a safe integer`);
        } else {
          if (field.min !== undefined && value < field.min) {
            errors.push(`Field ${name} below minimum ${field.min}`);
          }
          if (field.max !== undefined && value > field.max) {
            errors.push(`Field ${name} above maximum ${field.max}`);
          }
          if (field.step !== undefined && field.min !== undefined) {
            if ((value - field.min) % field.step !== 0) {
              errors.push(`Field ${name} not aligned to step ${field.step}`);
            }
          }
        }
        break;
      case 'enum':
        if (typeof value !== 'string' || !field.values?.includes(value)) {
          errors.push(`Field ${name} must be one of: ${field.values?.join(', ')}`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Field ${name} must be a boolean`);
        }
        break;
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Field ${name} must be a string`);
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

export function hasNonemptyApplicableDomain(
  domain: InputDomainSchema,
  whenGuard?: (input: Record<string, Json>) => boolean,
): boolean {
  const cases = generateInputCases(domain, { maxCases: 50 });
  if (whenGuard) {
    return cases.some((c) => whenGuard(c));
  }
  return cases.length > 0;
}
