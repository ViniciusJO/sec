/**
 *  Encapsulates a value of one of two possible types, left or right.
 */

// deno-lint-ignore-file no-explicit-any
import type { IMatchable, Monad } from "./Functional.ts";
import { Success, Failure, type Result } from "./Result.ts";

export function isEither<U, V>(obj: V | Either<U, V>): obj is Either<U, V> {
  return obj && typeof obj == `object` && `_tag` in obj && (obj._tag == `left` || obj._tag == `right`);
}

abstract class BaseEither<L, R> {
  abstract _tag: `right` | `left`;
  abstract value: L | R;

  isRight(): this is Right<L, R> {
    return this._tag == `right`;
  }

  isLeft(): this is Left<L, R> {
    return this._tag == `left`;
  }

  match<A, B>(onLeft: (value: L) => A, onRight: (value: R) => B): A | B {
    return this.isRight() ? onRight(this.value) : onLeft(this.value as L);
  }

  map<T>(func: (value: R) => T | Either<L, T>): Either<L, T> {
    return this.match(
      fail => left(fail),
      succ => {
        const res: T | Either<L, T> = func(succ);
        return isEither<L, T>(res) ? res : right(res);
      }
    );
  }

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
    ) as any; // eslint-disable-line
  }

  async promiseFlaten(): Promise<Either<Awaited<L>, Awaited<R>>> {
    return this.isRight()
      ? right<Awaited<L>, Awaited<R>>((this.value instanceof Promise ? await this.value : this.value) as Awaited<R>)
      : left<Awaited<L>, Awaited<R>>((this.value instanceof Promise ? await this.value : this.value) as Awaited<L>);
  }
}

export class Left<L, R> extends BaseEither<L, R> implements IMatchable, Monad<L> {
  _tag: `left`;
  value: L;

  constructor(value: L) {
    super();
    this._tag = `left`;
    this.value = value;
  }
}

export class Right<L, R> extends BaseEither<L, R> implements IMatchable, Monad<R> {
  _tag: `right`;
  value: R;

  constructor(value: R) {
    super();
    this._tag = `right`;
    this.value = value;
  }
}
export type Either<L, R> = NonNullable<Left<L, R> | Right<L, R>>;

export const left = <L, R>(l: L): Either<L, R> => {
  return new Left(l);
};

export const right = <L, R>(r: R): Either<L, R> => {
  return new Right(r);
};

type OnlyRight<T extends Either<unknown, unknown>> = Exclude<T, Left<unknown, unknown>>;
type OnlyRightes<T extends Array<Either<unknown, unknown>>> = { [K in keyof T]: OnlyRight<T[K]> };

export type RightType<T extends Either<unknown, unknown>> = T extends Either<unknown, infer S> ? S : never;
export type LeftType<T extends Either<unknown, unknown>> = T extends Either<infer F, unknown> ? F : never;

export type RightesType<T extends Array<Either<unknown, unknown>>> = {
  [K in keyof T]: RightType<T[K]>;
};
export type LeftsType<T extends Array<Either<unknown, unknown>>> = {
  [K in keyof T]: LeftType<T[K]>;
};

export abstract class EithertUtils {
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

  static all<T extends Array<Either<unknown, unknown>>>(
    ...args: T
  ): <U, V = U>(onLeft: (...args: T) => U, onRight: (...args: OnlyRightes<T>) => V) => U | V {
    return (onLeft, onRight) =>
      args.map((el): boolean => el.isRight()).reduce((p, c) => p && c, true)
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
