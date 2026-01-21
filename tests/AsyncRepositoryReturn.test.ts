import { test } from "../Test.ts";
import { ARR } from "../src/AsyncRepositoryReturn.ts";
import {
  repositoryFailure,
  repositoryNone,
} from "../src/RepositoryReturn.ts";

export function async_repository_return_tests(): void {
  test("AsyncRepositoryReturn success flow", async () => {
    const arr = ARR.success([1, 2, 3]);

    const mapped = arr.mapElements(x => x * 2);
    const res = await mapped.toPromise();

    if (!res.isSuccess()) throw new Error("Expected success");
    if (res.value[0] !== 2) throw new Error("Map failed");
  });

  test("AsyncRepositoryReturn none propagation", async () => {
    const arr = ARR.none<number>();
    const res = await arr.map(x => x.length).toPromise();

    if (!res.isNone()) throw new Error("Expected none");
  });

  test("AsyncRepositoryReturn failure propagation", async () => {
    const err = new Error("boom");
    const arr = ARR.failure<number>(err);
    const res = await arr.mapElements(x => x).toPromise();

    if (!res.isFailure()) throw new Error("Expected failure");
  });

  test("AsyncRepositoryReturn match branches", async () => {
    const arr = ARR.success([42]);

    const out = await arr.match(
      () => repositoryNone(),
      () => repositoryFailure(new Error()),
      s => s[0] + 1
    ).toPromise();

    if (!out.isSuccess() || out.value[0] !== 43) {
      throw new Error("Match failed");
    }
  });

  test("AsyncRepositoryReturn then chaining", async () => {
    const arr = ARR.success([1]);

    const res = await arr
      .then(r => r.map(v => v[0] + 10))
      .toPromise();

    if (!res.isSuccess() || res.value[0] !== 11) {
      throw new Error("Then chain failed");
    }
  });

}
