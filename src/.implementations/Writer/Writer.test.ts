import { test } from "./Test.ts";
import { Writer } from "./Writer.ts";

test("Writer accumulates logs", () => {
  const w1 = { value: 1, log: ["a"] };
  const w2 = Writer.flatMap(w1, v => ({ value: v + 1, log: ["b"] }), (a, b) => a.concat(b));
  if (w2.log.length !== 2) throw new Error("Log not accumulated");
});
