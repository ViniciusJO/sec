/**
 * Encodes the absence of value, an error occurrence, or a collection of values.
 *
 * Conceptually:
 *
 *   RepositoryReturn<T> ≈ Either<Error, Maybe<Array<T>>>
 *
 * It is designed to model repository / data-access results where:
 * - `none`   → no data available
 * - `failure`→ an error occurred
 * - `success`→ one or more values were retrieved
 */

// deno-lint-ignore-file no-explicit-any

import { ResultUtils, type Result } from "./Result.ts";
import { type Monad } from "./Functional.ts";

/**
 * Type guard that checks whether a value is a RepositoryReturn.
 */
export function isRR<V>(
  obj?: null | Error | V | Array<V> | RepositoryReturn<V>
): obj is RepositoryReturn<V> {
  return (
    null != obj &&
    obj &&
    typeof obj === "object" &&
    "_tag" in obj &&
    (obj._tag === "success" || obj._tag === "failure" || obj._tag === "none")
  );
}

/**
 * Extracts the inner value type from a RepositoryReturn.
 */
export type NonRR<T> = T extends RepositoryReturn<infer U> ? U : T;

/**
 * Normalizes raw values into a RepositoryReturn.
 *
 * Rules:
 * - `RepositoryReturn` → returned as-is
 * - `Error`            → failure
 * - non-empty value    → success
 * - `null` / empty     → none
 */
export function unionResolve<V>(
  obj?: null | Error | V | Array<V> | RepositoryReturn<V>
): RepositoryReturn<V> {
  return isRR(obj)
    ? obj
    : (obj || typeof obj === "number") &&
      (!Array.isArray(obj) || obj.length > 0)
    ? obj instanceof Error
      ? repositoryFailure<V>(obj)
      : repositorySuccess(obj)
    : repositoryNone<V>();
}

/**
 * Base class shared by all RepositoryReturn variants.
 */
abstract class BaseRepositoryReturn<S> {
  /** Discriminant tag */
  abstract _tag: "none" | "success" | "failure";

  /** Stored value */
  abstract value: null | Error | Array<S>;

  /** True if this represents a success */
  isSuccess(): this is RepositorySuccess<S> {
    return this._tag === "success";
  }

  /** True if this represents a failure */
  isFailure(): this is RepositoryFailure<S> {
    return this._tag === "failure";
  }

  /** True if this represents absence of value */
  isNone(): this is RepositoryNone<S> {
    return this._tag === "none";
  }

  /**
   * Converts the RepositoryReturn into a Result using only the first element.
   *
   * `none` requires a fallback value or error.
   */
  asFirstElementResult(whenNone: () => Error | S | S[]): Result<Error, S> {
    return this.asResult(whenNone).map((els: S[]) => els[0]);
  }

  /**
   * Converts the RepositoryReturn into a Result.
   *
   * - `success` → success(Array<S>)
   * - `failure` → failure(Error)
   * - `none`    → evaluated via `whenNone`
   */
  asResult(whenNone: () => Error | S | S[]): Result<Error, S[]> {
    if (this.isNone()) {
      const ret = whenNone();
      return ret instanceof Error
        ? ResultUtils.failure(ret)
        : ResultUtils.success(ret instanceof Array ? ret : [ret]);
    }

    if (this.isFailure()) {
      return ResultUtils.failure(this.value as Error);
    }

    return ResultUtils.success(this.value as S[]);
  }

  /**
   * Converts `none` into `failure`, preserving other states.
   */
  noneAsFailure<T>(value: Error): RepositoryReturn<T> {
    return this.isNone()
      ? repositoryFailure<T>(value)
      : (this as unknown as RepositoryReturn<T>);
  }

  /**
   * Converts `none` into `success`, preserving other states.
   */
  noneAsSuccess(value: Array<S>): RepositoryReturn<S> {
    return this.isNone()
      ? repositorySuccess(value)
      : (this as RepositoryFailure<S>);
  }

  /**
   * Converts `failure` into `none`, preserving other states.
   */
  failureAsNone<T = S>(): RepositoryReturn<T> {
    return this.isFailure()
      ? repositoryNone<T>()
      : (this as unknown as RepositoryReturn<T>);
  }

  /**
   * Pattern matching over all RepositoryReturn variants.
   *
   * Any thrown error is captured as `failure`.
   */
  match<A, B, C>(
    onNone: () => RepositoryReturn<A> | null | Error | A | Array<A>,
    onFailure: (value: Error) => RepositoryReturn<B> | null | Error | B | Array<B>,
    onSuccess: (value: Array<S>) => RepositoryReturn<C> | null | Error | C | Array<C>
  ): RepositoryReturn<A | B | C> {
    try {
      switch (this._tag) {
        case "none":
          return unionResolve(onNone());
        case "success":
          return unionResolve(onSuccess(this.value as Array<S>));
        case "failure":
          return unionResolve(onFailure(this.value as Error));
      }
    } catch (err) {
      return repositoryFailure(err as Error);
    }
  }

  /**
   * Maps over the success value.
   *
   * Alias for `mapSuccess`.
   */
  map<T>(func: (value: Array<S>) => T | RepositoryReturn<T>): RepositoryReturn<T> {
    return this.mapSuccess(func);
  }

