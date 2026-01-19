/**
 *  Encodes the promise of the absense of value, an error ocurency or an array of type T.
 *
 *  AsyncRepositoryReturn<T> ≈ Promise<RepositoryReturn<T>> ≈ Promise<Either<Error, Maybe<Array<T>>>>
 */

// deno-lint-ignore-file require-await

import type { OnlySuccesses, RepositoryReturn } from "./RepositoryReturn.ts";
import { repositoryFailure, repositoryNone, repositorySuccess, unionResolve } from "./RepositoryReturn.ts";
import { type Result } from "./Result.ts";

export type PromiseOrNot<S> = S | Promise<S>;

export type ExtractT<U> = U extends null | Error | infer _
  ? U extends RepositoryReturn<infer S>
  ? S
  : U extends Array<infer V>
  ? V
  : Exclude<U, null | Error | Array<unknown> | RepositoryReturn<unknown>>
  : never;


export class AsyncRepositoryReturn<S> {
  private promise: PromiseLike<RepositoryReturn<S>>;

  constructor(promise: PromiseLike<RepositoryReturn<S>>) { this.promise = promise; }

  async isSuccess(): Promise<boolean> { return this.promise.then(res => res.isSuccess()); }
  async isFailure(): Promise<boolean> { return this.promise.then(res => res.isFailure()); }
  async isNone(): Promise<boolean> { return this.promise.then(res => res.isNone()); }

  async asFirstElementResult(whenNone: () => Error | S | S[]): Promise<Result<Error, S>>{
    return this.asResult(whenNone).then(ret => ret.map(els => els[0]));
  }

  async asResult(whenNone: () => Error | S | S[]): Promise<Result<Error, S[]>>{
    return this.toPromise().then(els => els.asResult(whenNone));
  }

  noneAsFailure<T=S>(value: Error): AsyncRepositoryReturn<T> {
    return this._then(res => res.noneAsFailure<T>(value));
  };

  noneAsSuccess(value: Array<S>): AsyncRepositoryReturn<S> {
    return this._then(res => res.noneAsSuccess(value));
  };

  failureAsNone<T=S>(): AsyncRepositoryReturn<T> {
    return this._then(res => res.failureAsNone<T>());
  };

  match<A, B, C>(
    onNone: () => PromiseOrNot<null | Error | A | Array<A> | RepositoryReturn<A>>,
    onFailure: (f: Error) => PromiseOrNot<null | Error | B | Array<B> | RepositoryReturn<B>>,
    onSuccess: (s: Array<S>) => PromiseOrNot<null | Error | C | Array<C> | RepositoryReturn<C>>
  ): AsyncRepositoryReturn<A | B | C> {
    //AsyncRepositoryReturn.fromPromise(Promise.resolve(this.promise)


    return ARR.fromPromise(
      this
      .anyThen(async result => {
        try {
          switch (result._tag) {
            case `none`: {
              const ret = onNone();
              return unionResolve(ret instanceof Promise ? await ret : ret);
            }
            case `success`: {
              const ret = onSuccess(await this.value as Array<S>);
              return unionResolve(ret instanceof Promise ? await ret : ret);
            }
            case `failure`: {
              const ret = onFailure(await this.value as Error);
              return unionResolve(ret instanceof Promise ? await ret : ret);
            }
          }
        } catch (err) {
          return repositoryFailure(err as Error);
        }
      })
      .catch(err => repositoryFailure(err as Error)) as PromiseLike<RepositoryReturn<A | B | C>>
    );
  }

  map<U>(func: (r: Array<S>) => PromiseOrNot<U | RepositoryReturn<U>>): AsyncRepositoryReturn<U> { return this.mapSuccess(func); }

  mapSuccess<U>(func: (r: Array<S>) => PromiseOrNot<U | RepositoryReturn<U>>): AsyncRepositoryReturn<U> {
    try {
      return this.match(
        async () => repositoryNone<U>(),
        async (fail) => repositoryFailure<U>(fail),
        func
      );
    } catch (err) {
      return new AsyncRepositoryReturn(Promise.resolve(repositoryFailure(err as Error)));
    }
  }

