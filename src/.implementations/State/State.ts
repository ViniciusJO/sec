/**
 * State Monad
 * Models stateful computations in a pure way.
 */

export type State<S, A> = (state: S) => [A, S];

export const State = {
  of<S, A>(a: A): State<S, A> {
    return s => [a, s];
  },

  map<S, A, B>(sa: State<S, A>, f: (a: A) => B): State<S, B> {
    return s => {
      const [a, s1] = sa(s);
      return [f(a), s1];
    };
  },

  flatMap<S, A, B>(sa: State<S, A>, f: (a: A) => State<S, B>): State<S, B> {
    return s => {
      const [a, s1] = sa(s);
      return f(a)(s1);
    };
  }
};
