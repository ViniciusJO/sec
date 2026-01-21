# AsyncRepositoryReturn

## Overview

`AsyncRepositoryReturn<T>` is the asynchronous counterpart of `RepositoryReturn<T>`.

It models **repository-like async operations** where:

* absence of data is meaningful
* errors are explicit
* results may contain multiple values

```ts
AsyncRepositoryReturn<T>
  ≈ Promise<RepositoryReturn<T>>
  ≈ Promise<Either<Error, Maybe<Array<T>>>>
```

---

## Why This Exists

Using `Promise<T | null>` or throwing exceptions conflates:

* transport errors
* absence of data
* empty collections

`AsyncRepositoryReturn` keeps these concerns **orthogonal and composable**.

---

## Construction

```ts
ARR.success(value)
ARR.failure(error)
ARR.none()

ARR.create(value)
ARR.fromPromise(promise)
ARR.fromResult(result)
```

---

## State Inspection

```ts
await arr.isSuccess()
await arr.isFailure()
await arr.isNone()
```

---

## Pattern Matching

```ts
arr.match(
  onNone,
  onFailure,
  onSuccess
)
```

Each branch:

* may return values, RepositoryReturn, or Promises
* exceptions are captured as failures

---

## Mapping

### Success

```ts
arr.map(fn)
arr.mapSuccess(fn)
arr.mapElements(fn)
arr.mapFirst(fn)
```

### Failure / None

```ts
arr.mapFailure(fn)
arr.mapNone(fn)
```

---

## Transformations

```ts
arr.noneAsFailure(err)
arr.noneAsSuccess(values)
arr.failureAsNone()
```

---

## Monad Operations

```ts
arr.then(fn)
arr._then(fn)
```

Behaves like `Promise.then`, but:

* preserves semantic structure
* never loses error / none distinction

---

## Interop

### Convert to Result

```ts
await arr.asResult(fallback)
await arr.asFirstElementResult(fallback)
```

### Extract

```ts
await arr.toPromise()
await arr.value
```

---

## Error Handling

```ts
arr.catch(err => ...)
```

Errors become structured failures, not thrown exceptions.

---

* Referential transparency
* Exception safety
* Explicit absence
* Total pattern matching
* Async-safe monadic composition

---

## Mental Model

> **RepositoryReturn describes “what happened”**
> **AsyncRepositoryReturn describes “what will happen”**

---