  mapFailure<U>(func: (r: Error) => PromiseOrNot<U | RepositoryReturn<U>>): AsyncRepositoryReturn<U | S> {
    try {
      return this.match(
        async () => repositoryNone<U>(),
        func,
        async (succ) => repositorySuccess(succ)
      );
    } catch (err) {
      return new AsyncRepositoryReturn(Promise.resolve(repositoryFailure(err as Error)));
    }
  }

  mapNone<U>(func: () => PromiseOrNot<U | RepositoryReturn<U>>): AsyncRepositoryReturn<U | S> {
    try {
      return this.match(
        async () => func(),
        async (fail) => repositoryFailure<U>(fail),
        async (succ) => repositorySuccess(succ)
      );
    } catch (err) {
      return new AsyncRepositoryReturn(Promise.resolve(repositoryFailure(err as Error)));
    }
  }

  mapElements<U>(func: (r: S) => U): AsyncRepositoryReturn<U> {
    try {
      return this.match(
        async () => repositoryNone<U>(),
        async (fail) => repositoryFailure<U>(fail),
        async (succ) => succ.map(func)
      );
    } catch (err) {
      return new AsyncRepositoryReturn(Promise.resolve(repositoryFailure(err as Error)));
    }
  }

  mapFirst<U>(func: (r: S) => PromiseOrNot<U | RepositoryReturn<U>>): AsyncRepositoryReturn<U> {
    try {
      return this.match(
        async () => repositoryNone<U>(),
        async (fail) => repositoryFailure<U>(fail),
        async (succ) => succ.length > 0 ? func(succ[0]) : []
      );
    } catch (err) {
      return new AsyncRepositoryReturn(Promise.resolve(repositoryFailure(err as Error)));
    }
  }

  filter(func: (r: S) => PromiseOrNot<boolean>): AsyncRepositoryReturn<S> {
    try {
      return this.match(
        async () => repositoryNone<S>(),
        async (fail) => repositoryFailure<S>(fail),
        async (succ) => succ.filter(func)
      );
    } catch (err) {
      return new AsyncRepositoryReturn(Promise.resolve(repositoryFailure(err as Error)));
    }
  }

  static fromPromise<S>(promise: PromiseLike<RepositoryReturn<S>>): AsyncRepositoryReturn<S> {
    return new AsyncRepositoryReturn(promise);
  }

  static fromResult<S>(r: Result<Error, S>): AsyncRepositoryReturn<S> {
    return ARR.create(r.value);
  }

  async toPromise(): Promise<RepositoryReturn<S>> {
    return this.promise;
  }

  get value(): Promise<null | Error | Array<S>> {
    return Promise.resolve(this.promise.then(s => s.value));
  }

  then<T>(
    func: (value: RepositoryReturn<S>) => PromiseOrNot<null | Error | T | Array<T> | RepositoryReturn<T>>,
    callback?: (value: Error) => PromiseOrNot<null | Error | T | Array<T> | RepositoryReturn<T>>
  ): AsyncRepositoryReturn<Awaited<T>> {
    return AsyncRepositoryReturn.fromPromise(
      Promise
        .resolve(this.promise)
        .then(func)
        .catch(callback || ((err) => { throw err; }))
        .then(async (s) => await Promise.resolve(s))
        .then(unionResolve)
    ) as AsyncRepositoryReturn<Awaited<T>>;
  }

  anyThen<T>(
    func: (value: RepositoryReturn<S>) => PromiseOrNot<T>,
    callback?: (value: Error) => PromiseOrNot<T>
  ): Promise<T> {
    return Promise
        .resolve(this.promise)
        .then(func)
        .catch(callback || ((err) => { throw err; }));
  }

  catch<T>(func: (value: Error) => null | Error | S | Array<S> | T | Array<T> | RepositoryReturn<T> | Promise<null | Error | T | Array<T> | RepositoryReturn<T>>): AsyncRepositoryReturn<S | T> {
    return AsyncRepositoryReturn.fromPromise(
      Promise.resolve(this.promise).catch(func).then(unionResolve)
    );
  }

