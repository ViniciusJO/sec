/**
 *  Encodes the absense of value, an error ocurency or an array of type T.
 *
 *  RepositoryReturn<T> ≈ Either<Error, Maybe<Array<T>>>
 */

// deno-lint-ignore-file no-explicit-any

import { ResultUtils, type Result } from "./Result.ts";
import { type Monad } from "./Functional.ts";

export function isRR<V>(obj?: null | Error | V | Array<V> | RepositoryReturn<V>): obj is RepositoryReturn<V> {
  return null != obj && obj && `object` == typeof obj && `_tag` in obj && (`success` == obj._tag || `failure` == obj._tag || `none` == obj._tag);
}

export type NonRR<T> = T extends RepositoryReturn<infer U> ? U : T;

export function unionResolve<V>(obj?: null | Error | V | Array<V> | RepositoryReturn<V>): RepositoryReturn<V> {
  return isRR(obj)
    ? obj
    : (obj || `number` == typeof obj) && (!Array.isArray(obj) || 0 < obj.length)
      ? obj instanceof Error
        ? repositoryFailure<V>(obj)
        : repositorySuccess(obj)
      : repositoryNone<V>();
}

abstract class BaseRepositoryReturn<S> {
  abstract _tag: `none` | `success` | `failure`;
  abstract value: null | Error | Array<S>;

  isSuccess(): this is RepositorySuccess<S> {
    return this._tag == `success`;
  }

  isFailure(): this is RepositoryFailure<S> {
    return this._tag == `failure`;
  }

  isNone(): this is RepositoryNone<S> {
    return this._tag == `none`;
  }

  asFirstElementResult(whenNone: () => Error | S | S[]): Result<Error, S> {
    return this.asResult(whenNone).map((els: S[])=>els[0]);
  }

  asResult(whenNone: () => Error | S | S[]): Result<Error, S[]> {
    if(this.isNone()) {
      const ret = whenNone();
      return ret instanceof Error ? ResultUtils.failure(ret) : ResultUtils.success(ret instanceof Array ? ret : [ret]);
    }

    if(this.isFailure()) return ResultUtils.failure(this.value as Error);

    return ResultUtils.success(this.value as S[]);
  }

  noneAsFailure<T>(value: Error): RepositoryReturn<T> {
    return this.isNone()
      ? repositoryFailure<T>(value)
      : this as unknown as RepositoryReturn<T>;
  };

  noneAsSuccess(value: Array<S>): RepositoryReturn<S> {
    return this.isNone()
      ? repositorySuccess(value)
      : this as RepositoryFailure<S>;
  };

  failureAsNone<T = S>(): RepositoryReturn<T> {
    return this.isFailure() ? repositoryNone<T>() : this as unknown as RepositoryReturn<T>;
  };

  //static unionResolve<V>(obj: V | RepositoryReturn<V>): RepositoryReturn<V> {
  //  return isRR(obj)
  //    ? obj
  //    : (obj || `number` == typeof obj) && (!Array.isArray(obj) || obj.length > 0)
  //      ? obj instanceof Error
  //        ? repositoryFailure<V>(obj)
  //        : repositorySuccess(obj)
  //      : repositoryNone<V>();
  //}

  match<A, B, C>(
    onNone: () => RepositoryReturn<A> | null | Error | A | Array<A>,
    onFailure: (value: Error) => RepositoryReturn<B> | null | Error | B | Array<B>,
    onSuccess: (value: Array<S>) => RepositoryReturn<C> | null | Error | C | Array<C>
  ): RepositoryReturn<A | B | C> {
    try {
      switch (this._tag) {
        case `none`: {
          return unionResolve(onNone());
        }
        case `success`: {
          return unionResolve(onSuccess(this.value as Array<S>));
        }
        case `failure`: {
          return unionResolve(onFailure(this.value as Error));
        }
      }
    } catch (err) {
      return repositoryFailure(err as Error);
    }
  }

  map<T>(func: (value: Array<S>) => T | RepositoryReturn<T>): RepositoryReturn<T> {
    return this.mapSuccess(func);
  }

  mapSuccess<T>(func: (value: Array<S>) => T | RepositoryReturn<T>): RepositoryReturn<T> {
    return this.match(
      repositoryNone<T>,
      repositoryFailure<T>,
      func
    );
  }

  mapFailure<T>(func: (value: Error) => T | RepositoryReturn<T>): RepositoryReturn<T | S> {
    return this.match(
      repositoryNone<T>,
      func,
      repositorySuccess<S>
    );
  }

  mapNone<T>(func: () => T | RepositoryReturn<T>): RepositoryReturn<T | S> {
    return this.match(
      func,
      repositoryFailure<S>,
      repositorySuccess<S>
    );
  }

