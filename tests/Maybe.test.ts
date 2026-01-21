// deno-lint-ignore-file no-explicit-any

import { test } from "../Test.ts";
import {
  some,
  none,
  isMaybe,
  isNone,
  type Maybe
} from "../src/Maybe.ts";

export function maybe_tests(): void {

  /* -------------------------------------------------------------------------- */
  /* Construction                                                               */
  /* -------------------------------------------------------------------------- */

  test("some() constructs a Some value", () => {
    const m = some(123);

    if (m._tag !== "Some") throw new Error("Expected _tag === 'Some'");
    if (m.value !== 123) throw new Error("Incorrect wrapped value");
    if (m.isNone() !== false) throw new Error("Some.isNone() must return false");
  });

  test("none is a None value", () => {
    if (none._tag !== "None") throw new Error("Expected _tag === 'None'");
    if (none.isNone() !== true) throw new Error("None.isNone() must return true");
  });

  /* -------------------------------------------------------------------------- */
  /* isMaybe                                                                     */
  /* -------------------------------------------------------------------------- */

  test("isMaybe returns true for Some", () => {
    if (!isMaybe(some(1))) throw new Error("Expected Some to be a Maybe");
  });

  test("isMaybe returns true for None", () => {
    if (!isMaybe(none)) throw new Error("Expected None to be a Maybe");
  });

  test("isMaybe returns false for non-Maybe values", () => {
    const values = [null, undefined, 0, "", {}, { _tag: "Other" }];

    for (const v of values) {
      if (isMaybe(v as any)) {
        throw new Error(`Expected isMaybe(${String(v)}) to be false`);
      }
    }
  });

  /* -------------------------------------------------------------------------- */
  /* isNone                                                                      */
  /* -------------------------------------------------------------------------- */

  test("isNone returns true only for None", () => {
    if (!isNone(none)) throw new Error("Expected isNone(none) === true");
    if (isNone(some(0))) throw new Error("Expected isNone(Some) === false");
  });

  /* -------------------------------------------------------------------------- */
  /* match                                                                       */
  /* -------------------------------------------------------------------------- */

  test("Some.match calls onSome branch", () => {
    const m = some(10);

    const result = m.match(
      () => "none",
      v => v * 2
    );

    if (result !== 20) throw new Error("onSome branch not executed correctly");
  });

  test("None.match calls onNone branch", () => {
    const result = none.match(
      () => "none",
      () => "some"
    );

    if (result !== "none") throw new Error("onNone branch not executed");
  });

  /* -------------------------------------------------------------------------- */
  /* map (Some)                                                                  */
  /* -------------------------------------------------------------------------- */

  test("Some.map transforms the wrapped value", () => {
    const m = some(5).map(x => x + 1);

    if (m._tag !== "Some") throw new Error("Expected result to be Some");
    if (m.value !== 6) throw new Error("Incorrect mapped value");
  });

  test("Some.map wraps raw return values in Some", () => {
    const m = some(3).map(x => x * 3);

    if (m._tag !== "Some") throw new Error("Expected result to be Some");
    if (m.value !== 9) throw new Error("Expected wrapped value");
  });

  test("Some.map flattens returned Maybe values", () => {
    const m = some(10).map(x => (x > 5 ? none : some(x)));

    if (m._tag !== "None") throw new Error("Expected flattening to None");
  });

  /* -------------------------------------------------------------------------- */
  /* map (None)                                                                  */
  /* -------------------------------------------------------------------------- */

  test("None.map always returns None", () => {
    const m = none.map(() => {
      throw new Error("map function should not be executed");
    });

    if (m !== none) throw new Error("None.map must return the same None");
  });

  /* -------------------------------------------------------------------------- */
  /* Laws / invariants                                                           */
  /* -------------------------------------------------------------------------- */

  test("Identity law: m.map(x => x) === m (structurally)", () => {
    const a = some(42);
    const b = a.map(x => x);

    if (b._tag !== "Some" || b.value !== 42) {
      throw new Error("Identity law violated for Some");
    }

    const c = none.map(x => x);
    if (c !== none) throw new Error("Identity law violated for None");
  });

  test("Absence propagation: mapping over None does nothing", () => {
    const m: Maybe<number> = none;

    const r = m.map((x: number) => x + 1);

    if (r !== none) throw new Error("None should propagate through map");
  });

}
