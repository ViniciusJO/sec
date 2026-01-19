// Defines Unary Operation
export interface Magma<T> {
  concat: (a: T, b: T) => T;
}

// Defines Unary Associative Operation
export interface Semigroup<T> extends Magma<T> {} // Concat is associative

// Defines existence of neutral element such as the unary operation with A return A
export interface Monoid<T> extends Semigroup<T> {
  empty: T; // empty is the neutral element of Semigroup<T>, so: concat(T, empty) = T
}

export interface Monad<T> {
  _tag: string;
  value: T;
  // isBindable: () => boolean;
}

export interface IMatchable {
  match<A, B>(onFirst: (value: unknown) => A, onSecond: (value: unknown) => B): A | B;
  // bind<B>(func: (value: unknown) => B): B;
}

export function isMonad<V>(obj: V | Monad<V>): obj is Monad<V> {
  return obj && typeof obj == `object` && `_tag` in obj && `value` in obj;
}
