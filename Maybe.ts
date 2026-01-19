/**
 *  Encapsulates the possible absense of value. An optional value.
 */

import type { Monad, IMatchable } from "./Functional.ts";

export type Maybe<T> = Some<T> | None;

export function isMaybe<T>(obj: T | Maybe<T>): obj is Maybe<T> {
  return obj && typeof obj == `object` && `_tag` in obj && (obj._tag == `Some` || obj._tag == `None`);
}

export interface Some<T> extends Monad<T>, IMatchable {
  value: T;
  _tag: `Some`;
  isNone: () => false;
  match<B, C>(onNone: (value?: never) => B, onSome: (value: T) => C): B | C;
  map<B>(func: (value: T) => B | Maybe<B>): Maybe<B>;
}

export interface None extends Monad<never>, IMatchable {
  _tag: `None`;
  isNone: () => true;
  match<B, C>(onNone: (value?: never) => B, onSome: (value: never) => C): B | C;
  map<B>(func: (value: never) => B | Maybe<B>): Maybe<B>;
}

export const some = <T>(x: T): Some<T> => ({
  _tag: `Some`,
  value: x,
  isNone: () => false,
  match<B, C>(onNone: () => B, onSome: (value: T) => C): B | C {
    onNone;
    return onSome(this.value);
  },
  map<B>(func: (value: T) => B | Maybe<B>): Maybe<B> {
    const res: B | Maybe<B> = func(this.value);
    return isMaybe<B>(res) ? res : some(res);
  }
});

export const none: None & Maybe<never> = {
  _tag: `None`,
  isNone: () => true,
  match<B, C>(onNone: () => B, onSome: (value: never) => C): B | C {
    onSome;
    return onNone();
  },
  map<B>(func: (value: never) => B | Maybe<B>): Maybe<B> {
    func;
    return none;
  }
} as None;

export const isNone = <A>(x: Maybe<A>): x is None => x._tag === `None`;
