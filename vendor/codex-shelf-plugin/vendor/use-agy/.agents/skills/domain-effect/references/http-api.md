# Effect HTTP API Reference

## Quick Reference

| Task | Module | Key Function |
|------|--------|--------------|
| Define API | `HttpApi` | `HttpApi.make("name").add(HttpApiGroup)` |
| Define group | `HttpApiGroup` | `HttpApiGroup.make("name").add(HttpApiEndpoint)` |
| Define endpoint | `HttpApiEndpoint` | `HttpApiEndpoint.get("name")\`/path\`` |
| Implement handlers | `HttpApiBuilder` | `HttpApiBuilder.group(Api, "name", (h) => h.handle(...))` |
| Serve API | `HttpApiBuilder` | `HttpApiBuilder.serve()` |
| Swagger UI | `HttpApiSwagger` | `HttpApiSwagger.layer({ path: "/docs" })` |
| OpenAPI JSON | `HttpApiBuilder` | `HttpApiBuilder.middlewareOpenApi({ path: "/openapi.json" })` |
| Generate spec | `OpenApi` | `OpenApi.fromApi(MyApi)` |
| Annotate endpoint | `OpenApi` | `.annotate(OpenApi.Summary, "...")` |
| Annotate API | `OpenApi` | `.annotate(OpenApi.Title, "...")` |
| Bearer auth | `HttpApiSecurity` | `HttpApiSecurity.bearer` |
| API key auth | `HttpApiSecurity` | `HttpApiSecurity.apiKey({ key, in })` |
| Create router | `HttpRouter` | `HttpRouter.empty.pipe(HttpRouter.get(...))` |
| JSON response | `HttpServerResponse` | `HttpServerResponse.json(data, { status })` |
| Parse JSON body | `HttpServerRequest` | `HttpServerRequest.schemaBodyJson(Schema)` |
| Path params | `HttpRouter` | `HttpRouter.schemaPathParams(Schema)` |
| Query params | `HttpServerRequest` | `HttpServerRequest.schemaSearchParams(Schema)` |
| Middleware | `HttpMiddleware` | `HttpMiddleware.make((app) => ...)` |
| Start server | `NodeHttpServer` | `NodeHttpServer.layer(createServer, { port })` |
| Stream response | `HttpServerResponse` | `HttpServerResponse.stream(stream, { headers })` |
| WebSocket | `Socket` | `Socket.makeWebSocket(url)` |
| File upload | `Multipart` | `HttpApiSchema.Multipart(schema)` |

## Imports

```typescript
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse, HttpMiddleware } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema, Context } from "effect"
import { createServer } from "node:http"
```

## OpenAPI Documentation

The HttpApi framework automatically generates OpenAPI 3.1.0 specifications. Always annotate your APIs for proper documentation.

### Swagger UI Setup

```typescript
import { HttpApiBuilder, HttpApiSwagger } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"

const ServerLive = HttpApiBuilder.serve().pipe(
  // Swagger UI at /docs
  Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
  // OpenAPI JSON at /openapi.json
  Layer.provide(HttpApiBuilder.middlewareOpenApi({ path: "/openapi.json" })),
  Layer.provide(ApiLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
```

### API-Level Annotations

```typescript
import { HttpApi, OpenApi } from "@effect/platform"

const MyApi = HttpApi.make("MyApi")
  .add(UsersGroup)
  .add(ProductsGroup)
  .annotate(OpenApi.Title, "My REST API")
  .annotate(OpenApi.Version, "1.0.0")
  .annotate(OpenApi.Description, `
    A comprehensive API for managing resources.

    ## Authentication
    All endpoints require Bearer token authentication.
  `)
  .annotate(OpenApi.License, { name: "MIT", url: "https://opensource.org/licenses/MIT" })
  .annotate(OpenApi.Servers, [
    { url: "https://api.example.com", description: "Production" },
    { url: "http://localhost:3002", description: "Local development" }
  ])
```

### Group-Level Annotations (OpenAPI Tags)

```typescript
import { HttpApiGroup, OpenApi } from "@effect/platform"

const UsersGroup = HttpApiGroup.make("users")
  .add(getUser)
  .add(createUser)
  .add(listUsers)
  .prefix("/api/v1")
  .annotate(OpenApi.Description, "User management operations")
  .annotate(OpenApi.ExternalDocs, {
    url: "https://docs.example.com/users",
    description: "Detailed user documentation"
  })
```

