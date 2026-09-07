import type { Predicate, EvidenceState } from '@changegraph/semantic-contract';

export type IRExpr =
  | { kind: 'int'; value: number }
  | { kind: 'bool'; value: boolean }
  | { kind: 'var'; name: string }
  | { kind: 'binop'; op: 'add' | 'sub' | 'mul' | 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'; left: IRExpr; right: IRExpr }
  | { kind: 'not'; arg: IRExpr }
  | { kind: 'and'; args: IRExpr[] }
  | { kind: 'or'; args: IRExpr[] };

export interface SymbolicResult {
  state: EvidenceState;
  solverStatus: 'sat' | 'unsat' | 'unknown' | 'unsupported';
  countermodel?: Record<string, number | boolean>;
  reasonCode?: string;
  proofReceiptDigest?: string;
}

export interface SolverConfig {
  z3Path?: string;
  z3Version?: string;
  timeoutMs: number;
}

export function isSupportedSubset(predicate: Predicate): { supported: boolean; reason?: string } {
  return validatePredicateSubset(predicate);
}

function validatePredicateSubset(predicate: Predicate): { supported: boolean; reason?: string } {
  if (predicate.op === 'and' || predicate.op === 'or') {
    for (const arg of predicate.args) {
      const result = validatePredicateSubset(arg);
      if (!result.supported) return result;
    }
    return { supported: true };
  }
  if (predicate.op === 'not') {
    return validatePredicateSubset(predicate.arg);
  }
  return { supported: true };
}

export function interpretIR(expr: IRExpr, env: Record<string, number | boolean>): number | boolean {
  switch (expr.kind) {
    case 'int':
      return expr.value;
    case 'bool':
      return expr.value;
    case 'var': {
      const val = env[expr.name];
      if (val === undefined) throw new Error(`Unbound variable: ${expr.name}`);
      return val;
    }
    case 'not':
      return !interpretIR(expr.arg, env);
    case 'and':
      return expr.args.every((a) => interpretIR(a, env) === true);
    case 'or':
      return expr.args.some((a) => interpretIR(a, env) === true);
    case 'binop': {
      const left = interpretIR(expr.left, env);
      const right = interpretIR(expr.right, env);
      switch (expr.op) {
        case 'add':
          return (left as number) + (right as number);
        case 'sub':
          return (left as number) - (right as number);
        case 'mul':
          return (left as number) * (right as number);
        case 'eq':
          return left === right;
        case 'ne':
          return left !== right;
        case 'lt':
          return (left as number) < (right as number);
        case 'lte':
          return (left as number) <= (right as number);
        case 'gt':
          return (left as number) > (right as number);
        case 'gte':
          return (left as number) >= (right as number);
        default:
          throw new Error(`Unknown binop: ${expr.op}`);
      }
    }
    default:
      throw new Error('Unknown IR expression');
  }
}

export async function runSymbolicVerification(
  predicate: Predicate,
  _domain: Record<string, { min?: number; max?: number; values?: string[] }>,
  config: SolverConfig,
): Promise<SymbolicResult> {
  const support = isSupportedSubset(predicate);
  if (!support.supported) {
    return {
      state: 'unsupported',
      solverStatus: 'unsupported',
      reasonCode: support.reason ?? 'predicate-not-in-supported-subset',
    };
  }

  if (!config.z3Path) {
    return {
      state: 'unsupported',
      solverStatus: 'unsupported',
      reasonCode: 'solver-not-configured',
    };
  }

  return {
    state: 'unknown',
    solverStatus: 'unknown',
    reasonCode: 'solver-execution-not-available-in-local-dev',
  };
}

export function differentialTestIR(
  ir: IRExpr,
  jsFn: (env: Record<string, number | boolean>) => number | boolean,
  testCases: Record<string, number | boolean>[],
): { passed: number; failed: number; mismatches: string[] } {
  let passed = 0;
  let failed = 0;
  const mismatches: string[] = [];

  for (const env of testCases) {
    try {
      const irResult = interpretIR(ir, env);
      const jsResult = jsFn(env);
      if (irResult === jsResult) {
        passed++;
      } else {
        failed++;
        mismatches.push(`IR=${irResult} JS=${jsResult} for ${JSON.stringify(env)}`);
      }
    } catch (err) {
      failed++;
      mismatches.push(`Error for ${JSON.stringify(env)}: ${(err as Error).message}`);
    }
  }

  return { passed, failed, mismatches };
}
