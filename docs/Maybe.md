# Maybe

The `Maybe` type represents an optional value — a value that may or may not exist.

It is an explicit, type-safe alternative to `null` and `undefined`, designed for
composable and predictable handling of absence.

---

## Motivation

In many systems, absence is represented implicitly:

```ts
string | null
number | undefined
````

This leads to:

* Scattered null checks
* Runtime errors
* Unclear intent at API boundaries

`Maybe<T>` makes absence **explicit and enforced by the type system**.

---

## Type Overview

```ts
type Maybe<T> = Some<T> | None;
```

* `Some<T>` → wraps a present value
* `None` → represents absence

This is a **discriminated union** using the `_tag` field.

---

## Creating Values

### `some`

```ts
const value = some(42);
```

Wraps a value in a `Some<T>`.

### `none`

```ts
const value = none;
```

Singleton representing absence.

---

## Pattern Matching

Use `match` to exhaustively handle both cases:

```ts
value.match(
  () => "no value",
  v => `value is ${v}`
);
```

This guarantees both branches are handled.

---

## Mapping

### `map`

```ts
const result =
  some(2)
    .map(x => x * 10)
    .map(x => x + 1);
```

#### Key behavior

* If the mapping function returns a raw value → it is wrapped in `Some`
* If it returns a `Maybe` → it is returned directly (flattened)

```ts
some(10).map(x => none); // => None
```

This makes `map` act similarly to `flatMap` while keeping a minimal API.

---

## Runtime Type Guards

### `isMaybe`

```ts
if (isMaybe(value)) {
  // value is Some | None
}
```

Useful when dealing with:

* Untyped inputs
* External APIs
* Generic containers

### `isNone`

```ts
if (isNone(value)) {
  // value is None
}
```

Prefer this over checking `_tag` manually.

---

## Laws and Guarantees

### Identity

```ts
m.map(x => x) === m
```

### Absence propagation

```ts
none.map(f) === none
```

### No implicit unwrapping

* Values are never extracted without an explicit `match`
* Absence cannot be ignored accidentally

---

## Design Notes

* `None` is a singleton and immutable
* `_tag` is used for efficient discrimination
* `never` is used to statically prevent invalid paths
* The API is intentionally small to remain predictable

---

## When to Use

Use `Maybe` when:

* Absence is a normal, expected outcome
* You want to avoid `null` and `undefined`
* You want explicit, composable control flow

Do **not** use `Maybe` for:

* Exceptional conditions (use `Either` or `Result`)
* Control flow that relies on throwing
