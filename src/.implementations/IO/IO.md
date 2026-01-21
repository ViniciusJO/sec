# IO Monad

## Overview

`IO<A>` represents a **lazy, side-effectful computation** that yields a value of type `A` *when executed*.

Side effects are **described**, not performed, until `run()` is called.

---

## Mental Model

```ts
IO<A> ≈ () => A
IO<A> ≈ suspended effect
```

Execution is explicit and controlled.

---

## Why IO?

Without IO:

```ts
const x = console.log("boom"); // effect happens immediately
```

With IO:

```ts
const x = IO.from(() => console.log("boom")); // safe
x.run(); // effect happens here
```

---

## Core API

### Construction

```ts
IO.of(value)
IO.from(() => effect)
IO.defer(() => io)
```

### Execution

```ts
io.run()
```

### Composition

| Method    | Description           |
| --------- | --------------------- |
| `map`     | Transform result      |
| `flatMap` | Sequence dependent IO |
| `then`    | Alias for flatMap     |
| `tap`     | Run side-effect       |
| `catch`   | Error recovery        |
| `IO.all`  | Sequence multiple IOs |

---

## Laws

### Functor Identity

```ts
io.map(x => x) ≡ io
```

### Functor Composition

```ts
io.map(f).map(g) ≡ io.map(x => g(f(x)))
```

### Monad Laws

**Left Identity**

```ts
IO.of(x).flatMap(f) ≡ f(x)
```

**Right Identity**

```ts
io.flatMap(IO.of) ≡ io
```

**Associativity**

```ts
io.flatMap(f).flatMap(g)
≡ io.flatMap(x => f(x).flatMap(g))
```

✔ Holds under both sync and async execution.

---

## Async Compatibility

IO supports async transparently:

```ts
const io = IO.from(async () => {
  await fetchData();
  return 42;
});
```

---

## Common Patterns

### Logging

```ts
IO.of(value).tap(console.log)
```

### Deferred execution

```ts
const program = IO.defer(() => expensiveIO);
```

### Sequencing effects

```ts
IO.all(readFile, parse, writeFile)
```

---

## Design Notes

* IO **does not swallow errors**
* Exceptions propagate unless caught explicitly
* Execution order is deterministic
* Side effects are localized

---

## Refactoring Suggestions

* Add `bracket` for resource safety
* Add `attempt(): IO<Result<Error, A>>`
* Add `delay(ms)`
* Integrate with `AsyncRepositoryReturn`

---

## Property-Based Test Ideas

* `map(identity)` preserves result
* `flatMap(IO.of)` is no-op
* `tap` never alters value
* `IO.all` preserves order

---
