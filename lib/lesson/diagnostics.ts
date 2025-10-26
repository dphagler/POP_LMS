import type {
  AugmentationRule,
  DiagnosticLevel,
  DiagnosticResult,
  LessonObjective,
} from './contracts';

export interface AugmentationPlan {
  augmentations: Augmentation[];
  trace: string[];
}

export interface Augmentation {
  objective: LessonObjective;
  assetRef: string;
  ruleIndex: number;
  diagnostic?: DiagnosticResult;
}

const LEVEL_ORDER: Record<DiagnosticLevel, number> = {
  NOT_MET: 0,
  PARTIAL: 1,
  MET: 2,
};

type Comparator = (left: number | string, right: number | string) => boolean;

const COMPARATORS: Record<string, Comparator> = {
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '==': (a, b) => a === b,
  '===': (a, b) => a === b,
  '=': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '!==': (a, b) => a !== b,
};

interface EvaluationResult {
  result: boolean;
  detail: string;
}

const normalizeStringValue = (value: string): string =>
  value.trim().replace(/^['"]|['"]$/g, '');

const toLevelValue = (value: string): number | null => {
  const normalized = normalizeStringValue(value).toUpperCase();
  if (normalized === 'NOT_MET' || normalized === 'PARTIAL' || normalized === 'MET') {
    return LEVEL_ORDER[normalized as DiagnosticLevel];
  }
  return null;
};

const evaluateCondition = (
  condition: string,
  diagnostic?: DiagnosticResult,
): EvaluationResult => {
  const trimmed = condition.trim();
  if (!trimmed) {
    return { result: true, detail: 'empty condition treated as true' };
  }

  const match = trimmed.match(/^(level|score)\s*(<=|>=|===|==|!=|!==|=|<|>)\s*(.+)$/i);
  if (!match) {
    return {
      result: false,
      detail: `unsupported condition "${trimmed}"`,
    };
  }

  const [, field, operator, rawValue] = match;
  const comparator = COMPARATORS[operator];
  if (!comparator) {
    return {
      result: false,
      detail: `unsupported comparator "${operator}"`,
    };
  }

  if (!diagnostic) {
    return {
      result: false,
      detail: `no diagnostic available for "${field}"`,
    };
  }

  if (field.toLowerCase() === 'level') {
    const actual = diagnostic.level;
    const actualValue = LEVEL_ORDER[actual];
    const expectedValue = toLevelValue(rawValue);
    if (expectedValue === null) {
      return {
        result: false,
        detail: `unknown level value "${rawValue}"`,
      };
    }

    const comparison = comparator(actualValue, expectedValue);
    return {
      result: comparison,
      detail: `level ${actual} (${actualValue}) ${operator} ${normalizeStringValue(rawValue)} (${expectedValue}) -> ${comparison}`,
    };
  }

  if (field.toLowerCase() === 'score') {
    const actual = diagnostic.score;
    if (typeof actual !== 'number' || Number.isNaN(actual)) {
      return {
        result: false,
        detail: 'diagnostic missing numeric score',
      };
    }

    const expected = Number.parseFloat(rawValue);
    if (!Number.isFinite(expected)) {
      return {
        result: false,
        detail: `invalid score value "${rawValue}"`,
      };
    }

    const comparison = comparator(actual, expected);
    return {
      result: comparison,
      detail: `score ${actual} ${operator} ${expected} -> ${comparison}`,
    };
  }

  return {
    result: false,
    detail: `unsupported field "${field}"`,
  };
};

const evaluateWhenExpr = (
  expression: string | undefined,
  diagnostic?: DiagnosticResult,
): EvaluationResult => {
  if (!expression || !expression.trim()) {
    return { result: true, detail: 'no whenExpr specified' };
  }

  const normalized = expression
    .replace(/\s+(AND|and)\s+/g, '&&')
    .split('&&')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (normalized.length === 0) {
    return { result: true, detail: 'empty whenExpr treated as true' };
  }

  const details: string[] = [];
  for (const condition of normalized) {
    const evaluation = evaluateCondition(condition, diagnostic);
    details.push(evaluation.detail);
    if (!evaluation.result) {
      return {
        result: false,
        detail: details.join('; '),
      };
    }
  }

  return {
    result: true,
    detail: details.join('; '),
  };
};

export interface AugmentationInputs {
  objectives: LessonObjective[];
  diagnostics?: DiagnosticResult[];
  rules?: AugmentationRule[];
}

export const planAugmentations = ({
  objectives,
  diagnostics,
  rules,
}: AugmentationInputs): AugmentationPlan => {
  const objectiveMap = new Map(objectives.map((objective) => [objective.id, objective]));
  const diagnosticMap = new Map(
    (diagnostics ?? []).map((result) => [result.objectiveId, result]),
  );

  const augmentations: Augmentation[] = [];
  const trace: string[] = [];

  (rules ?? []).forEach((rule, ruleIndex) => {
    rule.targets.forEach((targetId) => {
      const objective = objectiveMap.get(targetId);
      if (!objective) {
        trace.push(
          `rule[${ruleIndex}] target[${targetId}]: skipped - objective not found`,
        );
        return;
      }

      const diagnostic = diagnosticMap.get(targetId);
      const evaluation = evaluateWhenExpr(rule.whenExpr, diagnostic);

      if (!evaluation.result) {
        trace.push(
          `rule[${ruleIndex}] target[${targetId}]: skipped - ${evaluation.detail}`,
        );
        return;
      }

      augmentations.push({
        objective,
        assetRef: rule.assetRef,
        ruleIndex,
        diagnostic,
      });

      trace.push(
        `rule[${ruleIndex}] target[${targetId}]: fired - ${evaluation.detail}`,
      );
    });
  });

  return { augmentations, trace };
};