  /**
   * Maps only over the success case.
   */
  mapSuccess<T>(
    func: (value: Array<S>) => T | RepositoryReturn<T>
  ): RepositoryReturn<T> {
    return this.match(repositoryNone<T>, repositoryFailure<T>, func);
  }

  /**
   * Maps only over the failure case.
   */
  mapFailure<T>(
    func: (value: Error) => T | RepositoryReturn<T>
  ): RepositoryReturn<T | S> {
    return this.match(repositoryNone<T>, func, repositorySuccess<S>);
  }

  /**
   * Maps only over the none case.
   */
  mapNone<T>(
    func: () => T | RepositoryReturn<T>
  ): RepositoryReturn<T | S> {
    return this.match(func, repositoryFailure<S>, repositorySuccess<S>);
  }

  /**
   * Maps each element inside a successful collection.
   */
  mapElements<T>(func: (el: S) => T): RepositoryReturn<T> {
    return this.match(
      repositoryNone<T>,
      repositoryFailure<T>,
      s => repositorySuccess<T>(s.map(func))
    );
  }

  /**
   * Maps only the first element of a successful collection.
   */
  mapFirst<T>(func: (el: S) => T): RepositoryReturn<T | S> {
    return this.match(
      repositoryNone<T>,
      repositoryFailure<T>,
      s => (s.length > 0 ? func(s[0]) : [])
    );
  }

  /**
   * Filters elements of a successful collection.
   */
  filter(func: (el: S) => boolean): RepositoryReturn<S> {
    return this.match(
      repositoryNone<S>,
      repositoryFailure<S>,
      s => s.filter(func)
    );
  }

  /**
   * Flattens nested RepositoryReturn values.
   */
  flatten(): RepositoryReturn<any> {
    return (
      isRR(this.value)
        ? this.isSuccess()
          ? (this.value as RepositorySuccess<unknown>).flatten()
          : this.isNone()
          ? (this.value as RepositoryNone<unknown>).flatten()
          : (this.value as RepositoryFailure<unknown>).flatten()
        : this.isSuccess()
        ? repositorySuccess(this.value as S[])
        : this.isNone()
        ? repositoryNone<S>()
        : repositoryFailure(this.value as Error)
    ) as any;
  }

  /**
   * Resolves promised values inside the RepositoryReturn.
   */
  promiseFlaten(): Promise<RepositoryReturn<Awaited<S>>> {
    return !(this.value instanceof Promise)
      ? Promise.resolve(this as RepositoryReturn<Awaited<S>>)
      : this.isNone()
      ? Promise.resolve(repositoryNone<Awaited<S>>())
      : this.isFailure()
      ? this.value.then(v => repositoryFailure<Awaited<S>>(v))
      : this.value.then(v => repositorySuccess<Awaited<S>>(v));
  }
}

/**
 * Successful repository result.
 */
export class RepositorySuccess<S>
  extends BaseRepositoryReturn<S>
  implements Monad<Array<S>>
{
  _tag: "success";
  value: Array<S>;

  constructor(value: S | Array<S>) {
    super();
    this._tag = "success";
    this.value = Array.isArray(value) ? value : [value];
  }
}

/**
 * Failed repository result.
 */
export class RepositoryFailure<S>
  extends BaseRepositoryReturn<S>
  implements Monad<Error>
{
  _tag: "failure";
  value: Error;

  constructor(value: Error) {
    super();
    this._tag = "failure";
    this.value = value;
  }
}

/**
 * Repository result representing absence of value.
 */
export class RepositoryNone<S>
  extends BaseRepositoryReturn<S>
  implements Monad<null>
{
  _tag: "none";
  value: null;

  constructor() {
    super();
    this._tag = "none";
    this.value = null;
  }
}

/**
 * Union type representing all RepositoryReturn variants.
 */
export type RepositoryReturn<S> = NonNullable<
  RepositoryNone<S> | RepositoryFailure<S> | RepositorySuccess<S>
>;

/**
 * Utility functions for RepositoryReturn.
 */
export abstract class RepositoryReturnUtils {
  static success<S>(s: S | Array<S>): RepositoryReturn<S> {
    return new RepositorySuccess(s);
  }

  static failure<S>(f: Error): RepositoryReturn<S> {
    return new RepositoryFailure(f);
  }

  static none<S>(): RepositoryReturn<S> {
    return new RepositoryNone();
  }

  static create<V>(
    value?: null | Error | V | Array<V> | RepositoryReturn<V>
  ): RepositoryReturn<V> {
    return unionResolve(value);
  }

  static match<S>(res: RepositoryReturn<S>) {
    return (onNone, onFailure, onSuccess) =>
      res.match(onNone, onFailure, onSuccess);
  }

  static bind<S>(res: RepositoryReturn<S>) {
    return func => res.map(func);
  }
}

/**
 * Functional constructors.
 */
export const repositorySuccess = <S>(
  s: S | Array<S>
): RepositoryReturn<S> => new RepositorySuccess(s);

export const repositoryFailure = <S>(f: Error): RepositoryReturn<S> =>
  new RepositoryFailure(f);

export const repositoryNone = <S>(): RepositoryNone<S> =>
  new RepositoryNone();

/**
 * Alias for RepositoryReturnUtils.
 */
export class RR extends RepositoryReturnUtils {}

