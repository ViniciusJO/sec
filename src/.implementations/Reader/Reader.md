### Reader Monad

#### Overview

`Reader<E, A>` represents a computation that **depends on a shared environment** `E` to produce a value `A`.

It allows you to:

* Eliminate explicit dependency passing
* Keep business logic pure
* Model dependency injection functionally

---

### Mental Model

```ts
Reader<E, A> ≈ (env: E) => A
```

The environment:

* Is immutable
* Is provided at execution time
* Is shared across composed computations

---

### Why Reader?

Without Reader:

```ts
function f(env: Env): number {
  return env.x + env.y;
}
```

With Reader:

```ts
const f = new Reader<Env, number>(env => env.x + env.y);
```

Now `f` is:

* Composable
* Testable
* Decoupled from execution

---

### Core API

#### Construction

```ts
Reader.of(value)
Reader.ask()
Reader.asks(f)
new Reader(run)
```

#### Execution

```ts
reader.run(env)
```

#### Composition

| Method    | Description           |
| --------- | --------------------- |
| `map`     | Transform result      |
| `flatMap` | Sequence readers      |
| `then`    | Alias for flatMap     |
| `local`   | Transform environment |

---

### Monad Laws

#### Left Identity

```ts
Reader.of(a).flatMap(f) ≡ f(a)
```

#### Right Identity

```ts
reader.flatMap(Reader.of) ≡ reader
```

#### Associativity

```ts
reader.flatMap(f).flatMap(g)
≡ reader.flatMap(x => f(x).flatMap(g))
```

✔ All laws hold strictly.

---

### Functor Laws

#### Identity

```ts
reader.map(x => x) ≡ reader
```

#### Composition

```ts
reader.map(f).map(g) ≡ reader.map(x => g(f(x)))
```

---

### Common Patterns

#### Dependency Injection

```ts
type Env = { db: DB };

const getUser = new Reader<Env, User>(env => env.db.getUser());
```

---

#### Configuration Access

```ts
const port = Reader.asks<Config, number>(c => c.port);
```

---

#### Environment Adaptation

```ts
reader.local((outer: AppEnv) => outer.config)
```

---

### Integration with Other Monads

| Monad                   | Composition                           |
| ----------------------- | ------------------------------------- |
| `IO`                    | `Reader<E, IO<A>>`                    |
| `Task`                  | `Reader<E, Task<A>>`                  |
| `Result`                | `Reader<E, Result<E, A>>`             |
| `AsyncRepositoryReturn` | `Reader<E, AsyncRepositoryReturn<A>>` |

---

### Reader vs DI Containers

| Reader        | DI Container   |
| ------------- | -------------- |
| Explicit      | Implicit       |
| Type-safe     | Often dynamic  |
| Composable    | Imperative     |
| Test-friendly | Requires mocks |

---

### Refactoring Ideas

* `ReaderTask<E, A>`
* `ReaderResult<E, A>`
* `askWith(default)`
* Environment lenses

---

### Property-Based Test Ideas

* `map(identity)` is identity
* `flatMap(Reader.of)` is identity
* `local(identity)` is identity
* `ask.map(f) ≡ asks(f)`

---

