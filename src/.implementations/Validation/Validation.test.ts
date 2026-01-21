import { test } from "./Test.ts";
import { Validation } from "./Validation.ts";

test("Validation accumulates errors", () => {
  const v1 = Validation.invalid("e1");
  const v2 = Validation.invalid("e2");
  const vf = Validation.valid((x: number) => x + 1);
  const res = Validation.ap(vf, v1);
  if (res._tag !== "invalid") throw new Error("Expected invalid");
});
