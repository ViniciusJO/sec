/**
 * Validation Monad
 * Accumulates errors instead of short-circuiting.
 */

export type Validation<E, A> =
  | { _tag: "valid"; value: A }
  | { _tag: "invalid"; errors: E[] };

export const Validation = {
  valid<E, A>(a: A): Validation<E, A> {
    return { _tag: "valid", value: a };
  },

  invalid<E, A = never>(...errors: E[]): Validation<E, A> {
    return { _tag: "invalid", errors };
  },

  map<E, A, B>(va: Validation<E, A>, f: (a: A) => B): Validation<E, B> {
    return va._tag === "valid" ? Validation.valid(f(va.value)) : va;
  },

  ap<E, A, B>(
    vf: Validation<E, (a: A) => B>,
    va: Validation<E, A>
  ): Validation<E, B> {
    if (vf._tag === "invalid" && va._tag === "invalid")
      return Validation.invalid(...vf.errors, ...va.errors);
    if (vf._tag === "invalid") return vf;
    if (va._tag === "invalid") return va;
    return Validation.valid(vf.value(va.value));
  }
};
