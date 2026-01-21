/**
 * Writer Monad
 * Accumulates a log alongside a computed value.
 */

export interface Writer<W, A> {
  value: A;
  log: W;
}

export const Writer = {
  of<W, A>(value: A, empty: W): Writer<W, A> {
    return { value, log: empty };
  },

  map<W, A, B>(wa: Writer<W, A>, f: (a: A) => B): Writer<W, B> {
    return { value: f(wa.value), log: wa.log };
  },

  flatMap<W, A, B>(
    wa: Writer<W, A>,
    f: (a: A) => Writer<W, B>,
    concat: (x: W, y: W) => W
  ): Writer<W, B> {
    const wb = f(wa.value);
    return { value: wb.value, log: concat(wa.log, wb.log) };
  }
};
