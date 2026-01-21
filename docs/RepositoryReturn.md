# RepositoryReturn

## Motivation

`RepositoryReturn<T>` models **data-access outcomes** where absence of data is *not* an error, but still meaningful.

It captures **three orthogonal states**:

|     State | Meaning                          |
| --------: | -------------------------------- |
|    `none` | No data available                |
| `success` | One or more values were returned |
| `failure` | An error occurred                |

This avoids overloading `null`, empty arrays, or exceptions.

---

## Type Overview

```ts
RepositoryReturn<T> =
  | RepositoryNone<T>
  | RepositorySuccess<T>
  | RepositoryFailure<T>
```

Conceptually:

```ts
RepositoryReturn<T> ≈ Either<Error, Maybe<Array<T>>>
```

---

## Constructors

### Functional

```ts
repositorySuccess(value: T | T[]): RepositoryReturn<T>
repositoryFailure(error: Error): RepositoryReturn<T>
repositoryNone(): RepositoryReturn<T>
```

### Utilities

```ts
RepositoryReturnUtils.success(...)
RepositoryReturnUtils.failure(...)
RepositoryReturnUtils.none(...)
RepositoryReturnUtils.create(...)
```

`create` / `unionResolve` normalize raw values automatically.

---

## State Introspection

```ts
rr.isSuccess()
rr.isFailure()
rr.isNone()
```

Each acts as a **type guard**.

---

## Pattern Matching

```ts
rr.match(
  onNone,
  onFailure,
  onSuccess
)
```

* Total
* Exception-safe
* Returns a new `RepositoryReturn`

---

## Mapping

### Success

```ts
rr.map(fn)
rr.mapSuccess(fn)
rr.mapElements(fn)
rr.mapFirst(fn)
```

### Failure / None

```ts
rr.mapFailure(fn)
rr.mapNone(fn)
```

---

## Transformations

```ts
rr.noneAsFailure(error)
rr.noneAsSuccess(values)
rr.failureAsNone()
```

---

## Interop with Result

```ts
rr.asResult(() => fallback)
rr.asFirstElementResult(() => fallback)
```

Useful when integrating with error-centric APIs.

---

## Flattening

```ts
rr.flatten()
await rr.promiseFlaten()
```

Supports:

* Nested `RepositoryReturn`
* Async payloads

---

## Monad Laws

* `map` obeys functor laws
* `bind` available via `RepositoryReturnUtils`
* Side-effect safe
* Referentially transparent

---

## Example

```ts
const users =
  repositorySuccess(fetchUsers())
    .filter(u => u.active)
    .mapElements(u => u.name)
    .asResult(() => new Error("No users"));
```

---

## Design Philosophy

* Explicit absence
* No sentinel values
* No implicit exceptions
* Safe composition
* Repository-oriented semantics

---
