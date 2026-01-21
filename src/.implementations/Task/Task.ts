/**
 * Task
 * ----
 * Encodes a lazy asynchronous computation.
 *
 * A Task<A> represents a computation that:
 *  - does not execute eagerly
 *  - may perform asynchronous side effects
 *  - resolves to a value of type A
 *  - may reject with an error
 *
 * Conceptually:
 *   Task<A> ≈ () => Promise<A>
 */

/**
 * Represents a synchronous or asynchronous value.
 */
// deno-lint-ignore-file no-explicit-any
export type PromiseOrNot<T> = T | Promise<T>;

/**
 * Task monad.
 *
 * Execution is deferred until `run()` is called.
 */
export class Task<A> {
  /** Internal suspended async computation */
  private readonly thunk: () => Promise<A>;

  constructor(thunk: () => Promise<A>) {
    this.thunk = thunk;
  }

  /**
   * Executes the Task.
   *
   * This is the *only* place where effects occur.
   */
  run(): Promise<A> {
    return this.thunk();
  }

  /**
   * Functor map.
   *
   * Transforms the successful result of the Task.
   * Errors are propagated unchanged.
   */
  map<B>(f: (a: A) => B): Task<B> {
    return new Task(() => this.run().then(f));
  }

  /**
   * Monad bind / flatMap.
   *
   * Sequences dependent asynchronous computations.
   */
  flatMap<B>(f: (a: A) => Task<B>): Task<B> {
    return new Task(() => this.run().then(a => f(a).run()));
  }

  /**
   * Alias for flatMap.
   */
  then<B>(f: (a: A) => Task<B>): Task<B> {
    return this.flatMap(f);
  }

  /**
   * Performs a side effect without altering the value.
   */
  tap(effect: (a: A) => PromiseOrNot<void>): Task<A> {
    return new Task(async () => {
      const value = await this.run();
      await effect(value);
      return value;
    });
  }

  /**
   * Recovers from a rejected Task.
   */
  catch<B = A>(handler: (e: unknown) => PromiseOrNot<B>): Task<A | B> {
    return new Task(() =>
      this.run().catch(e => Promise.resolve(handler(e)))
    );
  }

  /**
   * Lifts a pure value into a resolved Task.
   */
  static of<A>(value: A): Task<A> {
    return new Task(() => Promise.resolve(value));
  }

  /**
   * Lifts an async function into Task.
   */
  static from<A>(thunk: () => Promise<A>): Task<A> {
    return new Task(thunk);
  }

  /**
   * Defers Task creation.
   */
  static defer<A>(thunk: () => Task<A>): Task<A> {
    return new Task(() => thunk().run());
  }

  /**
   * Executes Tasks sequentially, preserving order.
   */
  static all<T extends readonly Task<unknown>[]>(
    ...tasks: T
  ): Task<{ [K in keyof T]: T[K] extends Task<infer A> ? A : never }> {
    return new Task(async () => {
      const results: unknown[] = [];
      for (const task of tasks) {
        results.push(await task.run());
      }
      return results as any;
    });
  }

  /**
   * Executes Tasks in parallel.
   */
  static allParallel<T extends readonly Task<unknown>[]>(
    ...tasks: T
  ): Task<{ [K in keyof T]: T[K] extends Task<infer A> ? A : never }> {
    return new Task(() => Promise.all(tasks.map(t => t.run())) as any);
  }
}

