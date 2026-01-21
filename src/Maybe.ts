/**
 * Represents an optional value.
 *
 * `Maybe<T>` is a sum type that models the presence (`Some<T>`)
 * or absence (`None`) of a value without using `null` or `undefined`.
 *
 * This is commonly used to:
 * - Avoid null checks
 * - Make absence explicit in the type system
 * - Safely compose computations that may not produce a value
 */

import type { Monad, IMatchable } from "./Functional.ts";

/**
 * Discriminated union representing an optional value.
 *
 * - `Some<T>` wraps an existing value
 * - `None` represents the absence of a value
 */
export type Maybe<T> = Some<T> | None;

/**
 * Runtime type guard for `Maybe`.
 *
 * Useful when interoperating with untyped values, external APIs,
 * or generic code where the static type cannot be trusted.
 *
 * @param obj Value to be tested
 * @returns `true` if the value is a `Some` or `None`
 */
export function isMaybe<T>(obj: T | Maybe<T>): obj is Maybe<T> {
  return (
    obj != null &&
    typeof obj === `object` &&
    `_tag` in obj &&
    (obj._tag === `Some` || obj._tag === `None`)
  );
}

/**
 * Represents a present value inside `Maybe`.
 *
 * Implements:
 * - `Monad<T>` for sequencing computations
 * - `IMatchable` for pattern matching
 */
export interface Some<T> extends Monad<T>, IMatchable {
  /** Wrapped value */
  value: T;

  /** Discriminant tag */
  _tag: `Some`;

  /**
   * Indicates this value is not `None`.
   *
   * Provided mainly for symmetry with `None.isNone()`
   * and ergonomic runtime checks.
   */
  isNone: () => false;

  /**
   * Pattern matches on the `Maybe` value.
   *
   * @param onNone Function executed if the value is `None`
   * @param onSome Function executed if the value is `Some`
   */
  match<B, C>(
    onNone: (value?: never) => B,
    onSome: (value: T) => C
  ): B | C;

  /**
   * Transforms the wrapped value.
   *
   * If the mapping function returns:
   * - a raw value → it is automatically wrapped in `Some`
   * - a `Maybe` → it is returned as-is (flattening)
   *
   * This behavior makes `map` closer to `flatMap`
   * while keeping a simpler API.
   */
  map<B>(func: (value: T) => B | Maybe<B>): Maybe<B>;
}

/**
 * Represents the absence of a value.
 *
 * `None` is a singleton and contains no data.
 */
export interface None extends Monad<never>, IMatchable {
  /** Discriminant tag */
  _tag: `None`;

  /**
   * Indicates this value represents absence.
   */
  isNone: () => true;

  /**
   * Pattern matches on the `Maybe` value.
   *
   * The `onSome` branch is statically unreachable.
   */
  match<B, C>(
    onNone: (value?: never) => B,
    onSome: (value: never) => C
  ): B | C;

  /**
   * Mapping over `None` is a no-op.
   *
   * The mapping function is never executed and `None`
   * is returned unchanged.
   */
  map<B>(func: (value: never) => B | Maybe<B>): Maybe<B>;
}

/**
 * Constructs a `Some<T>` value.
 *
 * @param x Value to wrap
 */
export const some = <T>(x: T): Some<T> => ({
  _tag: `Some`,
  value: x,

  isNone: () => false,

  match<B, C>(onNone: () => B, onSome: (value: T) => C): B | C {
    // `onNone` is intentionally ignored
    onNone;
    return onSome(this.value);
  },

  map<B>(func: (value: T) => B | Maybe<B>): Maybe<B> {
    const res = func(this.value);
    return isMaybe<B>(res) ? res : some(res);
  }
});

/**
 * Singleton value representing absence.
 *
 * This value is shared and should never be mutated.
 */
export const none: None & Maybe<never> = {
  _tag: `None`,

  isNone: () => true,

  match<B, C>(onNone: () => B, onSome: (value: never) => C): B | C {
    // `onSome` is intentionally unreachable
    onSome;
    return onNone();
  },

  map<B>(func: (value: never) => B | Maybe<B>): Maybe<B> {
    // Mapping over None does nothing
    func;
    return none;
  }
} as None;

/**
 * Type guard that checks whether a `Maybe` is `None`.
 *
 * Prefer this over direct `_tag` checks in user code.
 */
export const isNone = <A>(x: Maybe<A>): x is None => x._tag === `None`;

