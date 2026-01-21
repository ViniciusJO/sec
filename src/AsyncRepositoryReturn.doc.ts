/**
 * Encodes the asynchronous form of a RepositoryReturn.
 *
 * Conceptually:
 *
 *   AsyncRepositoryReturn<T>
 *     ≈ Promise<RepositoryReturn<T>>
 *     ≈ Promise<Either<Error, Maybe<Array<T>>>>
 *
 * This abstraction allows safe, composable, monadic manipulation of
 * repository-like asynchronous computations without losing:
 * - absence semantics
 * - error semantics
 * - collection semantics
 */

// deno-lint-ignore-file require-await

import type { OnlySuccesses, RepositoryReturn } from "./RepositoryReturn.ts";
import {
  repositoryFailure,
  repositoryNone,
  repositorySuccess,
  unionResolve
} from "./RepositoryReturn.ts";
import { type Result } from "./Result.ts";

/**
 * A value that may or may not be wrapped in a Promise.
 */
export type PromiseOrNot<S> = S | Promise<S>;

/**
 * Extracts the element type from values accepted by AsyncRepositoryReturn.
 */
export type ExtractT<U> =
  U extends null | Error | infer _
    ? U extends RepositoryReturn<infer S>
      ? S
      : U extends Array<infer V>
        ? V
        : Exclude<U, null | Error | Array<unknown> | RepositoryReturn<unknown>>
    : never;

/**
 * Asynchronous wrapper around RepositoryReturn.
 *
 * This class provides an API equivalent to RepositoryReturn,
 * but lifted into Promise space.
 */
export class AsyncRepositoryReturn<S> {
  /** Internal promise holding the RepositoryReturn */
  private promise: PromiseLike<RepositoryReturn<S>>;

  constructor(promise: PromiseLike<RepositoryReturn<S>>) {
    this.promise = promise;
  }

  /** Resolves to true if the result is a success */
  async isSuccess(): Promise<boolean> {
    return this.promise.then(res => res.isSuccess());
  }

  /** Resolves to true if the result is a failure */
  async isFailure(): Promise<boolean> {
    return this.promise.then(res => res.isFailure());
  }

  /** Resolves to true if the result is none */
  async isNone(): Promise<boolean> {
    return this.promise.then(res => res.isNone());
  }

  /**
   * Converts the async repository result into a Result,
   * extracting only the first element.
   */
  async asFirstElementResult(
    whenNone: () => Error | S | S[]
  ): Promise<Result<Error, S>> {
    return this.asResult(whenNone).then(ret => ret.map(els => els[0]));
  }

  /**
   * Converts the async repository result into a Result.
   */
  async asResult(
    whenNone: () => Error | S | S[]
  ): Promise<Result<Error, S[]>> {
    return this.toPromise().then(els => els.asResult(whenNone));
  }

  /** Converts none into failure */
  noneAsFailure<T = S>(value: Error): AsyncRepositoryReturn<T> {
    return this._then(res => res.noneAsFailure<T>(value));
  }

  /** Converts none into success */
  noneAsSuccess(value: Array<S>): AsyncRepositoryReturn<S> {
    return this._then(res => res.noneAsSuccess(value));
  }

  /** Converts failure into none */
  failureAsNone<T = S>(): AsyncRepositoryReturn<T> {
    return this._then(res => res.failureAsNone<T>());
  }

  /**
   * Pattern matching over async repository results.
   *
   * All branches may return values, RepositoryReturn or Promises thereof.
   * Thrown errors are captured as failures.
   */
  match<A, B, C>(
    onNone: () => PromiseOrNot<null | Error | A | Array<A> | RepositoryReturn<A>>,
    onFailure: (f: Error) => PromiseOrNot<null | Error | B | Array<B> | RepositoryReturn<B>>,
    onSuccess: (s: Array<S>) => PromiseOrNot<null | Error | C | Array<C> | RepositoryReturn<C>>
  ): AsyncRepositoryReturn<A | B | C> {
    return ARR.fromPromise(
      this.anyThen(async result => {
        try {
          switch (result._tag) {
            case "none": {
              const ret = onNone();
              return unionResolve(ret instanceof Promise ? await ret : ret);
            }
            case "success": {
              const ret = onSuccess(await this.value as Array<S>);
              return unionResolve(ret instanceof Promise ? await ret : ret);
            }
            case "failure": {
              const ret = onFailure(await this.value as Error);
              return unionResolve(ret instanceof Promise ? await ret : ret);
            }
          }
        } catch (err) {
          return repositoryFailure(err as Error);
        }
      }).catch(err => repositoryFailure(err as Error)) as PromiseLike<RepositoryReturn<A | B | C>>
    );
  }

  /** Maps over the success case */
  map<U>(
    func: (r: Array<S>) => PromiseOrNot<U | RepositoryReturn<U>>
  ): AsyncRepositoryReturn<U> {
    return this.mapSuccess(func);
  }

  /** Maps only over success */
  mapSuccess<U>(
    func: (r: Array<S>) => PromiseOrNot<U | RepositoryReturn<U>>
  ): AsyncRepositoryReturn<U> {
    return this.match(
      async () => repositoryNone<U>(),
      async fail => repositoryFailure<U>(fail),
      func
    );
  }

  /** Maps only over failure */
  mapFailure<U>(
    func: (r: Error) => PromiseOrNot<U | RepositoryReturn<U>>
  ): AsyncRepositoryReturn<U | S> {
    return this.match(
      async () => repositoryNone<U>(),
      func,
      async succ => repositorySuccess(succ)
    );
  }

