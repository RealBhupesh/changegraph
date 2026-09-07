import YAML from 'yaml';
import type {
  ContractDefinition,
  ContractValidationResult,
  Digest,
  Json,
  Operand,
  Predicate,
  EvaluationContext,
  PredicateEvaluationResult,
} from './types.js';
import { contractSchema, MAX_YAML_SIZE } from './schema.js';
import { computeDigest } from './digest.js';

export function parseContractYaml(content: string): ContractValidationResult {
  if (content.length > MAX_YAML_SIZE) {
    return { valid: false, errors: [`Contract exceeds maximum size of ${MAX_YAML_SIZE} bytes`] };
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(content, {
      maxAliasCount: 0,
      prettyErrors: true,
    });
  } catch (err) {
    return { valid: false, errors: [`YAML parse error: ${(err as Error).message}`] };
  }

  const result = contractSchema.safeParse(parsed);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }

  const contract = result.data as ContractDefinition;
  const errors = validateContractSemantics(contract);
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const definitionDigest = computeDigest(contract) as Digest;
  return { valid: true, errors: [], contract, definitionDigest };
}

export function validateContractSemantics(contract: ContractDefinition): string[] {
  const errors: string[] = [];
  const obligationIds = new Set<string>();
  const observableIds = new Set(contract.observables.map((o) => o.id));

  for (const obligation of contract.obligations) {
    if (obligationIds.has(obligation.id)) {
      errors.push(`Duplicate obligation ID: ${obligation.id}`);
    }
    obligationIds.add(obligation.id);

    if (!observableIds.has(obligation.observableId)) {
      errors.push(`Obligation ${obligation.id} references missing observable: ${obligation.observableId}`);
    }

    const observable = contract.observables.find((o) => o.id === obligation.observableId);
    if (observable && observable.subjectId !== obligation.subjectId) {
      errors.push(
        `Obligation ${obligation.id} subjectId does not match observable subjectId`,
      );
    }
  }

  for (const field of Object.values(contract.inputDomain.fields)) {
    if (field.type === 'enum' && (!field.values || field.values.length === 0)) {
      errors.push('Enum field must have at least one value');
    }
    if (field.type === 'integer') {
      if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
        errors.push('Integer field min cannot exceed max');
      }
    }
  }

  return errors;
}

function resolveOperand(operand: Operand, ctx: EvaluationContext): Json {
  if ('literal' in operand) {
    return operand.literal;
  }
  if ('source' in operand) {
    const source = ctx[operand.source];
    if (!source) {
      throw new Error(`Missing ${operand.source} observation for path ${operand.path.join('.')}`);
    }
    let value: Json = source;
    for (const key of operand.path) {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`Cannot access path ${operand.path.join('.')} on ${operand.source}`);
      }
      value = (value as Record<string, Json>)[key];
      if (value === undefined) {
        throw new Error(`Missing path ${operand.path.join('.')} in ${operand.source}`);
      }
    }
    return value;
  }
  if ('op' in operand) {
    const [left, right] = operand.args.map((arg) => resolveOperand(arg, ctx));
    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new Error(`Arithmetic operands must be numbers for ${operand.op}`);
    }
    if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
      throw new Error('Arithmetic operands must be safe integers');
    }
    switch (operand.op) {
      case 'add':
        return left + right;
      case 'sub':
        return left - right;
      case 'mul':
        return left * right;
      default:
        throw new Error(`Unknown arithmetic operator: ${operand.op}`);
    }
  }
  throw new Error('Invalid operand');
}

function compareValues(left: Json, right: Json, op: string): boolean {
  if (op === 'eq') {
    return left === right;
  }
  if (op === 'ne') {
    return left !== right;
  }
  if (typeof left !== 'number' || typeof right !== 'number') {
    throw new Error(`Ordering comparison requires numeric operands for ${op}`);
  }
  switch (op) {
    case 'lt':
      return left < right;
    case 'lte':
      return left <= right;
    case 'gt':
      return left > right;
    case 'gte':
      return left >= right;
    default:
      throw new Error(`Unknown comparison operator: ${op}`);
  }
}

export function evaluatePredicate(
  predicate: Predicate,
  ctx: EvaluationContext,
): PredicateEvaluationResult {
  try {
    if (predicate.op === 'and') {
      const satisfied = predicate.args.every((p) => evaluatePredicate(p, ctx).satisfied);
      return { satisfied };
    }
    if (predicate.op === 'or') {
      const satisfied = predicate.args.some((p) => evaluatePredicate(p, ctx).satisfied);
      return { satisfied };
    }
    if (predicate.op === 'not') {
      const inner = evaluatePredicate(predicate.arg, ctx);
      return { satisfied: !inner.satisfied };
    }
    const [left, right] = predicate.args as [Operand, Operand];
    const leftVal = resolveOperand(left, ctx);
    const rightVal = resolveOperand(right, ctx);
    const satisfied = compareValues(leftVal, rightVal, predicate.op);
    return { satisfied };
  } catch (err) {
    return { satisfied: false, error: (err as Error).message };
  }
}

export function evaluateWhenGuard(
  when: Predicate | undefined,
  input: Record<string, Json>,
): boolean {
  if (!when) return true;
  const result = evaluatePredicate(when, { input });
  return result.satisfied;
}