### Endpoint-Level Annotations

```typescript
import { HttpApiEndpoint, HttpApiSchema, OpenApi } from "@effect/platform"

const userId = HttpApiSchema.param("userId", Schema.NumberFromString)

const getUser = HttpApiEndpoint.get("getUser")`/users/${userId}`
  .addSuccess(User)
  .addError(UserNotFound, { status: 404 })
  .annotate(OpenApi.Summary, "Get user by ID")
  .annotate(OpenApi.Description, `
    Retrieves a user by their unique identifier.
    Returns 404 if the user does not exist.
  `)
  .annotate(OpenApi.Deprecated, false)

const internalMetrics = HttpApiEndpoint.get("metrics", "/_internal/metrics")
  .addSuccess(Schema.Unknown)
  .annotate(OpenApi.Exclude, true)
```

### Schema Annotations for OpenAPI

```typescript
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number.annotations({
    description: "Unique user identifier"
  }),
  name: Schema.String.annotations({
    description: "User's full name",
    examples: ["John Doe", "Jane Smith"]
  }),
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  ).annotations({
    description: "Valid email address",
    examples: ["user@example.com"]
  }),
  role: Schema.Literal("admin", "user", "guest").annotations({
    description: "User's role in the system",
    default: "user"
  }),
  createdAt: Schema.DateTimeUtc.annotations({
    description: "Account creation timestamp"
  })
}).annotations({
  identifier: "User",  // Creates $ref: "#/components/schemas/User"
  title: "User",
  description: "Represents a user in the system"
})
```

### Response Descriptions

```typescript
const getUsers = HttpApiEndpoint.get("getUsers", "/users")
  .addSuccess(
    Schema.Array(User).annotations({
      description: "List of users matching the query criteria"
    }),
    { status: 200 }
  )
  .addError(
    BadRequest.annotations({
      description: "Invalid query parameters provided"
    }),
    { status: 400 }
  )
  .addError(
    Unauthorized.annotations({
      description: "Authentication token is missing or invalid"
    }),
    { status: 401 }
  )
```

### Security Schemes

#### Bearer Token Authentication

```typescript
import { HttpApiMiddleware, HttpApiSecurity, OpenApi } from "@effect/platform"
import { Context, Effect, Layer, Schema } from "effect"

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: number; role: string }>() {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {
  message: Schema.String
}) {}

class BearerAuth extends HttpApiMiddleware.Tag<BearerAuth>()("BearerAuth", {
  failure: Unauthorized,
  provides: CurrentUser,
  security: {
    bearer: HttpApiSecurity.bearer.pipe(
      HttpApiSecurity.annotate(OpenApi.Description, "JWT Bearer token from /auth/login. Expires after 24 hours.")
    )
  }
}) {}

const ProtectedGroup = HttpApiGroup.make("protected")
  .add(protectedEndpoint)
  .middleware(BearerAuth)

const BearerAuthLive = Layer.effect(
  BearerAuth,
  Effect.gen(function* () {
    return {
      bearer: (token) =>
        Effect.gen(function* () {
          const decoded = yield* validateJWT(token)
          return { id: decoded.userId, role: decoded.role }
        })
    }
  })
)
```

#### API Key Authentication

```typescript
class ApiKeyAuth extends HttpApiMiddleware.Tag<ApiKeyAuth>()("ApiKeyAuth", {
  failure: Unauthorized,
  provides: CurrentUser,
  security: {
    apiKey: HttpApiSecurity.apiKey({
      key: "X-API-Key",
      in: "header"
    }).pipe(
      HttpApiSecurity.annotate(OpenApi.Description, "API key for machine-to-machine auth. Generate in dashboard.")
    )
  }
}) {}
```

### Programmatic OpenAPI Spec Generation

```typescript
import { OpenApi } from "@effect/platform"

// Generate OpenAPI spec from HttpApi definition
const spec = OpenApi.fromApi(MyApi)

// Write to file for CI/CD validation
import * as fs from "node:fs"
fs.writeFileSync("openapi.json", JSON.stringify(spec, null, 2))

// Validate with: bunx @stoplight/spectral-cli lint openapi.json
```

### OpenAPI Override and Transform

