/**
 * A very small validation toolkit.
 *
 * Deliberately dependency-free — the stack in CLAUDE.md §3 does not name a
 * validation library, and adding one needs a decision first. The surface is
 * intentionally schema-object shaped so it can be swapped for a library later
 * without touching call sites: everything goes through `validate(schema, input)`.
 */

export type Issue = { path: string; message: string };

export type ValidationSuccess<T> = { ok: true; value: T };
export type ValidationFailure = { ok: false; issues: Issue[] };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export type Validator<T> = {
  /** Reads `input`, pushes any problems onto `issues`, returns the coerced value. */
  run: (input: unknown, path: string, issues: Issue[]) => T;
  /** When true the key may be absent from the parent object. */
  isOptional?: boolean;
};

const MISSING = Symbol('missing');

function fail(issues: Issue[], path: string, message: string): void {
  issues.push({ path, message });
}

/** Runs a schema over an input value and collects every problem, not just the first. */
export function validate<T>(schema: Validator<T>, input: unknown): ValidationResult<T> {
  const issues: Issue[] = [];
  const value = schema.run(input, '', issues);
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value };
}

/** Turns issues into the `details` payload of a VALIDATION_FAILED error response. */
export function issuesToDetails(issues: Issue[]): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path === '' ? '_' : issue.path;
    const bucket = details[key];
    if (bucket) bucket.push(issue.message);
    else details[key] = [issue.message];
  }
  return details;
}

// --- primitives -------------------------------------------------------------

export type StringOptions = {
  min?: number;
  max?: number;
  pattern?: RegExp;
  trim?: boolean;
  /** Allow the empty string through even when `min` would reject it. */
  allowEmpty?: boolean;
};

export function string(options: StringOptions = {}): Validator<string> {
  const { min, max, pattern, trim = true, allowEmpty = false } = options;
  return {
    run(input, path, issues) {
      if (typeof input !== 'string') {
        fail(issues, path, 'must be a string');
        return '';
      }
      const value = trim ? input.trim() : input;
      if (value === '' && allowEmpty) return value;
      if (min !== undefined && value.length < min) {
        fail(issues, path, `must be at least ${min} character(s)`);
      }
      if (max !== undefined && value.length > max) {
        fail(issues, path, `must be at most ${max} character(s)`);
      }
      if (pattern && !pattern.test(value)) {
        fail(issues, path, 'is not in the expected format');
      }
      return value;
    },
  };
}

export type NumberOptions = { min?: number; max?: number; integer?: boolean };

export function number(options: NumberOptions = {}): Validator<number> {
  const { min, max, integer = false } = options;
  return {
    run(input, path, issues) {
      const value = typeof input === 'string' && input.trim() !== '' ? Number(input) : input;
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        fail(issues, path, 'must be a number');
        return 0;
      }
      if (integer && !Number.isInteger(value)) fail(issues, path, 'must be a whole number');
      if (min !== undefined && value < min) fail(issues, path, `must be at least ${min}`);
      if (max !== undefined && value > max) fail(issues, path, `must be at most ${max}`);
      return value;
    },
  };
}

export function boolean(): Validator<boolean> {
  return {
    run(input, path, issues) {
      if (typeof input === 'boolean') return input;
      if (input === 'true') return true;
      if (input === 'false') return false;
      fail(issues, path, 'must be true or false');
      return false;
    },
  };
}

/** ISO-8601 date or datetime string, coerced to a Date. */
export function isoDate(): Validator<Date> {
  return {
    run(input, path, issues) {
      if (input instanceof Date && !Number.isNaN(input.getTime())) return input;
      if (typeof input === 'string') {
        const parsed = new Date(input);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      fail(issues, path, 'must be an ISO-8601 date');
      return new Date(0);
    },
  };
}

/** A 24-character hex Mongo ObjectId, kept as a string at the edge. */
export function objectId(): Validator<string> {
  return string({ pattern: /^[a-f0-9]{24}$/i, min: 24, max: 24 });
}

export function url(): Validator<string> {
  return {
    run(input, path, issues) {
      if (typeof input !== 'string') {
        fail(issues, path, 'must be a URL');
        return '';
      }
      const value = input.trim();
      try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          fail(issues, path, 'must be an http(s) URL');
        }
      } catch {
        fail(issues, path, 'must be a valid URL');
      }
      return value;
    },
  };
}