  unionResolve(){ this.then(unionResolve) as AsyncRepositoryReturn<ExtractT<Awaited<S>>>; }

  _then = this.then;

  //static success<S>(value: S | Array<S>): AsyncRepositoryReturn<S> {
  //  return new AsyncRepositoryReturn(Promise.resolve(RepositoryReturnUtils.success(value)));
  //}
  //
  //static failure<S>(value: Error): AsyncRepositoryReturn<S> {
  //  return new AsyncRepositoryReturn(Promise.resolve(RepositoryReturnUtils.failure(value)));
  //}
  //
  //static none<S>(): AsyncRepositoryReturn<S> {
  //  return new AsyncRepositoryReturn(Promise.resolve(RepositoryReturnUtils.none()));
  //}
}

type AsyncResult2Result<T extends AsyncRepositoryReturn<unknown>> = T extends AsyncRepositoryReturn<infer S> ? RepositoryReturn<S> : never;
type AsyncResults2Results<T extends Array<AsyncRepositoryReturn<unknown>>> = { [K in keyof T]: AsyncResult2Result<T[K]> };

export function isAsyncRR<V>(obj: V | AsyncRepositoryReturn<V>): obj is AsyncRepositoryReturn<V> {
  return obj && typeof obj == `object` && `_tag` in obj && (obj._tag == `async_success` || obj._tag == `async_failure`);
}

export abstract class AsyncRepositoryReturnUtils {

  static fromPromise<S>(promise: PromiseLike<RepositoryReturn<S>>): AsyncRepositoryReturn<S> {
    return new AsyncRepositoryReturn(promise);
  }

  static fromResult<S>(r: Result<Error, S>): AsyncRepositoryReturn<S> {
    return ARR.create(r.value);
  }

  static success<S>(value: S | Array<S>): AsyncRepositoryReturn<S> {
    return new AsyncRepositoryReturn(Promise.resolve(repositorySuccess(value)));
  }

  static failure<S>(value: Error): AsyncRepositoryReturn<S> {
    return new AsyncRepositoryReturn(Promise.resolve(repositoryFailure(value)));
  }

  static none<S>(): AsyncRepositoryReturn<S> {
    return new AsyncRepositoryReturn(Promise.resolve(repositoryNone()));
  }

  static create<S>(value?: null | Error | S | Array<S> | RepositoryReturn<S> | AsyncRepositoryReturn<S>): AsyncRepositoryReturn<S> {
    return !value
      ? AsyncRepositoryReturnUtils.none<S>()
      : value instanceof AsyncRepositoryReturn
        ? value
        : new AsyncRepositoryReturn(
          Promise.resolve(unionResolve(value))
        );
  }

  static match<S, A, B, C,>(
    res: AsyncRepositoryReturn<S>
  ): (
    onNone: () => Promise<RepositoryReturn<A>>,
    onFailure: (f: Error) => Promise<RepositoryReturn<B>>,
    onSuccess: (s: Array<S>) => Promise<RepositoryReturn<C>>
  ) => AsyncRepositoryReturn<A | B | C> {
    return (onNone, onFailure, onSuccess) => res.match(onNone, onFailure, onSuccess);
  }

  // TODO: fix ALL
  static all<T extends Array<AsyncRepositoryReturn<unknown>>>(
    ...asyncArgs: T
  ): <U extends RepositoryReturn<unknown>, V extends RepositoryReturn<unknown> = U>(
    onFailure: (...args: AsyncResults2Results<T>) => Promise<U>,
    onSuccess: (...args: OnlySuccesses<AsyncResults2Results<T>>) => Promise<V>
  ) => Promise<U | V> {
    const args = Promise.all(asyncArgs.map(el => el.toPromise()));
    return async (onFailure, onSuccess) =>
      args.then(
        async res => res.map((el) => el.isSuccess()).reduce((p, c) => p && c, true)
          ? onSuccess(...(res as OnlySuccesses<AsyncResults2Results<T>>))
          : onFailure(...(res as AsyncResults2Results<T>))
      );
  }

}

export class ARR extends AsyncRepositoryReturnUtils {};
