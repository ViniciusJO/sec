import { test } from "./Test.ts";
import { List } from "./List.ts";

test("List flatMap expands", () => {
  const r = List.flatMap([1,2], x => [x, x]);
  if (r.length !== 4) throw new Error("List failed");
});
