# Result

`Result<F, S>` represents the outcome of a computation that may either succeed
or fail.

- `Success<S>` → successful result
- `Failure<F>` → failure with an error value

It is ideal for modeling validation, parsing, IO, and API boundaries.

---

## Motivation

`Result` makes failure:
- explicit
- typed
- composable

Unlike exceptions, failures are values that can be inspected,
transformed, and propagated safely.

---

## Creating Results

```ts
const ok = success<number, string>("done");
const err = failure<string, number>("invalid");
````

---

## Pattern Matching

```ts
res.match(
  err => console.error(err),
  val => console.log(val)
);
```

Both branches must be handled.

---

## Mapping

```ts
success(10).map(x => x * 2); // Success(20)
failure("err").map(x => x); // Failure("err")
```

Returning a `Result` inside `map` automatically flattens.

---

## Flattening

```ts
success(success(1)).flatten(); // Success(1)
failure(failure("e")).flatten(); // Failure("e")
```

Nested results are collapsed while preserving all error information.

---

## Async Interop

### `promiseFlaten`

```ts
await success(Promise.resolve(5)).promiseFlaten();
// Success(5)

await failure(Promise.resolve("err")).promiseFlaten();
// Failure("err")
```

---

## Combining Results

### `ResultUtils.all`

```ts
ResultUtils.all(a, b, c)(
  errs => errs,
  ([ra, rb, rc]) => ra.value + rb.value + rc.value
);
```

The success branch runs **only if all results succeed**.

---

## Laws

* Mapping preserves failures
* Success identity: `success(x).map(f)` ≡ `success(f(x))`
* Failure propagation is guaranteed

---

## When to Use

Use `Result` when:

* Failure is expected and meaningful
* You want explicit error handling
* Exceptions are undesirable or unsafe

---
