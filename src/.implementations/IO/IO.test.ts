import { IO } from "./IO.ts";
import { run_tests, test } from "../../../Test.ts";

test("IO does not execute eagerly", () => {
  let ran = false;

  const io = IO.from(() => {
    ran = true;
    return 1;
  });

  if (ran) throw new Error("IO executed eagerly");
  io.run();
  if (!ran) throw new Error("IO did not execute");
});

test("map transforms result", async () => {
  const io = IO.of(2).map(n => n * 2);
  const result = await io.run();
  if (result !== 4) throw new Error("map failed");
});

test("flatMap sequences computations", async () => {
  const io = IO.of(2)
    .flatMap(n => IO.of(n + 1))
    .flatMap(n => IO.of(n * 2));

  const result = await io.run();
  if (result !== 6) throw new Error("flatMap failed");
});

test("tap performs side-effect without altering value", async () => {
  let side = 0;

  const io = IO.of(3).tap(n => { side = n; });
  const result = await io.run();

  if (side !== 3 || result !== 3) {
    throw new Error("tap failed");
  }
});

test("catch recovers from thrown errors", () => {
  const io = IO.from(() => {
    throw new Error("boom");
  }).catch(() => 42);

  const result = io.run();
  if (result !== 42) throw new Error("catch failed");
});

test("IO.all executes in order", async () => {
  const log: number[] = [];

  const io1 = IO.from(() => log.push(1));
  const io2 = IO.from(() => log.push(2));

  await IO.all(io1, io2).run();

  if (log.join(",") !== "1,2") {
    throw new Error("IO.all order incorrect");
  }
});

run_tests();