```typescript
// Override specific OpenAPI properties on an endpoint
const endpoint = HttpApiEndpoint.get("getData", "/data")
  .addSuccess(DataSchema)
  .annotate(OpenApi.Override, {
    operationId: "customOperationId",
    tags: ["custom-tag"],
    "x-custom-extension": "custom-value"
  })

// Transform the entire generated spec
const api = HttpApi.make("MyApi")
  .add(SomeGroup)
  .annotate(OpenApi.Transform, (spec) => ({
    ...spec,
    "x-api-version": "2025-01",
    security: [{ bearerAuth: [] }]
  }))
```

### Complete OpenAPI Example

```typescript
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  HttpApiSwagger,
  OpenApi
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Context, Effect, Layer, Schema } from "effect"
import { createServer } from "node:http"

// ============================================
// Schemas with OpenAPI Annotations
// ============================================

class User extends Schema.Class<User>("User")({
  id: Schema.Number.annotations({ description: "Unique user identifier" }),
  name: Schema.String.annotations({
    description: "User's full name",
    examples: ["John Doe"]
  }),
  email: Schema.String.annotations({ description: "User's email address" }),
  role: Schema.Literal("admin", "user", "guest").annotations({
    description: "User's role in the system"
  }),
  createdAt: Schema.DateTimeUtc.annotations({
    description: "Account creation timestamp"
  })
}) {}

class CreateUserRequest extends Schema.Class<CreateUserRequest>("CreateUserRequest")({
  name: Schema.String.annotations({ description: "User's full name" }),
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  ).annotations({
    description: "Valid email address"
  }),
  role: Schema.optional(Schema.Literal("admin", "user", "guest")).annotations({
    description: "User's role",
    default: "user"
  })
}) {}

class UserNotFound extends Schema.TaggedError<UserNotFound>()("UserNotFound", {
  userId: Schema.Number
}) {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {
  message: Schema.String
}) {}

// ============================================
// Security Middleware
// ============================================

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

class BearerAuth extends HttpApiMiddleware.Tag<BearerAuth>()("BearerAuth", {
  failure: Unauthorized,
  provides: CurrentUser,
  security: {
    bearer: HttpApiSecurity.bearer.pipe(
      HttpApiSecurity.annotate(OpenApi.Description, "JWT Bearer token from /auth/login")
    )
  }
}) {}

// ============================================
// Endpoints with OpenAPI Annotations
// ============================================

const userId = HttpApiSchema.param("userId", Schema.NumberFromString)

const getUser = HttpApiEndpoint.get("getUser")`/users/${userId}`
  .addSuccess(User)
  .addError(UserNotFound.annotations({
    description: "User with the specified ID was not found"
  }), { status: 404 })
  .annotate(OpenApi.Summary, "Get user by ID")
  .annotate(OpenApi.Description, "Retrieves a single user by their unique identifier")

const listUsers = HttpApiEndpoint.get("listUsers", "/users")
  .setUrlParams(Schema.Struct({
    page: Schema.optional(Schema.NumberFromString).annotations({
      description: "Page number (1-indexed)",
      default: 1
    }),
    limit: Schema.optional(Schema.NumberFromString).annotations({
      description: "Items per page",
      default: 20
    })
  }))
  .addSuccess(Schema.Array(User).annotations({
    description: "List of users"
  }))
  .annotate(OpenApi.Summary, "List all users")
  .annotate(OpenApi.Description, "Returns a paginated list of users")

const createUser = HttpApiEndpoint.post("createUser", "/users")
  .setPayload(CreateUserRequest)
  .addSuccess(User, { status: 201 })
  .annotate(OpenApi.Summary, "Create a new user")
  .annotate(OpenApi.Description, "Creates a new user account. Email must be unique.")

const deleteUser = HttpApiEndpoint.del("deleteUser")`/users/${userId}`
  .addSuccess(HttpApiSchema.NoContent)
  .addError(UserNotFound, { status: 404 })
  .annotate(OpenApi.Summary, "Delete a user")

// ============================================
// Group with OpenAPI Tag
// ============================================

const UsersGroup = HttpApiGroup.make("users")
  .add(getUser)
  .add(listUsers)
  .add(createUser)
  .add(deleteUser)
  .middleware(BearerAuth)
  .annotate(OpenApi.Description, "User management operations")
  .annotate(OpenApi.ExternalDocs, {
    url: "https://docs.example.com/users",
    description: "User API documentation"
  })

// ============================================
// API with Full OpenAPI Metadata
// ============================================

const MyApi = HttpApi.make("MyApi")
  .add(UsersGroup)
  .annotate(OpenApi.Title, "My REST API")
  .annotate(OpenApi.Version, "1.0.0")
  .annotate(OpenApi.Description, `
    A comprehensive API for managing users.

    ## Authentication
    All endpoints require Bearer token authentication.
    Obtain tokens via POST /auth/login.
  `)
  .annotate(OpenApi.License, { name: "MIT" })
  .annotate(OpenApi.Servers, [
    { url: "https://api.example.com", description: "Production" },
    { url: "http://localhost:3002", description: "Development" }
  ])

// ============================================
// Implementation
// ============================================

const UsersLive = HttpApiBuilder.group(MyApi, "users", (handlers) =>
  Effect.gen(function* () {
    return handlers
      .handle("getUser", ({ path }) =>
        Effect.succeed(new User({
          id: path.userId,
          name: "John Doe",
          email: "john@example.com",
          role: "user",
          createdAt: new Date()
        }))
      )
      .handle("listUsers", () => Effect.succeed([]))
      .handle("createUser", ({ payload }) =>
        Effect.succeed(new User({
          id: 1,
          name: payload.name,
          email: payload.email,
          role: payload.role ?? "user",
          createdAt: new Date()
        }))
      )
      .handle("deleteUser", () => Effect.void)
  })
)

const BearerAuthLive = Layer.succeed(
  BearerAuth,
  BearerAuth.of({
    bearer: () =>
      Effect.succeed(new User({
        id: 1,
        name: "Auth User",
        email: "auth@example.com",
        role: "admin",
        createdAt: new Date()
      }))
  })
)

// ============================================
// Server with Swagger UI
// ============================================

const ApiLive = HttpApiBuilder.api(MyApi).pipe(
  Layer.provide(UsersLive),
  Layer.provide(BearerAuthLive)
)

const ServerLive = HttpApiBuilder.serve().pipe(
  Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
  Layer.provide(HttpApiBuilder.middlewareOpenApi({ path: "/openapi.json" })),
  Layer.provide(ApiLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

// Swagger UI: http://localhost:3000/docs
// OpenAPI JSON: http://localhost:3000/openapi.json
Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
```

