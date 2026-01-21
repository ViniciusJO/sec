import { run_tests } from "./Test.ts";

import { async_repository_return_tests } from "./tests/AsyncRepositoryReturn.test.ts";
import { either_tests } from "./tests/Either.test.ts";

import { maybe_tests } from "./tests/Maybe.test.ts";
import { repository_return_tests } from "./tests/RepositoryReturn.test.ts";
import { result_tests } from "./tests/Result.test.ts";

maybe_tests();
either_tests();
result_tests();
repository_return_tests();
async_repository_return_tests();

run_tests();

