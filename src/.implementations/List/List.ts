/**
 * List Monad
 * Represents nondeterministic computations.
 */

export type List<A> = A[];

export const List = {
  of<A>(a: A): List<A> {
    return [a];
  },

  map<A, B>(la: List<A>, f: (a: A) => B): List<B> {
    return la.map(f);
  },

  flatMap<A, B>(la: List<A>, f: (a: A) => List<B>): List<B> {
    return la.flatMap(f);
  }
};