## HttpRouter

### Route Methods

```typescript
const router = HttpRouter.empty.pipe(
  HttpRouter.get("/users", handler),
  HttpRouter.post("/users", handler),
  HttpRouter.put("/users/:id", handler),
  HttpRouter.patch("/users/:id", handler),
  HttpRouter.del("/users/:id", handler),
  HttpRouter.all("/wildcard", handler)
)
```

### Path Parameters

```typescript
const handler = Effect.gen(function* () {
  const params = yield* HttpRouter.params  // { id: "123" }
  return HttpServerResponse.json({ id: params.id })
})

const PathParams = Schema.Struct({
  id: Schema.NumberFromString.pipe(Schema.positive())
})

const handler = Effect.gen(function* () {
  const { id } = yield* HttpRouter.schemaPathParams(PathParams)
  return HttpServerResponse.json({ id })  // id is number
})
```

### Router Composition

```typescript
const usersRouter = HttpRouter.empty.pipe(
  HttpRouter.get("/", listHandler),
  HttpRouter.get("/:id", getHandler)
)

const mainRouter = HttpRouter.empty.pipe(
  HttpRouter.mount("/users", usersRouter),
  HttpRouter.prefixAll("/api/v1")
)
```

## Request Handling

### JSON Body

```typescript
const CreateUser = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  email: Schema.String.pipe(Schema.pattern(/@/))
})

const handler = Effect.gen(function* () {
  const body = yield* HttpServerRequest.schemaBodyJson(CreateUser)
  return HttpServerResponse.json({ user: body }, { status: 201 })
}).pipe(
  Effect.catchTag("ParseError", () =>
    Effect.succeed(HttpServerResponse.json({ error: "Invalid input" }, { status: 400 }))
  )
)
```

### Query Parameters

```typescript
const Query = Schema.Struct({
  page: Schema.NumberFromString.pipe(Schema.optionalWith({ default: () => 1 })),
  limit: Schema.NumberFromString.pipe(Schema.optionalWith({ default: () => 20 })),
  search: Schema.optional(Schema.String)
})

const handler = Effect.gen(function* () {
  const query = yield* HttpServerRequest.schemaSearchParams(Query)
  return HttpServerResponse.json({ page: query.page, limit: query.limit })
})
```

