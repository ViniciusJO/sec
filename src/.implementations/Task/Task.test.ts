import { Task } from "./Task.ts";
import { run_tests, test } from "../../../Test.ts";

test("Task is lazy", async () => {
  let ran = false;

  const task = Task.from(async () => {
    ran = true;
    return 1;
  });

  if (ran) throw new Error("Task executed eagerly");

  await task.run();

  if (!ran) throw new Error("Task did not execute");
});

test("map transforms result", async () => {
  const task = Task.of(2).map(n => n * 2);
  const result = await task.run();

  if (result !== 4) throw new Error("map failed");
});

test("flatMap sequences tasks", async () => {
  const task = Task.of(2)
    .flatMap(n => Task.of(n + 1))
    .flatMap(n => Task.of(n * 2));

  const result = await task.run();

  if (result !== 6) throw new Error("flatMap failed");
});

test("tap performs side effects without altering value", async () => {
  let side = 0;

  const task = Task.of(3).tap(n => { side = n; });
  const result = await task.run();

  if (side !== 3 || result !== 3) {
    throw new Error("tap failed");
  }
});

test("catch recovers from rejection", async () => {
  const task = Task.from(async () => {
    throw new Error("boom");
  }).catch(() => 42);

  const result = await task.run();

  if (result !== 42) throw new Error("catch failed");
});

test("Task.all executes sequentially", async () => {
  const log: number[] = [];

  const t1 = Task.from(async () => log.push(1));
  const t2 = Task.from(async () => log.push(2));

  await Task.all(t1, t2).run();

  if (log.join(",") !== "1,2") {
    throw new Error("Task.all order incorrect");
  }
});

test("Task.allParallel executes in parallel", async () => {
  const t1 = Task.of(1);
  const t2 = Task.of(2);

  const result = await Task.allParallel(t1, t2).run();

  if (result[0] !== 1 || result[1] !== 2) {
    throw new Error("Task.allParallel failed");
  }
});

run_tests();
