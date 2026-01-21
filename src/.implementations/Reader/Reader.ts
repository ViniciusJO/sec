/**
 * Reader Monad
 * ------------
 * Encodes a computation that depends on a shared, immutable environment.
 *
 * A Reader<E, A> represents a function:
 *
 *   (env: E) => A
 *
 * It is used to:
 *  - model dependency injection
 *  - avoid passing configuration explicitly
 *  - keep functions pure and testable
 *
 * Reader is lazy and side-effect free by construction.
 */

/**
 * Reader<E, A>
 *
 * @typeParam E - Environment / dependency type
 * @typeParam A - Result type
 */
export class Reader<E, A> {
  /** Internal computation */
  private readonly runFn: (env: E) => A;

  constructor(run: (env: E) => A) {
    this.runFn = run;
  }

  /**
   * Executes the Reader with the provided environment.
   */
  run(env: E): A {
    return this.runFn(env);
  }

  /**
   * Functor map.
   *
   * Transforms the result while preserving the environment.
   */
  map<B>(f: (a: A) => B): Reader<E, B> {
    return new Reader(env => f(this.run(env)));
  }

  /**
   * Monad bind / flatMap.
   *
   * Allows sequencing computations that depend on the same environment.
   */
  flatMap<B>(f: (a: A) => Reader<E, B>): Reader<E, B> {
    return new Reader(env => f(this.run(env)).run(env));
  }

  /**
   * Alias for flatMap.
   */
  then<B>(f: (a: A) => Reader<E, B>): Reader<E, B> {
    return this.flatMap(f);
  }

  /**
   * Transforms the environment before execution.
   *
   * Useful for adapting or narrowing dependencies.
   */
  local<E2>(f: (env: E2) => E): Reader<E2, A> {
    return new Reader(env2 => this.run(f(env2)));
  }

  /**
   * Accesses the entire environment.
   */
  static ask<E>(): Reader<E, E> {
    return new Reader(env => env);
  }

  /**
   * Extracts a specific value from the environment.
   */
  static asks<E, A>(f: (env: E) => A): Reader<E, A> {
    return new Reader(f);
  }

  /**
   * Lifts a pure value into Reader.
   */
  static of<E, A>(value: A): Reader<E, A> {
    return new Reader(() => value);
  }
}

