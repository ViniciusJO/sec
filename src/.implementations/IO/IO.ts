/**
 * IO
 * --
 * Encodes a lazy side-effectful computation.
 *
 * An IO<A> represents a computation that, when executed,
 * may perform effects and yields a value of type A.
 *
 * Conceptually:
 *   IO<A> ≈ () => A
 *
 * But with:
 *  - controlled execution
 *  - composability
 *  - law-abiding semantics
 */

/**
 * Represents a synchronous or asynchronous value.
 */
// deno-lint-ignore-file no-explicit-any
export type PromiseOrNot<T> = T | Promise<T>;

/**
 * IO monad.
 *
 * The computation is *not* executed until `run()` is called.
 */
export class IO<A> {
  /** Internal suspended computation */
  private readonly thunk: () => PromiseOrNot<A>;

  constructor(thunk: () => PromiseOrNot<A>) {
    this.thunk = thunk;
  }

  /**
   * Executes the IO computation.
   *
   * This is the *only* place where side effects occur.
   */
  run(): PromiseOrNot<A> {
    return this.thunk();
  }

  /**
   * Functor map.
   *
   * Transforms the result of the computation without executing it.
   */
  map<B>(f: (a: A) => B): IO<B> {
    return new IO(() => {
      const v = this.run();
      return v instanceof Promise ? v.then(f) : f(v);
    });
  }

  /**
   * Monad bind / flatMap.
   *
   * Allows sequencing dependent IO computations.
   */
  flatMap<B>(f: (a: A) => IO<B>): IO<B> {
    return new IO(() => {
      const v = this.run();
      return v instanceof Promise
        ? v.then(a => f(a).run())
        : f(v).run();
    });
  }

  /**
   * Alias for flatMap.
   */
  then<B>(f: (a: A) => IO<B>): IO<B> {
    return this.flatMap(f);
  }

  /**
   * Executes a side-effect without changing the value.
   */
  tap(effect: (a: A) => void): IO<A> {
    return this.map(a => {
      effect(a);
      return a;
    });
  }

  /**
   * Maps errors thrown during execution.
   */
  catch<B = A>(handler: (e: unknown) => B): IO<A | B> {
    return new IO<A | B>(() => {
      try { return this.run(); }
      catch (e) { return handler(e); }
    });
  }

  /**
   * Lifts a pure value into IO.
   */
  static of<A>(value: A): IO<A> {
    return new IO(() => value);
  }

  /**
   * Lifts a side-effectful function into IO.
   */
  static from<A>(thunk: () => PromiseOrNot<A>): IO<A> {
    return new IO(thunk);
  }

  /**
   * Suspends an existing IO without executing it.
   */
  static defer<A>(thunk: () => IO<A>): IO<A> {
    return new IO(() => thunk().run());
  }

  /**
   * Sequences multiple IOs, preserving order.
   */
  static all<T extends readonly IO<unknown>[]>(
    ...ios: T
  ): IO<{ [K in keyof T]: T[K] extends IO<infer A> ? A : never }> {
    return new IO(async () => {
      const results: unknown[] = [];
      for (const io of ios) {
        results.push(await io.run());
      }
      return results as any;
    });
  }
}

