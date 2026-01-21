import { test } from "./Test.ts";
import { State } from "./State.ts";

test("State updates state", () => {
  const inc: State<number, number> = s => [s, s + 1];
  const [v, s] = inc(0);
  if (v !== 0 || s !== 1) throw new Error("State failed");
});
