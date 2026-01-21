import { Reader } from "./Reader.ts";
import { run_tests, test } from "../../../Test.ts";

test("Reader.of ignores environment", () => {
  const r = Reader.of<number, number>(10);
  const result = r.run(999);

  if (result !== 10) {
    throw new Error("Reader.of failed");
  }
});

test("Reader.ask returns environment", () => {
  const r = Reader.ask<{ x: number }>();
  const env = { x: 42 };

  const result = r.run(env);

  if (result !== env) {
    throw new Error("Reader.ask failed");
  }
});

test("map transforms result", () => {
  const r = new Reader<{ x: number }, number>(env => env.x).map(x => x * 2);

  const result = r.run({ x: 3 });

  if (result !== 6) {
    throw new Error("map failed");
  }
});

test("flatMap sequences computations with same environment", () => {
  const r = new Reader<{ x: number }, number>(env => env.x)
    .flatMap(x => new Reader(env => x + env.x));

  const result = r.run({ x: 5 });

  if (result !== 10) {
    throw new Error("flatMap failed");
  }
});

test("local transforms environment", () => {
  type Env = { value: number };
  type OuterEnv = { inner: Env };

  const r = new Reader<Env, number>(env => env.value)
    .local<OuterEnv>(env => env.inner);

  const result = r.run({ inner: { value: 7 } });

  if (result !== 7) {
    throw new Error("local failed");
  }
});

test("then is alias for flatMap", () => {
  const r = Reader.of<{ x: number }, number>(2)
    .then(n => new Reader(env => n + env.x));

  const result = r.run({ x: 3 });

  if (result !== 5) {
    throw new Error("then failed");
  }
});

run_tests();
