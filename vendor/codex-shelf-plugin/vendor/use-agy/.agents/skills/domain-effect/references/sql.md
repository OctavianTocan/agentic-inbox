# Effect SQL Reference

> **For schema design, migrations, and tenant/RLS patterns, see your database package conventions.** This reference covers the Effect SQL APIs from `effect/unstable/sql` (transactions, batching, unsafe queries, `sql` template tag).

## Quick Reference

| Pattern | Example |
|---------|---------|
| `PgClient.layer` | `PgClient.layer({ database, host, username, password: Redacted.make(...) })` |
| `sql\`...\`` | `sql<User>\`SELECT * FROM users WHERE id = ${id}\`` |
| `sql.insert(data)` | `sql\`INSERT INTO users ${sql.insert(data)} RETURNING *\`` |
| `sql.update(data)` | `sql\`UPDATE users SET ${sql.update(data)} WHERE id = ${id}\`` |
| `sql.in("col", arr)` | `sql\`WHERE ${sql.in("id", ids)}\`` |
| `sql.and([...])` | `sql\`WHERE ${sql.and(conditions)}\`` |
| `sql.withTransaction` | `sql.withTransaction(Effect.gen(...))` |

---

## 1. Connection Setup

```typescript
import { PgClient } from "@effect/sql-pg"
import { Config } from "effect"

// From environment
const SqlLive = PgClient.layerConfig({
  database: Config.succeed("my_database"),
  host: Config.string("DB_HOST").pipe(Config.withDefault("localhost")),
  port: Config.number("DB_PORT").pipe(Config.withDefault(5432)),
  username: Config.string("DB_USER"),
  password: Config.redacted("DB_PASSWORD"),
  maxConnections: 20,
  minConnections: 2,
})

// From URL
const SqlLiveUrl = PgClient.layerConfig({ url: Config.string("DATABASE_URL") })
```

---

## 2. Basic Queries

```typescript
import { Effect } from "effect"
import { SqlClient } from "effect/unstable/sql"

const getUsers = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  const users = yield* sql<{ id: number; name: string; email: string }>`
    SELECT id, name, email FROM users WHERE id = ${someId}
  `
  return users
})
```

---

## 3. INSERT / UPDATE

```typescript
const createUser = (user: { name: string; email: string }) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const [created] = yield* sql<User>`INSERT INTO users ${sql.insert(user)} RETURNING *`
    return created
  })

const [users] = yield* sql<User>`INSERT INTO users ${sql.insert(usersArray)} RETURNING *`

const updateUser = (id: number, data: { name?: string }) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const [updated] = yield* sql<User>`
      UPDATE users SET ${sql.update(data)} WHERE id = ${id} RETURNING *
    `
    return updated
  })

// Exclude fields: sql.update(data, ["id", "created_at"])
```

---

## 4. Dynamic WHERE Clauses

```typescript
const filterUsers = (filters: { name?: string; isActive?: boolean }) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const conditions: SqlClient.Fragment[] = []

    if (filters.name) conditions.push(sql`name ILIKE ${"%" + filters.name + "%"}`)
    if (filters.isActive !== undefined) conditions.push(sql`is_active = ${filters.isActive}`)

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.and(conditions)}` : sql``
    return yield* sql<User>`SELECT * FROM users ${whereClause}`
  })

// IN clause - always use sql.in() for arrays
const getUsersByIds = (ids: number[]) => sql<User>`SELECT * FROM users WHERE ${sql.in("id", ids)}`
```

---

## 5. Transactions

```typescript
const transferFunds = (fromId: number, toId: number, amount: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    yield* sql.withTransaction(
      Effect.gen(function* () {
        yield* sql`UPDATE accounts SET balance = balance - ${amount} WHERE user_id = ${fromId}`
        yield* sql`UPDATE accounts SET balance = balance + ${amount} WHERE user_id = ${toId}`
      })
    )
  })

// Nested transactions create savepoints - inner failure doesn't rollback outer
```

---

## 6. Repository Pattern

```typescript
import { Context, Effect, Layer, Option, Schema } from "effect"
import { SqlClient, SqlResolver } from "effect/unstable/sql"

const User = Schema.Struct({ id: Schema.Number, name: Schema.String, email: Schema.String })
type User = Schema.Schema.Type<typeof User>

class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: number) => Effect.Effect<Option.Option<User>>
    readonly create: (data: { name: string; email: string }) => Effect.Effect<User>
  }
>() {}

const makeUserRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  const GetById = yield* SqlResolver.findById("GetUserById", {
    Id: Schema.Number,
    Result: User,
    ResultId: (_) => _.id,
    execute: (ids) => sql`SELECT * FROM users WHERE ${sql.in("id", ids)}`,
  })

  const Insert = yield* SqlResolver.ordered("InsertUser", {
    Request: Schema.Struct({ name: Schema.String, email: Schema.String }),
    Result: User,
    execute: (requests) => sql`INSERT INTO users ${sql.insert(requests)} RETURNING *`,
  })

  return {
    findById: (id: number) => GetById.execute(id),
    create: (data) => Insert.execute(data),
  }
})

const UserRepositoryLive = Layer.effect(UserRepository, makeUserRepository)
```

---

## 7. SqlSchema Helpers

```typescript
import { SqlSchema } from "effect/unstable/sql"

// findAll - Returns ReadonlyArray<A>
const findAllUsers = SqlSchema.findAll({
  Request: Schema.Void,
  Result: User,
  execute: () => sql`SELECT * FROM users`,
})

// findOne - Returns Option<A>
const findUserById = SqlSchema.findOne({
  Request: Schema.Struct({ id: Schema.Number }),
  Result: User,
  execute: (req) => sql`SELECT * FROM users WHERE id = ${req.id}`,
})

// single - Returns A (fails if not found)
// void - Discards result (for DELETE/mutations)
```

---

## 8. Error Handling

```typescript
import { SqlError } from "effect/unstable/sql"

const safeQuery = sql`SELECT * FROM users`.pipe(
  Effect.catchTag("SqlError", (error) => Effect.succeed([]))
)
```

---

## 9. Testing with SQLite

```typescript
import { SqlClient } from "effect/unstable/sql"
import { SqliteClient } from "@effect/sql-sqlite-bun"

const TestSqlLive = SqliteClient.layer({ filename: ":memory:" })

const setupTestDb = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  yield* sql`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT)`
})

const testLayer = Layer.effectDiscard(setupTestDb).pipe(Layer.provideMerge(TestSqlLive))
```

---

## Common Mistakes

```typescript
// BAD - sql() is for identifiers only, not values (injection risk)
sql`WHERE id = ${sql(id)}`
// GOOD - Direct interpolation is parameterized
sql`WHERE id = ${id}`

// BAD - Arrays need sql.in()
sql`WHERE id IN (${ids})`
// GOOD
sql`WHERE ${sql.in("id", ids)}`

// BAD - Related writes without transaction
yield* sql`INSERT INTO users ...`
yield* sql`INSERT INTO profiles ...`
// GOOD - Atomic
yield* sql.withTransaction(Effect.gen(function* () {
  yield* sql`INSERT INTO users ...`
  yield* sql`INSERT INTO profiles ...`
}))
```
