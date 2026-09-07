import { z } from 'zod';

const sourceOperandSchema = z.object({
  source: z.enum(['input', 'base', 'head']),
  path: z.array(z.string()).min(1).max(20),
});

const literalOperandSchema = z.object({
  literal: z.unknown(),
});

const operandSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    sourceOperandSchema,
    z.object({
      op: z.enum(['add', 'sub', 'mul']),
      args: z.tuple([operandSchema, operandSchema]),
    }),
    literalOperandSchema,
  ]),
);

const predicateSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.object({
      op: z.enum(['eq', 'ne', 'lt', 'lte', 'gt', 'gte']),
      args: z.tuple([operandSchema, operandSchema]),
    }),
    z.object({
      op: z.enum(['and', 'or']),
      args: z.array(predicateSchema).min(1).max(50),
    }),
    z.object({
      op: z.literal('not'),
      arg: predicateSchema,
    }),
  ]),
);

const inputFieldSchema = z.object({
  type: z.enum(['integer', 'enum', 'string', 'boolean']),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  values: z.array(z.string()).optional(),
});

export const contractSchema = z.object({
  version: z.literal(1),
  intent: z.object({
    summary: z.string().min(1).max(500),
    type: z.string().min(1).max(100),
  }),
  inputDomain: z.object({
    type: z.literal('object'),
    additionalProperties: z.literal(false),
    fields: z.record(inputFieldSchema),
  }),
  observables: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        subjectId: z.string().min(1).max(200),
        kind: z.enum(['return-value', 'http', 'state-transition', 'postgresql']),
        normalizer: z.string().min(1),
        comparator: z.string().min(1),
      }),
    )
    .min(1),
  obligations: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        kind: z.enum(['allowed-relation', 'preservation', 'property']),
        subjectId: z.string().min(1).max(200),
        observableId: z.string().min(1).max(100),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        required: z.boolean(),
        when: predicateSchema.optional(),
        assert: predicateSchema,
      }),
    )
    .min(1),
});

export const policySchema = z.object({
  version: z.literal(1),
  rules: z.object({
    blockOnRequiredFalsification: z.boolean(),
    reviewOnUnresolved: z.boolean(),
    requireApprovalForCriticalChanges: z.boolean(),
    independentReviewerRequired: z.boolean(),
  }),
});

export const MAX_YAML_DEPTH = 20;
export const MAX_YAML_SIZE = 256 * 1024;