/** Lowercase kebab-case slug, e.g. "holoxr-web". */
export function slug(): Validator<string> {
  return string({ min: 1, max: 80, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ });
}

export function enumOf<T extends string>(values: readonly T[]): Validator<T> {
  return {
    run(input, path, issues) {
      if (typeof input === 'string' && (values as readonly string[]).includes(input)) {
        return input as T;
      }
      fail(issues, path, `must be one of: ${values.join(', ')}`);
      return values[0] as T;
    },
  };
}

// --- combinators ------------------------------------------------------------

/**
 * A query parameter that may be absent, given once, or repeated. Express hands
 * back a bare string for one value and an array for several; both mean the same
 * thing, so both become a list. Values within one parameter are an OR.
 */
export function repeatable<T>(item: Validator<T>): Validator<T[]> {
  return {
    isOptional: true,
    run(input, path, issues) {
      if (input === undefined || input === '') return [];
      const entries = Array.isArray(input) ? input : [input];
      return entries
        .filter((entry) => entry !== '')
        .map((entry) => item.run(entry, path, issues));
    },
  };
}

export function arrayOf<T>(item: Validator<T>, options: { max?: number } = {}): Validator<T[]> {
  return {
    run(input, path, issues) {
      if (!Array.isArray(input)) {
        fail(issues, path, 'must be an array');
        return [];
      }
      if (options.max !== undefined && input.length > options.max) {
        fail(issues, path, `must have at most ${options.max} item(s)`);
      }
      return input.map((entry, index) => item.run(entry, `${path}[${index}]`, issues));
    },
  };
}

export function nullable<T>(inner: Validator<T>): Validator<T | null> {
  return {
    isOptional: inner.isOptional,
    run(input, path, issues) {
      if (input === null) return null;
      return inner.run(input, path, issues);
    },
  };
}

export function optional<T>(inner: Validator<T>): Validator<T | undefined> {
  return {
    isOptional: true,
    run(input, path, issues) {
      if (input === undefined) return undefined;
      return inner.run(input, path, issues);
    },
  };
}

/**
 * Adds checks that need more than one field in view — "these slugs must not
 * repeat", "this field is required only when that one is set".
 *
 * The rules run only when the inner validator found nothing wrong, so a rule is
 * never handed a half-parsed value to reason about. `fail` takes a path so a
 * message lands on the field a person has to go and fix, rather than on the
 * object as a whole.
 */
export function withRules<T>(
  inner: Validator<T>,
  rules: (value: T, path: string, fail: (path: string, message: string) => void) => void,
): Validator<T> {
  return {
    isOptional: inner.isOptional,
    run(input, path, issues) {
      const before = issues.length;
      const value = inner.run(input, path, issues);

      if (issues.length === before) {
        rules(value, path, (childPath, message) => fail(issues, childPath, message));
      }

      return value;
    },
  };
}

export function withDefault<T>(inner: Validator<T>, fallback: T): Validator<T> {
  return {
    isOptional: true,
    run(input, path, issues) {
      if (input === undefined) return fallback;
      return inner.run(input, path, issues);
    },
  };
}

/** An open key/value map — used for `projects.details`, validated separately against fieldDefs. */
/**
 * Accepts whatever it is given. Used where a value's type depends on another
 * field — a `showIf.equals` is a string, a number or a boolean depending on the
 * field it points at.
 */
export function anyValue(): Validator<unknown> {
  return {
    run(input) {
      return input;
    },
  };
}

export function passthroughRecord(): Validator<Record<string, unknown>> {
  return {
    run(input, path, issues) {
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        fail(issues, path, 'must be an object');
        return {};
      }
      return { ...(input as Record<string, unknown>) };
    },
  };
}

