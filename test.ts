import { ARR } from "./index.ts";

async function test(): Promise<void> {
  const a = ARR.success([ 433, 900, 723 ]);
  const b = ARR.failure(new Error("ERROR"));
  const c = ARR.none();
  let i = 0;
  console.log(`${i++}.\t`, await b);
  console.log(`${i++}.\t`, await c);
  console.log(`${i++}.\t`, await a);
  console.log(`${i++}.\t`, await a.map(e => e.length));
  console.log(`${i++}.\t`, a.map(e => e.length).value);
  console.log(`${i++}.\t`, await a.map(e => e.length).value);
  console.log(`${i++}.\t`, await a.mapElements(e => e/100));
  console.log(`${i++}.\t`, await a.mapFirst(e => e+567).asFirstElementResult(() => 0));
  console.log(`${i++}.\t`, await a.mapFirst(e => e+567).isSuccess());
  console.log(`${i++}.\t`, await a.mapFirst(e => e+567).isFailure());
  console.log(`${i++}.\t`, await a.mapFirst(() => new Error("ERROR")));
  console.log(`${i++}.\t`, await a.mapFirst(() => new Error("ERROR")).isSuccess());
  console.log(`${i++}.\t`, await a.mapFirst(() => new Error("ERROR")).isFailure());
}

test();