### Headers

```typescript
const Headers = Schema.Struct({
  authorization: Schema.String,
  "x-api-key": Schema.String
})

const handler = Effect.gen(function* () {
  const headers = yield* HttpServerRequest.schemaHeaders(Headers)
  return HttpServerResponse.json({ hasAuth: !!headers.authorization })
})
```

## Response Handling

```typescript
// JSON
HttpServerResponse.json({ data: [] })
HttpServerResponse.json({ id: 1 }, { status: 201 })
HttpServerResponse.json(data, { headers: { "X-Total": "100" } })

// Text
HttpServerResponse.text("Hello")
HttpServerResponse.text("<h1>Hi</h1>", { headers: { "Content-Type": "text/html" } })

// Empty
HttpServerResponse.empty({ status: 204 })

// Add headers
HttpServerResponse.json({ ok: true }).pipe(
  HttpServerResponse.setHeader("Cache-Control", "max-age=300")
)
```

## Middleware

### Custom Middleware

```typescript
const loggingMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const start = Date.now()
    yield* Effect.logInfo(`${request.method} ${request.url}`)
    const response = yield* app
    yield* Effect.logInfo(`Completed in ${Date.now() - start}ms`)
    return response
  })
)

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", handler),
  loggingMiddleware
)
```

### Auth Middleware with Context

```typescript
class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; role: string }>() {}

const authMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const auth = request.headers.authorization
    if (!auth?.startsWith("Bearer ")) {
      return HttpServerResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = { id: "1", role: "admin" }
    return yield* app.pipe(Effect.provideService(CurrentUser, user))
  })
)

const handler = Effect.gen(function* () {
  const user = yield* CurrentUser
  return HttpServerResponse.json({ userId: user.id })
})
```

### Error Handling Middleware

```typescript
const errorMiddleware = HttpMiddleware.make((app) =>
  app.pipe(
    Effect.catchTag("ApiError", (e) =>
      Effect.succeed(HttpServerResponse.json({ error: e.message }, { status: e.statusCode }))
    ),
    Effect.catchAll(() =>
      Effect.succeed(HttpServerResponse.json({ error: "Internal error" }, { status: 500 }))
    )
  )
)
```

## Services in Routes

```typescript
interface UserRepo {
  findById: (id: string) => Effect.Effect<User | null>
}
class UserRepo extends Context.Tag("UserRepo")<UserRepo, UserRepo>() {}

const UserRepoLive = Layer.succeed(UserRepo, {
  findById: (id) => Effect.succeed({ id, name: "John" })
})

const handler = Effect.gen(function* () {
  const { id } = yield* HttpRouter.schemaPathParams(Schema.Struct({ id: Schema.String }))
  const repo = yield* UserRepo
  const user = yield* repo.findById(id)
  if (!user) return HttpServerResponse.json({ error: "Not found" }, { status: 404 })
  return HttpServerResponse.json(user)
})

const HttpLive = HttpServer.serve(router).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.provide(UserRepoLive)
)
```

## Server Bootstrap

```typescript
const router = HttpRouter.empty.pipe(
  HttpRouter.get("/health", Effect.succeed(HttpServerResponse.json({ status: "ok" }))),
  HttpRouter.get("/users", usersHandler),
  HttpMiddleware.logger
)

const ServerLive = NodeHttpServer.layer(createServer, { port: 3000 })

const HttpLive = HttpServer.serve(router).pipe(
  Layer.provide(ServerLive)
)

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Server starting on http://localhost:3002")
  yield* Layer.launch(HttpLive)
})

NodeRuntime.runMain(program)
```

## Complete Example