export type Shape = Record<string, Validator<unknown>>;

export type Infer<S extends Shape> = {
  [K in keyof S]: S[K] extends Validator<infer T> ? T : never;
};

/**
 * Validates an object. Unknown keys are dropped rather than rejected, so a
 * client sending extra fields cannot write them into a document.
 */
export function object<S extends Shape>(shape: S): Validator<Infer<S>> {
  return {
    run(input, path, issues) {
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        fail(issues, path, 'must be an object');
        return {} as Infer<S>;
      }
      const source = input as Record<string, unknown>;
      const output: Record<string, unknown> = {};
      for (const [key, validator] of Object.entries(shape)) {
        const childPath = path === '' ? key : `${path}.${key}`;
        const raw = Object.prototype.hasOwnProperty.call(source, key) ? source[key] : MISSING;
        if (raw === MISSING) {
          if (validator.isOptional) {
            const filled = validator.run(undefined, childPath, issues);
            if (filled !== undefined) output[key] = filled;
            continue;
          }
          fail(issues, childPath, 'is required');
          continue;
        }
        output[key] = validator.run(raw, childPath, issues);
      }
      return output as Infer<S>;
    },
  };
}

/**
 * Property names that suggest someone is trying to store a secret value.
 * Matched loosely, because the point is to catch the attempt however it is
 * spelled — `apiKey`, `api_key`, `connectionString` and `pwd` all count.
 */
const SECRET_NAME = /(secret|password|passwd|pwd|token|api[-_]?key|access[-_]?key|private[-_]?key|connection[-_]?string|credential|^key$|^value$)/i;

export const SECRET_FIELD_MESSAGE =
  'This collection records where a credential lives, never the credential itself. Remove this field.';

export function looksLikeSecretField(name: string): boolean {
  return SECRET_NAME.test(name);
}

function rejectUnknownKeys(shape: Shape, input: unknown, path: string, issues: Issue[]): void {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return;

  for (const key of Object.keys(input as Record<string, unknown>)) {
    if (Object.prototype.hasOwnProperty.call(shape, key)) continue;

    const childPath = path === '' ? key : `${path}.${key}`;
    fail(
      issues,
      childPath,
      looksLikeSecretField(key) ? SECRET_FIELD_MESSAGE : 'is not a field on this record',
    );
  }
}

/**
 * `object`, but an unknown property is an error rather than something quietly
 * dropped. Used where silently accepting a field you did not store would be
 * worse than refusing the request — `credentials` above all, where a dropped
 * `value` key would look to the caller like their secret had been saved.
 */
export function strictObject<S extends Shape>(shape: S): Validator<Infer<S>> {
  const inner = object(shape);

  return {
    run(input, path, issues) {
      rejectUnknownKeys(shape, input, path, issues);
      return inner.run(input, path, issues);
    },
  };
}

/** The PATCH counterpart of `strictObject`. */
export function strictPartial<S extends Shape>(shape: S): Validator<Partial<Infer<S>>> {
  const inner = partial(shape);

  return {
    run(input, path, issues) {
      rejectUnknownKeys(shape, input, path, issues);
      return inner.run(input, path, issues);
    },
  };
}

/**
 * Turns a create schema into its PATCH counterpart: every key optional, but at
 * least one must be present so an empty body is rejected rather than silently
 * doing nothing.
 */
export function partial<S extends Shape>(shape: S): Validator<Partial<Infer<S>>> {
  const optionalShape: Shape = {};
  for (const [key, validator] of Object.entries(shape)) {
    optionalShape[key] = validator.isOptional ? validator : optional(validator);
  }
  const inner = object(optionalShape);
  return {
    run(input, path, issues) {
      const before = issues.length;
      const value = inner.run(input, path, issues) as Partial<Infer<S>>;
      if (issues.length === before && Object.keys(value).length === 0) {
        fail(issues, path, 'must contain at least one field to update');
      }
      return value;
    },
  };
}
