# SEC - Side Effect as Code

Exploring the concept of "monads" implementing mechanisms to deal with side effects as values. My original goal were to make the `AsyncRepositoryReturn` type to serve as the return type for my persistency repositories. To do so I mainly needed to deal with the following possible side effects that already are addressed by some monads:

- Absense of value (? type anotation: nullability);
- Assyncronicity (Promises and async/await);
- Multiplicity (Array);
- Fallibility (Error values);

If I understand anything about monads it is that it's composition is tricky. So this repo is my attempt at implementing the following types:

1. [`Maybe`](./docs/Maybe.md): Encapsulates the possible absense of value. An optional value. There are some `Some` or `None`;
2. [`Either`](./docs/Either.md): Encapsulates a value of one of two possible types, `Left` or `Right`.
3. [`Result`](./docs/Result.md): Encapsulates a `Success` value or a `Failure` (error).
4. [`RepositoryReturn`](./docs/RepositoryReturn.md): Encapsulates an array, an error or none. `Success<Array>`, `Failure` or `None`;
5. [`AsyncRepositoryReturn`](./docs/AsyncRepositoryReturn.md): Encapsulates a `Promise` of an array, an error or none (`Promise<RepositoryReturn>`).

Click on the names to go to documentation.

> ### Works on [`node`](https://nodejs.org), [`deno`](https://deno.com/) and [`bun`](https://bun.com/)
