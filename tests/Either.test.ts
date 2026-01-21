import { test } from "../Test.ts";
import {
  left,
  right,
  isEither,
  type Either,
  EithertUtils
} from "../src/Either.ts";

export function either_tests(): void {

  /* -------------------------------------------------------------------------- */
  /* Construction                                                               */
  /* -------------------------------------------------------------------------- */

  test("right() constructs a Right", () => {
    const r = right<number, number>(10);

    if (!r.isRight()) throw new Error("Expected Right");
    if (r.value !== 10) throw new Error("Incorrect value");
  });

  test("left() constructs a Left", () => {
    const l = left<string, number>("err");

    if (!l.isLeft()) throw new Error("Expected Left");
    if (l.value !== "err") throw new Error("Incorrect value");
  });

  /* -------------------------------------------------------------------------- */
  /* isEither                                                                    */
  /* -------------------------------------------------------------------------- */

  test("isEither detects Left and Right", () => {
    if (!isEither(left("x"))) throw new Error("Left not detected");
    if (!isEither(right(1))) throw new Error("Right not detected");
  });

  test("isEither rejects non-Either values", () => {
    if (isEither({})) throw new Error("False positive");
  });

  /* -------------------------------------------------------------------------- */
  /* match                                                                       */
  /* -------------------------------------------------------------------------- */

  test("match executes correct branch", () => {
    const r = right(5).match(
      () => 0,
      v => v * 2
    );

    if (r !== 10) throw new Error("Right branch failed");

    const l = left("e").match(
      e => e,
      () => "x"
    );

    if (l !== "e") throw new Error("Left branch failed");
  });

  /* -------------------------------------------------------------------------- */
  /* map                                                                         */
  /* -------------------------------------------------------------------------- */

  test("map transforms Right", () => {
    const r = right(2).map(x => x + 3);

    if (!r.isRight() || r.value !== 5) {
      throw new Error("Map on Right failed");
    }
  });

  test("map preserves Left", () => {
    const l = left("err").map(() => 123);

    if (!l.isLeft() || l.value !== "err") {
      throw new Error("Map on Left must be a no-op");
    }
  });

  /* -------------------------------------------------------------------------- */
  /* flatten                                                                     */
  /* -------------------------------------------------------------------------- */

  test("flatten collapses nested Right", () => {
    const r = right(right(10)).flatten();

    if (!r.isRight() || r.value !== 10) {
      throw new Error("Flatten failed");
    }
  });

  test("flatten collapses nested Left", () => {
    const l = left(left("err")).flatten();

    if (!l.isLeft() || l.value !== "err") {
      throw new Error("Flatten failed");
    }
  });

  /* -------------------------------------------------------------------------- */
  /* promiseFlaten                                                               */
  /* -------------------------------------------------------------------------- */

  test("promiseFlaten resolves promised Right", async () => {
    const r = await right(Promise.resolve(5)).promiseFlaten();

    if (!r.isRight() || r.value !== 5) {
      throw new Error("promiseFlaten failed");
    }
  });

  /* -------------------------------------------------------------------------- */
  /* EithertUtils.all                                                            */
  /* -------------------------------------------------------------------------- */

  test("EithertUtils.all executes right branch only if all succeed", () => {
    const a = right(1);
    const b = right(2);

    const res = EithertUtils.all(a, b)(
      () => "fail",
      (ra, rb) => ra.value + rb.value
    );

    if (res !== 3) throw new Error("all() success branch failed");
  });

  test("EithertUtils.all executes left branch if any fail", () => {
    const a: Either<string, number> = right(1);
    const b: Either<string, number> = left("err");

    const res = EithertUtils.all(a, b)(
      () => "fail",
      () => "ok"
    );

    if (res !== "fail") throw new Error("all() failure branch failed");
  });
}