```typescript
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema, Context, Ref } from "effect"
import { createServer } from "node:http"

const CreateUser = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  email: Schema.String.pipe(Schema.pattern(/@/))
})

const IdParam = Schema.Struct({ id: Schema.NumberFromString })

interface UserService {
  list: () => Effect.Effect<Array<{ id: number; name: string }>>
  create: (data: typeof CreateUser.Type) => Effect.Effect<{ id: number; name: string }>
}
class UserService extends Context.Tag("UserService")<UserService, UserService>() {}

const UserServiceLive = Layer.effect(UserService, Effect.gen(function* () {
  const users = yield* Ref.make<Array<{ id: number; name: string }>>([])
  const nextId = yield* Ref.make(1)
  return {
    list: () => Ref.get(users),
    create: (data) => Effect.gen(function* () {
      const id = yield* Ref.getAndUpdate(nextId, n => n + 1)
      const user = { id, name: data.name }
      yield* Ref.update(users, list => [...list, user])
      return user
    })
  }
}))

const listUsers = Effect.gen(function* () {
  const service = yield* UserService
  const users = yield* service.list()
  return HttpServerResponse.json(users)
})

const createUser = Effect.gen(function* () {
  const body = yield* HttpServerRequest.schemaBodyJson(CreateUser)
  const service = yield* UserService
  const user = yield* service.create(body)
  return HttpServerResponse.json(user, { status: 201 })
}).pipe(
  Effect.catchTag("ParseError", () =>
    Effect.succeed(HttpServerResponse.json({ error: "Invalid input" }, { status: 400 }))
  )
)

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/health", Effect.succeed(HttpServerResponse.json({ status: "ok" }))),
  HttpRouter.get("/users", listUsers),
  HttpRouter.post("/users", createUser)
)

const HttpLive = HttpServer.serve(router).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.provide(UserServiceLive)
)

NodeRuntime.runMain(Effect.gen(function* () {
  yield* Effect.logInfo("Server on http://localhost:3002")
  yield* Layer.launch(HttpLive)
}))
```

## Modern HttpApi Pattern

The declarative HttpApi pattern provides type-safe API definition with automatic OpenAPI generation and client generation.

### Imports

```typescript
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpApiSwagger
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema, Context } from "effect"
import { createServer } from "node:http"
```

### Defining Endpoints

```typescript
const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

class UsersApi extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("list")`/users`
      .addSuccess(Schema.Array(UserSchema))
  )
  .add(
    HttpApiEndpoint.get("get")`/users/${idParam}`
      .addSuccess(UserSchema)
      .addError(ErrorSchema, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("create")`/users`
      .setPayload(CreateUserSchema)
      .addSuccess(UserSchema, { status: 201 })
      .addError(ErrorSchema, { status: 400 })
  )
  .add(
    HttpApiEndpoint.del("delete")`/users/${idParam}`
      .addSuccess(Schema.Void, { status: 204 })
  )
  .prefix("/api/v1") {}

class MyApi extends HttpApi.make("my-api")
  .add(UsersApi)
  .add(ProductsApi) {}
```

### HttpApiEndpoint Methods

```typescript
HttpApiEndpoint.get("name")`/path`
  .setPayload(BodySchema)
  .setUrlParams(QuerySchema)
  .setHeaders(HeadersSchema)
  .addSuccess(ResponseSchema)
  .addSuccess(Schema, { status: 201 })
  .addError(ErrorSchema, { status: 404 })
  .middleware(AuthMiddleware)
  .annotate(OpenApi.Description, "Get user by ID")
```

### Implementing Handlers

```typescript
const UsersApiLive = HttpApiBuilder.group(MyApi, "users", (handlers) =>
  handlers
    .handle("list", () =>
      Effect.gen(function* () {
        const service = yield* UserService
        return yield* service.list()
      })
    )
    .handle("get", ({ path }) =>
      Effect.gen(function* () {
        const service = yield* UserService
        return yield* service.get(path.id)
      })
    )
    .handle("create", ({ payload }) =>
      Effect.gen(function* () {
        const service = yield* UserService
        return yield* service.create(payload)
      })
    )
    .handleRaw("delete", ({ path }) =>
      Effect.gen(function* () {
        const service = yield* UserService
        yield* service.delete(path.id)
        return HttpServerResponse.empty({ status: 204 })
      })
    )
).pipe(Layer.provide(UserServiceLive))
```

> **Always use `Effect.gen` generators for handler bodies**, not pipe chains. This keeps handler code readable and consistent with service method patterns.

### Building and Serving

```typescript
const MyApiLive = HttpApiBuilder.api(MyApi).pipe(
  Layer.provide(UsersApiLive),
  Layer.provide(ProductsApiLive)
)

const ServerLive = HttpApiBuilder.serve().pipe(
  Layer.provide(HttpApiSwagger.layer()),  // Swagger UI at /docs
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(MyApiLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
```

### HttpApiSchema Helpers

