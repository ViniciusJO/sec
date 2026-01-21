/**
 * Represents a value that can be one of two possible types: `Left` or `Right`.
 *
 * `Either<L, R>` is typically used to model computations that may fail:
 * - `Left<L>`  → failure / error / exceptional path
 * - `Right<R>` → success / valid result
 *
 * Unlike `Maybe`, `Either` preserves information about *why* a computation failed.
 */

// deno-lint-ignore-file no-explicit-any
import type { IMatchable, Monad } from "./Functional.ts";
import { Success, Failure, type Result } from "./Result.ts";

/**
 * Runtime type guard for `Either`.
 *
 * Useful when interacting with untyped values or external boundaries.
 */
export function isEither<U, V>(obj: V | Either<U, V>): obj is Either<U, V> {
  return obj != null &&
    typeof obj === "object" &&
    "_tag" in obj &&
    (obj._tag === "left" || obj._tag === "right");
}

/**
 * Shared base class for `Left` and `Right`.
 *
 * Encapsulates common behavior such as:
 * - discrimination
 * - pattern matching
 * - mapping
 * - flattening
 */
abstract class BaseEither<L, R> {
  /** Discriminant tag */
  abstract _tag: "right" | "left";

  /** Wrapped value */
  abstract value: L | R;

  /** Returns true if this is a `Right` */
  isRight(): this is Right<L, R> {
    return this._tag === "right";
  }

  /** Returns true if this is a `Left` */
  isLeft(): this is Left<L, R> {
    return this._tag === "left";
  }

  /**
   * Pattern matches on the `Either` value.
   *
   * @param onLeft  Executed if this is `Left`
   * @param onRight Executed if this is `Right`
   */
  match<A, B>(onLeft: (value: L) => A, onRight: (value: R) => B): A | B {
    return this.isRight()
      ? onRight(this.value as R)
      : onLeft(this.value as L);
  }

  /**
   * Maps the `Right` value.
   *
   * - Mapping over `Left` is a no-op
   * - Returning an `Either` flattens automatically
   */
  map<T>(func: (value: R) => T | Either<L, T>): Either<L, T> {
    return this.match(
      fail => left(fail),
      succ => {
        const res = func(succ);
        return isEither<L, T>(res) ? res : right(res);
      }
    );
  }

  /**
   * Recursively flattens nested `Either` values.
   *
   * This allows collapsing arbitrarily nested `Either` structures
   * while preserving all possible error types.
   */
  flatten(): Either<L, R> extends Either<infer U, infer V>
    ? U extends Either<infer W, infer X>
      ? V extends Either<infer Y, infer Z>
        ? Either<W | Y, X | Z>
        : Either<W, V | X>
      : V extends Either<infer Y, infer Z>
        ? Either<U | Y, Z>
        : Either<U, V>
    : never {
    return (
      isEither(this.value)
        ? this.isRight()
          ? (this.value as Right<unknown, unknown>).flatten()
          : (this.value as Left<unknown, unknown>).flatten()
        : this.isRight()
          ? right(this.value)
          : left(this.value)
    ) as any;
  }

  /**
   * Resolves promised values inside the `Either`.
   *
   * - `Right<Promise<R>>` → `Right<R>`
   * - `Left<Promise<L>>`  → `Left<L>`
   */
  async promiseFlaten(): Promise<Either<Awaited<L>, Awaited<R>>> {
    return this.isRight()
      ? right(
          (this.value instanceof Promise ? await this.value : this.value) as Awaited<R>
        )
      : left(
          (this.value instanceof Promise ? await this.value : this.value) as Awaited<L>
        );
  }
}

/**
 * Represents the failure / error side of `Either`.
 */
export class Left<L, R> extends BaseEither<L, R> implements IMatchable, Monad<L> {
  _tag: "left";
  value: L;

  constructor(value: L) {
    super();
    this._tag = "left";
    this.value = value;
  }
}

/**
 * Represents the success / valid side of `Either`.
 */
export class Right<L, R> extends BaseEither<L, R> implements IMatchable, Monad<R> {
  _tag: "right";
  value: R;

  constructor(value: R) {
    super();
    this._tag = "right";
    this.value = value;
  }
}

/**
 * Discriminated union representing success or failure.
 */
export type Either<L, R> = NonNullable<Left<L, R> | Right<L, R>>;

/** Constructs a `Left` value */
export const left = <L, R>(l: L): Either<L, R> => new Left(l);

/** Constructs a `Right` value */
export const right = <L, R>(r: R): Either<L, R> => new Right(r);

/* -------------------------------------------------------------------------- */
/* Type utilities                                                              */
/* -------------------------------------------------------------------------- */

type OnlyRight<T extends Either<unknown, unknown>> = Exclude<T, Left<unknown, unknown>>;
type OnlyRightes<T extends Array<Either<unknown, unknown>>> = { [K in keyof T]: OnlyRight<T[K]> };

export type RightType<T extends Either<unknown, unknown>> =
  T extends Either<unknown, infer S> ? S : never;

export type LeftType<T extends Either<unknown, unknown>> =
  T extends Either<infer F, unknown> ? F : never;

export type RightesType<T extends Array<Either<unknown, unknown>>> = {
  [K in keyof T]: RightType<T[K]>;
};

export type LeftsType<T extends Array<Either<unknown, unknown>>> = {
  [K in keyof T]: LeftType<T[K]>;
};

/* -------------------------------------------------------------------------- */
/* Utilities                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Interoperability helpers between `Either` and `Result`.
 */
export abstract class EithertUtils {
  /** Constructs a successful `Result` */
  static success<F, S>(s: S): Result<F, S> {
    return new Success(s);
  }

  /** Constructs a failed `Result` */
  static failure<F, S>(f: F): Result<F, S> {
    return new Failure(f);
  }

  /** Curried matcher for `Result` */
  static match<F, S>(
    res: Result<F, S>
  ): <A, B>(onFailure: (value: F) => A, onSuccess: (value: S) => B) => A | B {
    return (onFailure, onSuccess) => res.match(onFailure, onSuccess);
  }

  /** Curried bind/map for `Result` */
  static bind<F, S>(
    res: Result<F, S>
  ): <T>(func: (value: S) => T | Result<F, T>) => Result<F, T> {
    return func => res.map(func);
  }

  /**
   * Executes a function only if *all* `Either` values are `Right`.
   */
  static all<T extends Array<Either<unknown, unknown>>>(
    ...args: T
  ): <U, V = U>(
    onLeft: (...args: T) => U,
    onRight: (...args: OnlyRightes<T>) => V
  ) => U | V {
    return (onLeft, onRight) =>
      args.every(el => el.isRight())
        ? onRight(...(args as OnlyRightes<T>))
        : onLeft(...(args as T));
  }
}


// export function query(q: string): Either<Error, string> {
//   try {
//     q;
//     return right(q);
//   } catch (error) {
//     return left(error as Error);
//   }
// }
