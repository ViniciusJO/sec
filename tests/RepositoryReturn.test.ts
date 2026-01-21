// deno-lint-ignore-file no-explicit-any
import { test, assert, assert_equals as assertEquals } from "../Test.ts";
import {
  isRR,
  unionResolve,
  repositorySuccess,
  repositoryFailure,
  repositoryNone,
  RepositoryReturnUtils,
  RR,
} from "../src/RepositoryReturn.ts";


export function repository_return_tests(): void {

  /* -------------------------------------------------------------------------- */
  /* isRR & unionResolve                                                         */
  /* -------------------------------------------------------------------------- */

  test("isRR identifies RepositoryReturn variants", () => {
    assert(isRR(repositorySuccess(1)));
    assert(isRR(repositoryFailure<number>(new Error("err"))));
    assert(isRR(repositoryNone<number>()));

    assert(!isRR(1));
    assert(!isRR([]));
    assert(!isRR(null));
  });

  test("unionResolve wraps raw values correctly", () => {
    assert(unionResolve(1).isSuccess());
    assert(unionResolve([1, 2]).isSuccess());
    assert(unionResolve([]).isNone());
    assert(unionResolve(null).isNone());

    const err = new Error("x");
    const r = unionResolve(err);
    assert(r.isFailure());
    assertEquals((r as any).value, err);
  });

  /* -------------------------------------------------------------------------- */
  /* State predicates                                                            */
  /* -------------------------------------------------------------------------- */

  test("state predicates reflect correct variant", () => {
    const s = repositorySuccess(1);
    const f = repositoryFailure<number>(new Error("e"));
    const n = repositoryNone<number>();

    assert(s.isSuccess());
    assert(!s.isFailure());
    assert(!s.isNone());

    assert(f.isFailure());
    assert(!f.isSuccess());
    assert(!f.isNone());

    assert(n.isNone());
    assert(!n.isSuccess());
    assert(!n.isFailure());
  });

  /* -------------------------------------------------------------------------- */
  /* match                                                                       */
  /* -------------------------------------------------------------------------- */

  test("match dispatches correctly based on state", () => {
    const s = repositorySuccess([1, 2]);
    const f = repositoryFailure<number>(new Error("e"));
    const n = repositoryNone<number>();

    const sm = s.match(
      () => 0,
      () => -1,
      v => v.length
    );
    assert(sm.isSuccess());
    assertEquals((sm as any).value[0], 2);

    const fm = f.match(
      () => 0,
      e => e,
      () => -1
    );
    assert(fm.isFailure());

    const nm = n.match(
      () => 42,
      () => -1,
      () => -1
    );
    assert(nm.isSuccess());
  });

  /* -------------------------------------------------------------------------- */
  /* map variants                                                                */
  /* -------------------------------------------------------------------------- */

  test("map / mapSuccess only affect success", () => {
    const s = repositorySuccess([1, 2, 3]).map(xs => xs.length);
    assert(s.isSuccess());
    assertEquals((s as any).value[0], 3);

    const f = repositoryFailure<number>(new Error("e")).map(xs => xs.length);
    assert(f.isFailure());
  });

  test("mapFailure only affects failure", () => {
    const f = repositoryFailure<number>(new Error("e")).mapFailure(() => 1);
    assert(f.isSuccess());
    assertEquals((f as any).value[0], 1);

    const s = repositorySuccess([1]).mapFailure(() => 2);
    assert(s.isSuccess());
  });

  test("mapNone only affects none", () => {
    const n = repositoryNone<number>().mapNone(() => 10);
    assert(n.isSuccess());
    assertEquals((n as any).value[0], 10);
  });

  /* -------------------------------------------------------------------------- */
  /* Element helpers                                                             */
  /* -------------------------------------------------------------------------- */

  test("mapElements transforms each element", () => {
    const r = repositorySuccess([1, 2, 3]).mapElements(x => x * 2);
    assert(r.isSuccess());
    assertEquals((r as any).value[1], 4);
  });

  test("mapFirst transforms only first element", () => {
    const r = repositorySuccess([1, 2]).mapFirst(x => x + 10);
    assert(r.isSuccess());
    assertEquals((r as any).value[0], 11);
  });

  test("filter removes elements but preserves state", () => {
    const r = repositorySuccess([1, 2, 3]).filter(x => x > 1);
    assert(r.isSuccess());
    assertEquals((r as any).value.length, 2);
  });

  /* -------------------------------------------------------------------------- */
  /* Result interop                                                              */
  /* -------------------------------------------------------------------------- */

  test("asResult converts RepositoryReturn to Result", () => {
    const s = repositorySuccess([1, 2]).asResult(() => []);
    assert(s.isSuccess());

    const f = repositoryFailure<number>(new Error("e")).asResult(() => []);
    assert(f.isFailure());

    const n = repositoryNone<number>().asResult(() => 5);
    assert(n.isSuccess());
    assertEquals((n as any).value.length, 1);
  });

  test("asFirstElementResult extracts first element", () => {
    const r = repositorySuccess([10, 20]).asFirstElementResult(() => 0);
    assert(r.isSuccess());
    assertEquals((r as any).value, 10);
  });

  /* -------------------------------------------------------------------------- */
  /* State conversions                                                           */
  /* -------------------------------------------------------------------------- */

  test("noneAsFailure converts none into failure", () => {
    const err = new Error("x");
    const r = repositoryNone<number>().noneAsFailure(err);
    assert(r.isFailure());
  });

  test("noneAsSuccess converts none into success", () => {
    const r = repositoryNone<number>().noneAsSuccess([1]);
    assert(r.isSuccess());
  });

  test("failureAsNone converts failure into none", () => {
    const r = repositoryFailure<number>(new Error("x")).failureAsNone();
    assert(r.isNone());
  });

  /* -------------------------------------------------------------------------- */
  /* flatten                                                                     */
  /* -------------------------------------------------------------------------- */

  // test("flatten unwraps nested RepositoryReturn", () => {
  //   const nested = repositorySuccess(repositorySuccess(1));
  //   const flat = nested.flatten();
  //   assert(flat.isSuccess());
  //   assertEquals((flat as any).value[0], 1);
  // });

  /* -------------------------------------------------------------------------- */
  /* promiseFlaten                                                               */
  /* -------------------------------------------------------------------------- */

  // test("promiseFlaten resolves promised values", async () => {
  //   const r = repositorySuccess(Promise.resolve([1, 2]));
  //   const flat = await r.promiseFlaten();
  //   assert(flat.isSuccess());
  //   assertEquals((flat as any).value.length, 2);
  // });

  /* -------------------------------------------------------------------------- */
  /* Utilities                                                                   */
  /* -------------------------------------------------------------------------- */

  test("RepositoryReturnUtils.create mirrors unionResolve", () => {
    const r = RepositoryReturnUtils.create(1);
    assert(r.isSuccess());
  });

  test("RepositoryReturnUtils.match works as curried match", () => {
    const r = repositorySuccess([1, 2]);
    const m = RepositoryReturnUtils.match(r)(
      () => 0,
      () => -1,
      v => v.length
    );

    assert(m.isSuccess());
    assertEquals((m as any).value[0], 2);
  });

  test("RR alias exposes RepositoryReturnUtils", () => {
    const r = RR.success(1);
    assert(r.isSuccess());
  });

}
