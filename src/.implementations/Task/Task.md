# Task Monad

## Overview

`Task<A>` represents a **lazy asynchronous computation** that:

* Is *not executed eagerly*
* Resolves to a value of type `A`
* May fail by rejecting

---

## Mental Model

```ts
Task<A> ≈ () => Promise<A>
```

Side effects are described, not executed.

---

## Why Task?

Without Task:

```ts
const x = fetch(url); // executes immediately
```

With Task:

```ts
const x = Task.from(() => fetch(url));
x.run(); // execution happens here
```

---

## Core API

### Construction

```ts
Task.of(value)
Task.from(() => Promise)
Task.defer(() => Task)
```

### Execution

```ts
task.run()
```

### Composition

| Method             | Description                |
| ------------------ | -------------------------- |
| `map`              | Transform successful value |
| `flatMap`          | Sequence async tasks       |
| `then`             | Alias for flatMap          |
| `tap`              | Run side effect            |
| `catch`            | Recover from rejection     |
| `Task.all`         | Sequential execution       |
| `Task.allParallel` | Parallel execution         |

---

## Laws

### Functor Laws

**Identity**

```ts
task.map(x => x) ≡ task
```

**Composition**

```ts
task.map(f).map(g) ≡ task.map(x => g(f(x)))
```

---

### Monad Laws

**Left Identity**

```ts
Task.of(x).flatMap(f) ≡ f(x)
```

**Right Identity**

```ts
task.flatMap(Task.of) ≡ task
```

**Associativity**

```ts
task.flatMap(f).flatMap(g)
≡ task.flatMap(x => f(x).flatMap(g))
```

✔ Holds for both success and rejection paths.

---

## Error Semantics

* Errors propagate via Promise rejection
* No error encoding in the type
* Use `Result` or `AsyncRepositoryReturn` for typed failures

---

## Common Patterns

### Logging

```ts
Task.of(value).tap(console.log)
```

### Retry / Recovery

```ts
task.catch(() => fallback)
```

### Sequencing

```ts
Task.all(read, parse, write)
```

### Parallelism

```ts
Task.allParallel(a, b, c)
```

---

## Relationship to Other Monads

| Monad                   | Purpose                      |
| ----------------------- | ---------------------------- |
| `IO`                    | Lazy sync/async side effects |
| `Task`                  | Lazy async effects           |
| `Result`                | Typed errors                 |
| `AsyncRepositoryReturn` | Domain-safe async effects    |

---

## Refactoring Ideas

* Add `attempt(): Task<Result<Error, A>>`
* Add `timeout(ms)`
* Add `race(...)`
* Add `retry(n)`

---

## Property-Based Test Ideas

* `map(identity)` preserves value
* `flatMap(Task.of)` is no-op
* `tap` never alters value
* `Task.all` preserves order
* `Task.allParallel` preserves correspondence

---