```typescript
import { HttpApiSchema } from "@effect/platform"

// Path parameters
HttpApiSchema.param("id", Schema.NumberFromString)
HttpApiSchema.param("slug", Schema.String)

// Response encodings
HttpApiSchema.withEncoding({ kind: "Json" })
HttpApiSchema.withEncoding({ kind: "Text", contentType: "text/plain" })
HttpApiSchema.withEncoding({ kind: "Uint8Array", contentType: "application/octet-stream" })

// Empty responses
HttpApiSchema.Created   // 201 with void body
HttpApiSchema.Accepted  // 202 with void body
HttpApiSchema.NoContent // 204 with void body

// Multipart uploads
HttpApiSchema.Multipart(schema, { maxFileSize: 10 * 1024 * 1024 })
HttpApiSchema.MultipartStream(schema)
```

### Type-Safe API Client

```typescript
import { HttpApiClient, FetchHttpClient, HttpClient, HttpClientRequest } from "@effect/platform"

const program = Effect.gen(function* () {
  const client = yield* HttpApiClient.make(MyApi, {
    baseUrl: "http://localhost:3002",
    transformClient: HttpClient.mapRequest(
      HttpClientRequest.bearerToken("your-token")
    )
  })

  const users = yield* client.users.list()
  const user = yield* client.users.get({ path: { id: 1 } })
  const created = yield* client.users.create({
    payload: { name: "John", email: "john@example.com" }
  })
})

program.pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise)
```

## Multipart Form Handling

### Schema Types

```typescript
import { Multipart, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

// Single file upload (transforms array to single)
Multipart.SingleFileSchema

// Array of persisted files
Multipart.FilesSchema

// Single persisted file validation
Multipart.FileSchema
```

### Multipart with HttpApi

```typescript
const UploadSchema = Schema.Struct({
  name: Schema.String,
  file: Multipart.SingleFileSchema,
  files: Multipart.FilesSchema
})

class FilesApi extends HttpApiGroup.make("files")
  .add(
    HttpApiEndpoint.post("upload")`/upload`
      .setPayload(HttpApiSchema.Multipart(UploadSchema, {
        maxFileSize: 10 * 1024 * 1024,  // 10MB
        maxParts: 5,
        maxTotalSize: 50 * 1024 * 1024
      }))
      .addSuccess(Schema.Struct({ uploaded: Schema.Number }))
  ) {}

const FilesApiLive = HttpApiBuilder.group(FilesApi, "files", (handlers) =>
  handlers.handle("upload", ({ payload }) =>
    Effect.succeed({ uploaded: payload.files.length })
  )
)
```

### Streaming Multipart Uploads

For large files, use MultipartStream to avoid loading into memory:

```typescript
HttpApiEndpoint.post("uploadStream")`/upload-stream`
  .setPayload(HttpApiSchema.MultipartStream(Schema.Struct({
    name: Schema.String
  })))

// Handler receives stream of parts
handlers.handle("uploadStream", ({ payload }) =>
  Effect.gen(function* () {
    // payload is Stream<Multipart.Part, MultipartError>
    const persisted = yield* Multipart.toPersisted(payload)
    return { files: persisted.files.map(f => f.name) }
  })
)
```

## Streaming Responses

### Basic Streaming

```typescript
import { HttpServerResponse } from "@effect/platform"
import { Stream, Schedule } from "effect"

const streamHandler = Effect.gen(function* () {
  const dataStream = Stream.fromIterable(["chunk1", "chunk2", "chunk3"]).pipe(
    Stream.schedule(Schedule.spaced("500 millis")),
    Stream.map((s) => new TextEncoder().encode(s))
  )

  return HttpServerResponse.stream(dataStream, {
    headers: { "Content-Type": "application/octet-stream" }
  })
})
```

### Server-Sent Events (SSE)

```typescript
const sseHandler = Effect.gen(function* () {
  const eventStream = Stream.make("event1", "event2", "event3").pipe(
    Stream.schedule(Schedule.spaced("1 second")),
    Stream.map((event) => {
      // SSE format: data: {...}\n\n
      const sseFormat = `data: ${JSON.stringify({ message: event })}\n\n`
      return new TextEncoder().encode(sseFormat)
    })
  )

  return HttpServerResponse.stream(eventStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
})

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/events", sseHandler)
)
```

### SSE with Named Events

