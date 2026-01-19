/**
 *  Encapsulates a success value or a failure (error).
 */

// deno-lint-ignore-file no-explicit-any

import type { IMatchable, Monad } from "./Functional.ts";

export function isResult<U, V>(obj: V | Result<U, V>): obj is Result<U, V> {
  return obj && typeof obj == `object` && `_tag` in obj && (obj._tag == `success` || obj._tag == `failure`);
}

export type ResultPromises =
  | Result<Promise<unknown>, unknown>
  | Result<unknown, Promise<unknown>>
  | Result<Promise<unknown>, Promise<unknown>>
  | Promise<Result<unknown, unknown>>;

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

// type N = Result<number, Promise<boolean>>;
// export type M = FlattenedResultPromise<N>;
//   ^?

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

abstract class BaseResult<F, S> {
  abstract _tag: `success` | `failure`;
  abstract value: F | S;

  isSuccess(): this is Success<F, S> {
    return this._tag == `success`;
  }

  isFailure(): this is Failure<F, S> {
    return this._tag == `failure`;
  }

  match<A, B>(onFailure: (value: F) => A, onSuccess: (value: S) => B): A | B {
    return this.isSuccess() ? onSuccess(this.value) : onFailure(this.value as F);
  }

  map<T>(func: (value: S) => T | Result<F, T>): Result<F, T> {
    return this.match(
      fail => failure(fail),
      succ => {
        const res: T | Result<F, T> = func(succ);
        return isResult<F, T>(res) ? res : success(res);
      }
    );
  }

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

  async promiseFlaten(): Promise<Result<Awaited<F>, Awaited<S>>> {
    return this.isSuccess()
      ? success<Awaited<F>, Awaited<S>>((this.value instanceof Promise ? await this.value : this.value) as Awaited<S>)
      : failure<Awaited<F>, Awaited<S>>((this.value instanceof Promise ? await this.value : this.value) as Awaited<F>);
  }
}

export class Success<F, S> extends BaseResult<F, S> implements IMatchable, Monad<S> {
  _tag: `success`;
  value: S;

  constructor(value: S) {
    super();
    this._tag = `success`;
    this.value = value;
  }
}

export class Failure<F, S> extends BaseResult<F, S> implements IMatchable, Monad<F> {
  _tag: `failure`;
  value: F;

  constructor(value: F) {
    super();
    this._tag = `failure`;
    this.value = value;
  }
}

export type Result<F, S> = NonNullable<Failure<F, S> | Success<F, S>>;

type OnlySuccess<T extends Result<unknown, unknown>> = Exclude<T, Failure<unknown, unknown>>;
type OnlySuccesses<T extends Array<Result<unknown, unknown>>> = { [K in keyof T]: OnlySuccess<T[K]> };

export type SuccessType<T extends Result<unknown, unknown>> = T extends Result<unknown, infer S> ? S : never;
export type FailureType<T extends Result<unknown, unknown>> = T extends Result<infer F, unknown> ? F : never;

export type SuccessesType<T extends Array<Result<unknown, unknown>>> = {
  [K in keyof T]: SuccessType<T[K]>;
};
export type FailuresType<T extends Array<Result<unknown, unknown>>> = {
  [K in keyof T]: FailureType<T[K]>;
};

export abstract class ResultUtils {
  static success<F, S>(s: S): Result<F, S> {
    return new Success(s);
  }

  static failure<F, S>(f: F): Result<F, S> {
    return new Failure(f);
  }

  static match<F, S>(res: Result<F, S>): <A, B>(onFailure: (value: F) => A, onSuccess: (value: S) => B) => A | B {
    return (onFailure, onSuccess) => res.match(onFailure, onSuccess);
  }

  static bind<F, S>(res: Result<F, S>): <T>(func: (value: S) => T | Result<F, T>) => Result<F, T> {
    return func => res.map(func);
  }

  static all<T extends Array<Result<unknown, unknown>>>(
    ...args: T
  ): <U, V = U>(onFailure: (...args: T) => U, onSuccess: (...args: OnlySuccesses<T>) => V) => U | V {
    return (onFailure, onSuccess) =>
      args.map((el): boolean => el.isSuccess()).reduce((p, c) => p && c, true)
        ? onSuccess(...(args as OnlySuccesses<T>))
        : onFailure(...(args as T));
  }
}

export const success = <F, S>(s: S): Result<F, S> => {
  return new Success(s);
};

export const failure = <F, S>(f: F): Result<F, S> => {
  return new Failure(f);
};