  /** Maps only over none */
  mapNone<U>(
    func: () => PromiseOrNot<U | RepositoryReturn<U>>
  ): AsyncRepositoryReturn<U | S> {
    return this.match(
      func,
      async fail => repositoryFailure<U>(fail),
      async succ => repositorySuccess(succ)
    );
  }

  /** Maps over each element of a success */
  mapElements<U>(func: (r: S) => U): AsyncRepositoryReturn<U> {
    return this.match(
      async () => repositoryNone<U>(),
      async fail => repositoryFailure<U>(fail),
      async succ => succ.map(func)
    );
  }

  /** Maps only the first element of a success */
  mapFirst<U>(
    func: (r: S) => PromiseOrNot<U | RepositoryReturn<U>>
  ): AsyncRepositoryReturn<U> {
    return this.match(
      async () => repositoryNone<U>(),
      async fail => repositoryFailure<U>(fail),
      async succ => (succ.length > 0 ? func(succ[0]) : [])
    );
  }

  /** Filters elements in a successful collection */
  filter(func: (r: S) => PromiseOrNot<boolean>): AsyncRepositoryReturn<S> {
    return this.match(
      async () => repositoryNone<S>(),
      async fail => repositoryFailure<S>(fail),
      async succ => succ.filter(func)
    );
  }

  /** Creates from a promise of RepositoryReturn */
  static fromPromise<S>(
    promise: PromiseLike<RepositoryReturn<S>>
  ): AsyncRepositoryReturn<S> {
    return new AsyncRepositoryReturn(promise);
  }

  /** Creates from a Result */
  static fromResult<S>(r: Result<Error, S>): AsyncRepositoryReturn<S> {
    return ARR.create(r.value);
  }

  /** Resolves to the underlying RepositoryReturn */
  async toPromise(): Promise<RepositoryReturn<S>> {
    return this.promise;
  }

  /** Resolves to the raw value */
  get value(): Promise<null | Error | Array<S>> {
    return Promise.resolve(this.promise.then(s => s.value));
  }

  /**
   * Monad bind / then.
   *
   * Behaves similarly to Promise.then, but preserves RepositoryReturn semantics.
   */
  then<T>(
    func: (value: RepositoryReturn<S>) =>
      PromiseOrNot<null | Error | T | Array<T> | RepositoryReturn<T>>,
    callback?: (value: Error) =>
      PromiseOrNot<null | Error | T | Array<T> | RepositoryReturn<T>>
  ): AsyncRepositoryReturn<Awaited<T>> {
    return AsyncRepositoryReturn.fromPromise(
      Promise.resolve(this.promise)
        .then(func)
        .catch(callback || (err => { throw err; }))
        .then(s => Promise.resolve(s))
        .then(unionResolve)
    ) as AsyncRepositoryReturn<Awaited<T>>;
  }

  /** Like then, but returns a raw Promise */
  anyThen<T>(
    func: (value: RepositoryReturn<S>) => PromiseOrNot<T>,
    callback?: (value: Error) => PromiseOrNot<T>
  ): Promise<T> {
    return Promise.resolve(this.promise)
      .then(func)
      .catch(callback || (err => { throw err; }));
  }

  /** Handles rejected promises */
  catch<T>(
    func: (value: Error) =>
      | null
      | Error
      | S
      | Array<S>
      | T
      | Array<T>
      | RepositoryReturn<T>
      | Promise<null | Error | T | Array<T> | RepositoryReturn<T>>
  ): AsyncRepositoryReturn<S | T> {
    return AsyncRepositoryReturn.fromPromise(
      Promise.resolve(this.promise).catch(func).then(unionResolve)
    );
  }

  /** Alias for then */
  _then = this.then;
}

/**
 * Type guard for AsyncRepositoryReturn.
 */
export function isAsyncRR<V>(
  obj: V | AsyncRepositoryReturn<V>
): obj is AsyncRepositoryReturn<V> {
  return obj instanceof AsyncRepositoryReturn;
}

/**
 * Utility namespace for AsyncRepositoryReturn.
 */
export abstract class AsyncRepositoryReturnUtils {
  static fromPromise<S>(
    promise: PromiseLike<RepositoryReturn<S>>
  ): AsyncRepositoryReturn<S> {
    return new AsyncRepositoryReturn(promise);
  }

  static fromResult<S>(r: Result<Error, S>): AsyncRepositoryReturn<S> {
    return ARR.create(r.value);
  }

  static success<S>(value: S | Array<S>): AsyncRepositoryReturn<S> {
    return new AsyncRepositoryReturn(
      Promise.resolve(repositorySuccess(value))
    );
  }

  static failure<S>(value: Error): AsyncRepositoryReturn<S> {
    return new AsyncRepositoryReturn(
      Promise.resolve(repositoryFailure(value))
    );
  }

  static none<S>(): AsyncRepositoryReturn<S> {
    return new AsyncRepositoryReturn(
      Promise.resolve(repositoryNone())
    );
  }

  static create<S>(
    value?: null | Error | S | Array<S> | RepositoryReturn<S> | AsyncRepositoryReturn<S>
  ): AsyncRepositoryReturn<S> {
    return !value
      ? AsyncRepositoryReturnUtils.none<S>()
      : value instanceof AsyncRepositoryReturn
        ? value
        : new AsyncRepositoryReturn(Promise.resolve(unionResolve(value)));
  }

  /** Async version of match */
  static match<S, A, B, C>(
    res: AsyncRepositoryReturn<S>
  ) {
    return (onNone, onFailure, onSuccess) =>
      res.match(onNone, onFailure, onSuccess);
  }
}

/**
 * Shorthand alias.
 */
export class ARR extends AsyncRepositoryReturnUtils {}