```typescript
const formatSSE = (event: string, data: unknown, id?: string) => {
  let message = ""
  if (id) message += `id: ${id}\n`
  message += `event: ${event}\n`
  message += `data: ${JSON.stringify(data)}\n\n`
  return new TextEncoder().encode(message)
}

const sseWithEvents = Effect.gen(function* () {
  const events = Stream.make(
    formatSSE("user-joined", { user: "Alice" }, "1"),
    formatSSE("message", { text: "Hello" }, "2"),
    formatSSE("user-left", { user: "Alice" }, "3")
  ).pipe(Stream.schedule(Schedule.spaced("1 second")))

  return HttpServerResponse.stream(events, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache"
    }
  })
})
```

### SSE with HttpApi

```typescript
HttpApiEndpoint.get("events")`/events`
  .addSuccess(Schema.String.pipe(
    HttpApiSchema.withEncoding({ kind: "Text", contentType: "text/event-stream" })
  ))

handlers.handleRaw("events", () =>
  Effect.succeed(HttpServerResponse.stream(eventStream, {
    headers: { "Content-Type": "text/event-stream" }
  }))
)
```

## WebSocket Support

### Socket Module

```typescript
import { Socket } from "@effect/platform"
import { NodeSocket } from "@effect/platform-node"

interface Socket {
  run: <_, E, R>(
    handler: (data: Uint8Array) => Effect<_, E, R> | void
  ) => Effect<void, SocketError, R>

  runRaw: <_, E, R>(
    handler: (data: string | Uint8Array) => Effect<_, E, R> | void
  ) => Effect<void, SocketError, R>

  writer: Effect<(chunk: Uint8Array | string | CloseEvent) => Effect<void, SocketError>>
}
```

### Creating WebSocket Connections

```typescript
import { Socket } from "@effect/platform"

const socket = yield* Socket.makeWebSocket("wss://example.com/ws", {
  openTimeout: Duration.seconds(10),
  protocols: ["v1"],
  closeCodeIsError: (code) => code !== 1000
})

yield* socket.run((data) => {
  console.log("Received:", new TextDecoder().decode(data))
})

const write = yield* socket.writer
yield* write("Hello")
yield* write(new Uint8Array([1, 2, 3]))
yield* write(new CloseEvent(1000))
```

### WebSocket as Layer

```typescript
const WebSocketLive = Socket.layerWebSocket("wss://example.com/ws")

const program = Effect.gen(function* () {
  const socket = yield* Socket.Socket
  yield* socket.run((data) => {
    console.log("Message:", data)
  })
}).pipe(Effect.provide(WebSocketLive))
```

### Browser WebSocket

```typescript
import { BrowserSocket } from "@effect/platform-browser"

const WebSocketLive = BrowserSocket.layerWebSocket("wss://example.com/ws")
```

### WebSocket with Bidirectional Communication

```typescript
const wsHandler = Effect.gen(function* () {
  const socket = yield* Socket.makeWebSocket("wss://api.example.com/ws")

  const receiver = yield* Effect.fork(
    socket.run((data) =>
      Effect.gen(function* () {
        const message = JSON.parse(new TextDecoder().decode(data))
        yield* Effect.logInfo(`Received: ${message.type}`)
      })
    )
  )

  const write = yield* socket.writer
  yield* write(JSON.stringify({ type: "subscribe", channel: "updates" }))

  yield* Fiber.join(receiver).pipe(
    Effect.timeout(Duration.minutes(5)),
    Effect.catchAll(() => Effect.void)
  )
})
```

## OpenAPI/Swagger

### Basic Setup

```typescript
import { HttpApiSwagger, OpenApi } from "@effect/platform"

const ServerLive = HttpApiBuilder.serve().pipe(
  Layer.provide(HttpApiSwagger.layer()),  // Swagger UI at /docs
  Layer.provide(MyApiLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)
```

### Custom Path

```typescript
HttpApiSwagger.layer({ path: "/api-docs" })
```

### OpenAPI Annotations

```typescript
import { OpenApi } from "@effect/platform"

HttpApiEndpoint.get("getUser")`/users/${idParam}`
  .annotate(OpenApi.Summary, "Get user by ID")
  .annotate(OpenApi.Description, "Retrieves a user by their unique identifier")
  .annotate(OpenApi.Tags, ["Users"])

HttpApiGroup.make("users")
  .annotate(OpenApi.Description, "User management operations")
```

### Generate OpenAPI Spec Programmatically

```typescript
import { OpenApi } from "@effect/platform"

const spec = OpenApi.fromApi(MyApi)
// spec is the OpenAPI 3.1.0 specification object
```
