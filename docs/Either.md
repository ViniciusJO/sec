# Either

`Either<L, R>` represents a value that can be one of two possibilities:

- `Left<L>`  → failure / error / exceptional case
- `Right<R>` → success / valid result

It is commonly used to model computations that may fail *with a reason*.

---

## Motivation

Unlike `Maybe`, which only represents absence, `Either` preserves *why* something failed.

```ts
Either<Error, number>
Either<string, Config>
````

This makes failure explicit, typed, and composable.

---

## Creating Values

```ts
const ok = right(42);
const err = left("invalid input");
```

---

## Pattern Matching

```ts
value.match(
  err => console.error(err),
  res => console.log(res)
);
```

Both branches must be handled explicitly.

---

## Mapping

```ts
right(10).map(x => x * 2); // Right(20)
left("err").map(x => x);  // Left("err")
```

If the mapping function returns an `Either`, it is flattened automatically.

---

## Flattening

```ts
right(right(10)).flatten(); // Right(10)
left(left("e")).flatten();  // Left("e")
```

Nested `Either` values are collapsed while preserving all error types.

---

## Async Interop

### `promiseFlaten`

```ts
await right(Promise.resolve(5)).promiseFlaten(); // Right(5)
await left(Promise.resolve("err")).promiseFlaten(); // Left("err")
```

---

## Runtime Guards

```ts
if (isEither(value)) {
  value.isRight();
}
```

---

## Utilities

### `EithertUtils.all`

```ts
EithertUtils.all(a, b, c)(
  () => "at least one failed",
  (ra, rb, rc) => ra.value + rb.value + rc.value
);
```

Runs the success branch only if *all* are `Right`.

---

## Laws

* Mapping preserves `Left`
* Right identity: `right(x).map(f)` ≡ `right(f(x))`
* Left propagation is guaranteed

---

## When to Use

Use `Either` when:

* Failure is expected and meaningful
* You want typed error channels
* Exceptions are undesirable

Prefer `Result` when modeling API-style success/failure semantics.

---