  mapElements<T>(func: (el: S) => T): RepositoryReturn<T> {
    return this.match(
      repositoryNone<T>,
      repositoryFailure<T>,
      s => repositorySuccess<T>(s.map(func))
    );
  }

  mapFirst<T>(func: (el: S) => T): RepositoryReturn<T | S> {
    return this.match(
      repositoryNone<T>,
      repositoryFailure<T>,
      s => s.length > 0 ? func(s[0]) : []
    );
  }

  filter(func: (el: S) => boolean): RepositoryReturn<S> {
    return this.match(
      repositoryNone<S>,
      repositoryFailure<S>,
      s => s.filter(func)
    );
  }

  // TODO: FIX
  flatten(): RepositoryReturn<S> extends RepositoryReturn<infer V>
    ? Error extends RepositoryReturn<infer X>
    ? V extends RepositoryReturn<infer Z>
    ? RepositoryReturn<X | Z>
    : RepositoryReturn<V | X>
    : V extends RepositoryReturn<infer Z>
    ? RepositoryReturn<Z>
    : RepositoryReturn<V>
    : never {
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

  // TODO: FIX
  promiseFlaten(): Promise<RepositoryReturn<Awaited<S>>> {
    return !(this.value instanceof Promise)
      ? Promise.resolve(this as RepositoryReturn<Awaited<S>>)
      : this.isNone()
        ? Promise.resolve(repositoryNone<Awaited<S>>())
        : this.isFailure()
          ? this.value.then(value => repositoryFailure<Awaited<S>>(value))
          : this.value.then(value => repositorySuccess<Awaited<S>>(value));
  }
}

export class RepositorySuccess<S> extends BaseRepositoryReturn<S> implements Monad<Array<S>> {
  _tag: `success`;
  value: Array<S>;

  constructor(value: S | Array<S>) {
    super();
    this._tag = `success`;
    this.value = Array.isArray(value) ? value : [value];
  }
}

export class RepositoryFailure<S> extends BaseRepositoryReturn<S> implements Monad<Error> {
  _tag: `failure`;
  value: Error;

  constructor(value: Error) {
    super();
    this._tag = `failure`;
    this.value = value;
  }
}

export class RepositoryNone<S> extends BaseRepositoryReturn<S> implements Monad<null> {
  _tag: `none`;
  value: null;

  constructor() {
    super();
    this._tag = `none`;
    this.value = null;
  }
}

export type RepositoryReturn<S> = NonNullable<
  | RepositoryNone<S>
  | RepositoryFailure<S>
  | RepositorySuccess<S>
>;

export type OnlySuccess<T extends RepositoryReturn<unknown>> = Exclude<T, RepositoryFailure<unknown>>;
export type OnlySuccesses<T extends Array<RepositoryReturn<unknown>>> = { [K in keyof T]: OnlySuccess<T[K]> };

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

  static create<V>(value?: null | Error | V | Array<V> | RepositoryReturn<V>): RepositoryReturn<V> {
    return unionResolve(value);
  }

  static match<S>(res: RepositoryReturn<S>): <A, B, C>(
    onNone: () => A | RepositoryReturn<A>,
    onFailure: (value: Error) => B | RepositoryReturn<B>,
    onSuccess: (value: Array<S>) => C | RepositoryReturn<C>
  ) => RepositoryReturn<A | B | C> {
    return (onNone, onFailure, onSuccess) => res.match(onNone, onFailure, onSuccess);
  }

  static bind<S>(res: RepositoryReturn<S>): <T>(func: (value: Array<S>) => T | RepositoryReturn<T>) => RepositoryReturn<T> {
    return func => res.map(func);
  }

  // TODO: fix ALL
  static all<T extends Array<RepositoryReturn<unknown>>>(
    ...args: T
  ): <U, V = U>(onFailure: (...args: T) => U, onSuccess: (...args: OnlySuccesses<T>) => V) => U | V {
    return (onFailure, onSuccess) =>
      args.map((el): boolean => el.isSuccess()).reduce((p, c) => p && c, true)
        ? onSuccess(...(args as OnlySuccesses<T>))
        : onFailure(...(args as T));
  }
}

export const repositorySuccess = <S>(s: S | Array<S>): RepositoryReturn<S> => {
  return new RepositorySuccess(s);
};

export const repositoryFailure = <S>(f: Error): RepositoryReturn<S> => {
  return new RepositoryFailure(f);
};

export const repositoryNone = <S>(): RepositoryNone<S> => {
  return new RepositoryNone();
};

export class RR extends RepositoryReturnUtils {};
