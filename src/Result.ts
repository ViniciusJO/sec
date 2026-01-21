/**
 * Represents the result of a computation that may succeed or fail.
 *
 * `Result<F, S>` is a specialized form of `Either` with clearer semantics:
 * - `Success<S>` → successful computation
 * - `Failure<F>` → failed computation with an error value
 *
 * This type is well-suited for API boundaries, validation, parsing,
 * and other domains where success/failure is explicit and expected.
 */

// deno-lint-ignore-file no-explicit-any

import type { IMatchable, Monad } from "./Functional.ts";

/**
 * Runtime type guard for `Result`.
 *
 * Useful when dealing with untyped or external values.
 */
export function isResult<U, V>(obj: V | Result<U, V>): obj is Result<U, V> {
  return obj != null &&
    typeof obj === "object" &&
    "_tag" in obj &&
    (obj._tag === "success" || obj._tag === "failure");
}

/* -------------------------------------------------------------------------- */
/* Promise-related helper types                                                */
/* -------------------------------------------------------------------------- */

/**
 * Union of all supported promise-containing `Result` forms.
 */
export type ResultPromises =
  | Result<Promise<unknown>, unknown>
  | Result<unknown, Promise<unknown>>
  | Result<Promise<unknown>, Promise<unknown>>
  | Promise<Result<unknown, unknown>>;

/**
 * Resolves promise-containing `Result` types into a promised `Result`
 * of resolved values.
 */
export type FlattenedResultPromise<T> =
  T extends Result<Promise<infer Y>, Promise<infer Z>>
    ? Promise<Result<Y, Z>>
    : T extends Result<Promise<infer U>, infer V>
      ? Promise<Result<U, V>>
      : T extends Result<infer W, Promise<infer X>>
        ? Promise<Result<W, X>>
        : T extends Promise<Result<unknown, unknown>>
          ? T
          : never;

/**
 * Type-level flattening of nested `Result` values.
 */
export type FlattenedResult<T extends Result<unknown, unknown>> =
  T extends Result<infer U, infer V>
    ? U extends Result<infer W, infer X>
      ? V extends Result<infer Y, infer Z>
        ? Result<W | Y, X | Z>
        : Result<W, V | X>
      : V extends Result<infer Y, infer Z>
        ? Result<U | Y, Z>
        : Result<U, V>
    : T;

/* -------------------------------------------------------------------------- */
/* Base implementation                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Shared base class for `Success` and `Failure`.
 *
 * Contains common logic such as:
 * - discrimination
 * - pattern matching
 * - mapping
 * - flattening
 * - async resolution
 */
abstract class BaseResult<F, S> {
  /** Discriminant tag */
  abstract _tag: "success" | "failure";

  /** Wrapped value */
  abstract value: F | S;

  /** Returns true if this is a `Success` */
  isSuccess(): this is Success<F, S> {
    return this._tag === "success";
  }

  /** Returns true if this is a `Failure` */
  isFailure(): this is Failure<F, S> {
    return this._tag === "failure";
  }

  /**
   * Pattern matches on the `Result`.
   *
   * @param onFailure Executed if this is `Failure`
   * @param onSuccess Executed if this is `Success`
   */
  match<A, B>(onFailure: (value: F) => A, onSuccess: (value: S) => B): A | B {
    return this.isSuccess()
      ? onSuccess(this.value as S)
      : onFailure(this.value as F);
  }

  /**
   * Maps the success value.
   *
   * - Mapping over `Failure` is a no-op
   * - Returning a `Result` flattens automatically
   */
  map<T>(func: (value: S) => T | Result<F, T>): Result<F, T> {
    return this.match(
      fail => failure(fail),
      succ => {
        const res = func(succ);
        return isResult<F, T>(res) ? res : success(res);
      }
    );
  }

  /**
   * Recursively flattens nested `Result` values.
   *
   * Preserves all possible failure and success types.
   */
  flatten(): Result<F, S> extends Result<infer U, infer V>
    ? U extends Result<infer W, infer X>
      ? V extends Result<infer Y, infer Z>
        ? Result<W | Y, X | Z>
        : Result<W, V | X>
      : V extends Result<infer Y, infer Z>
        ? Result<U | Y, Z>
        : Result<U, V>
    : never {
    return (
      isResult(this.value)
        ? this.isSuccess()
          ? (this.value as Success<unknown, unknown>).flatten()
          : (this.value as Failure<unknown, unknown>).flatten()
        : this.isSuccess()
          ? success(this.value)
          : failure(this.value)
    ) as any;
  }

