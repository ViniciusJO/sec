import { test } from "../Test.ts";
import {
  success,
  failure,
  isResult,
  type Result,
  ResultUtils
} from "../src/Result.ts";

export function result_tests(): void {

  /* -------------------------------------------------------------------------- */
  /* Construction                                                               */
  /* -------------------------------------------------------------------------- */

  test("success() constructs a Success", () => {
    const r = success<number, number>(10);

    if (!r.isSuccess()) throw new Error("Expected Success");
    if (r.value !== 10) throw new Error("Incorrect value");
  });

  test("failure() constructs a Failure", () => {
    const r = failure<string, number>("err");

    if (!r.isFailure()) throw new Error("Expected Failure");
    if (r.value !== "err") throw new Error("Incorrect value");
  });

  /* -------------------------------------------------------------------------- */
  /* isResult                                                                    */
  /* -------------------------------------------------------------------------- */

  test("isResult detects Success and Failure", () => {
    if (!isResult(success(1))) throw new Error("Success not detected");
    if (!isResult(failure("x"))) throw new Error("Failure not detected");
  });

  test("isResult rejects non-Result values", () => {
    if (isResult({})) throw new Error("False positive");
  });

  /* -------------------------------------------------------------------------- */
  /* match                                                                       */
  /* -------------------------------------------------------------------------- */

  test("match executes correct branch", () => {
    const s = success(5).match(
      () => 0,
        v => v * 2
    );

    if (s !== 10) throw new Error("Success branch failed");

    const f = failure("e").match(
      e => e,
        () => "x"
    );

    if (f !== "e") throw new Error("Failure branch failed");
  });

  /* -------------------------------------------------------------------------- */
  /* map                                                                         */
  /* -------------------------------------------------------------------------- */

  test("map transforms Success", () => {
    const r = success(2).map(x => x + 3);

    if (!r.isSuccess() || r.value !== 5) {
      throw new Error("Map on Success failed");
    }
  });

  test("map preserves Failure", () => {
    const r = failure("err").map(() => 123);

    if (!r.isFailure() || r.value !== "err") {
      throw new Error("Map on Failure must be a no-op");
    }
  });

  /* -------------------------------------------------------------------------- */
  /* flatten                                                                     */
  /* -------------------------------------------------------------------------- */

  test("flatten collapses nested Success", () => {
    const r = success(success(10)).flatten();

    if (!r.isSuccess() || r.value !== 10) {
      throw new Error("Flatten failed");
    }
  });

  test("flatten collapses nested Failure", () => {
    const r = failure(failure("err")).flatten();

    if (!r.isFailure() || r.value !== "err") {
      throw new Error("Flatten failed");
    }
  });

  /* -------------------------------------------------------------------------- */
  /* promiseFlaten                                                               */
  /* -------------------------------------------------------------------------- */

  test("promiseFlaten resolves promised Success", async () => {
    const r = await success(Promise.resolve(5)).promiseFlaten();

    if (!r.isSuccess() || r.value !== 5) {
      throw new Error("promiseFlaten failed");
    }
  });

  /* -------------------------------------------------------------------------- */
  /* ResultUtils.all                                                             */
  /* -------------------------------------------------------------------------- */

  test("ResultUtils.all executes success branch only if all succeed", () => {
    const a = success(1);
    const b = success(2);

    const res = ResultUtils.all(a, b)(
      () => "fail",
        (ra, rb) => ra.value + rb.value
    );

    if (res !== 3) throw new Error("all() success branch failed");
  });

  test("ResultUtils.all executes failure branch if any fail", () => {
    const a: Result<string, number> = success(1);
    const b: Result<string, number> = failure("err");

    const res = ResultUtils.all(a, b)(
      () => "fail",
        () => "ok"
    );

    if (res !== "fail") throw new Error("all() failure branch failed");
  });

}