  /**
   * Resolves promised values inside the `Result`.
   *
   * - `Success<Promise<S>>` → `Success<S>`
   * - `Failure<Promise<F>>` → `Failure<F>`
   */
  async promiseFlaten(): Promise<Result<Awaited<F>, Awaited<S>>> {
    return this.isSuccess()
      ? success(
          (this.value instanceof Promise ? await this.value : this.value) as Awaited<S>
        )
      : failure(
          (this.value instanceof Promise ? await this.value : this.value) as Awaited<F>
        );
  }
}

/* -------------------------------------------------------------------------- */
/* Variants                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Represents a successful computation.
 */
export class Success<F, S> extends BaseResult<F, S> implements IMatchable, Monad<S> {
  _tag: "success";
  value: S;

  constructor(value: S) {
    super();
    this._tag = "success";
    this.value = value;
  }
}

/**
 * Represents a failed computation.
 */
export class Failure<F, S> extends BaseResult<F, S> implements IMatchable, Monad<F> {
  _tag: "failure";
  value: F;

  constructor(value: F) {
    super();
    this._tag = "failure";
    this.value = value;
  }
}

/**
 * Discriminated union of `Success` and `Failure`.
 */
export type Result<F, S> = NonNullable<Failure<F, S> | Success<F, S>>;

/* -------------------------------------------------------------------------- */
/* Type utilities                                                              */
/* -------------------------------------------------------------------------- */

type OnlySuccess<T extends Result<unknown, unknown>> = Exclude<T, Failure<unknown, unknown>>;
type OnlySuccesses<T extends Array<Result<unknown, unknown>>> = { [K in keyof T]: OnlySuccess<T[K]> };

export type SuccessType<T extends Result<unknown, unknown>> =
  T extends Result<unknown, infer S> ? S : never;

export type FailureType<T extends Result<unknown, unknown>> =
  T extends Result<infer F, unknown> ? F : never;

export type SuccessesType<T extends Array<Result<unknown, unknown>>> = {
  [K in keyof T]: SuccessType<T[K]>;
};

export type FailuresType<T extends Array<Result<unknown, unknown>>> = {
  [K in keyof T]: FailureType<T[K]>;
};

/* -------------------------------------------------------------------------- */
/* Utilities                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Helper utilities for working with `Result`.
 */
export abstract class ResultUtils {
  /** Constructs a successful `Result` */
  static success<F, S>(s: S): Result<F, S> {
    return new Success(s);
  }

  /** Constructs a failed `Result` */
  static failure<F, S>(f: F): Result<F, S> {
    return new Failure(f);
  }

  /** Curried matcher */
  static match<F, S>(
    res: Result<F, S>
  ): <A, B>(onFailure: (value: F) => A, onSuccess: (value: S) => B) => A | B {
    return (onFailure, onSuccess) => res.match(onFailure, onSuccess);
  }

  /** Curried bind/map */
  static bind<F, S>(
    res: Result<F, S>
  ): <T>(func: (value: S) => T | Result<F, T>) => Result<F, T> {
    return func => res.map(func);
  }

  /**
   * Executes the success branch only if *all* results succeed.
   */
  static all<T extends Array<Result<unknown, unknown>>>(
    ...args: T
  ): <U, V = U>(
    onFailure: (...args: T) => U,
    onSuccess: (...args: OnlySuccesses<T>) => V
  ) => U | V {
    return (onFailure, onSuccess) =>
      args.every(el => el.isSuccess())
        ? onSuccess(...(args as OnlySuccesses<T>))
        : onFailure(...(args as T));
  }
}

/* -------------------------------------------------------------------------- */
/* Constructors                                                               */
/* -------------------------------------------------------------------------- */

/** Constructs a `Success` value */
export const success = <F, S>(s: S): Result<F, S> => new Success(s);

/** Constructs a `Failure` value */
export const failure = <F, S>(f: F): Result<F, S> => new Failure(f);

