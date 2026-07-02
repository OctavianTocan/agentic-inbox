# Effect Platform Reference

Cross-platform abstractions for file systems, CLI execution, key-value storage, and terminal interaction.

## Quick Reference

| Module | Import | Layer (Node.js) |
|--------|--------|-----------------|
| Command | `Command` from `@effect/platform` | `NodeCommandExecutor.layer` |
| FileSystem | `FileSystem` from `@effect/platform` | `NodeFileSystem.layer` |
| KeyValueStore | `KeyValueStore` from `@effect/platform` | `KeyValueStore.layerMemory` or `layerFileSystem(path)` |
| Terminal | `Terminal` from `@effect/platform` | `NodeTerminal.layer` |
| Path | `Path` from `@effect/platform` | `NodePath.layer` |

---

## Command (CLI Execution)

### Basic Usage

```typescript
import { Command } from "@effect/platform"
import { NodeCommandExecutor, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const output = yield* Command.make("echo", "Hello").pipe(Command.string)

  const lines = yield* Command.make("ls", "-la").pipe(Command.lines)

  const exitCode = yield* Command.make("test", "-f", "file.txt").pipe(Command.exitCode)

  const stream = yield* Command.make("tail", "-f", "log.txt").pipe(Command.streamLines)

  return output
})

program.pipe(Effect.provide(NodeCommandExecutor.layer), NodeRuntime.runMain)
```

### Command Options

```typescript
import { Command } from "@effect/platform"

const withEnv = Command.make("printenv").pipe(
  Command.env({ NODE_ENV: "production", API_KEY: "secret" })
)

const withShell = Command.make("echo", "$HOME").pipe(Command.runInShell(true))

const withStdin = Command.make("cat").pipe(Command.feed("Hello from stdin!"))

const withInherit = Command.make("npm", "install").pipe(
  Command.stderr("inherit"),
  Command.exitCode
)
```

### Process Management

```typescript
import { Command } from "@effect/platform"
import { Effect } from "effect"

const manageProcess = Effect.gen(function* () {
  const process = yield* Command.make("node", "server.js").pipe(Command.start)
  const stdout = process.stdout  // Stream<Uint8Array, PlatformError>
  const exitCode = yield* process.exitCode
  return exitCode
})

const parallel = Effect.all([
  Command.make("npm", "run", "lint").pipe(Command.exitCode),
  Command.make("npm", "run", "test").pipe(Command.exitCode)
], { concurrency: "unbounded" })
```

---

## FileSystem

### Basic Operations

```typescript
import { FileSystem } from "@effect/platform"
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const content = yield* fs.readFileString("./config.json", "utf8")
  yield* fs.writeFileString("./output.txt", "Hello, World!")

  const binary = yield* fs.readFile("./image.png")
  yield* fs.writeFile("./data.bin", new Uint8Array([1, 2, 3]))

  const exists = yield* fs.exists("./config.json")

  yield* fs.remove("./temp.txt")

  return content
})

program.pipe(Effect.provide(NodeFileSystem.layer), NodeRuntime.runMain)
```

### Directory Operations

```typescript
import { FileSystem } from "@effect/platform"
import { Effect } from "effect"

const dirOps = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  yield* fs.makeDirectory("./path/to/nested", { recursive: true })

  const entries = yield* fs.readDirectory("./src")
  const allFiles = yield* fs.readDirectory("./src", { recursive: true })

  yield* Effect.scoped(
    Effect.gen(function* () {
      const tempDir = yield* fs.makeTempDirectoryScoped()
      yield* fs.writeFileString(`${tempDir}/test.txt`, "data")
    })
  )

  yield* fs.remove("./temp-folder", { recursive: true })
})
```

### File Metadata & Copy/Move

```typescript
import { FileSystem } from "@effect/platform"
import { Effect } from "effect"

const fileOps = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const stats = yield* fs.stat("./package.json")
  // stats.size, stats.type ("File" | "Directory"), stats.mtime

  yield* fs.copyFile("./src.txt", "./dest.txt")
  yield* fs.copy("./src", "./backup/src")
  yield* fs.rename("./old.txt", "./new.txt")

  yield* fs.symlink("./target", "./link")
  const target = yield* fs.readLink("./link")
})
```

### Streaming Large Files

```typescript
import { FileSystem } from "@effect/platform"
import { Effect, Stream } from "effect"

const streamOps = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const errorLines = yield* fs.stream("./log.txt").pipe(
    Stream.decodeText(),
    Stream.splitLines,
    Stream.filter((line) => line.includes("ERROR")),
    Stream.runCollect
  )

  const data = Stream.make(
    new TextEncoder().encode("Line 1\n"),
    new TextEncoder().encode("Line 2\n")
  )
  yield* data.pipe(Stream.run(fs.sink("./output.txt")))
})
```

---

## KeyValueStore

### Basic Operations

```typescript
import { KeyValueStore } from "@effect/platform"
import { Effect, Option } from "effect"

const kvOps = Effect.gen(function* () {
  const kv = yield* KeyValueStore.KeyValueStore

  yield* kv.set("user:1", "John Doe")
  const value = yield* kv.get("user:1")  // Option<string>
  const exists = yield* kv.has("user:1")
  const size = yield* kv.size
  yield* kv.remove("user:1")
  yield* kv.clear
})

kvOps.pipe(Effect.provide(KeyValueStore.layerMemory), Effect.runPromise)
```

### File-Based Persistence

```typescript
import { KeyValueStore } from "@effect/platform"
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"

const kvLayer = KeyValueStore.layerFileSystem("./data/kv-store").pipe(
  Layer.provide(NodeFileSystem.layer)
)

const program = Effect.gen(function* () {
  const kv = yield* KeyValueStore.KeyValueStore
  yield* kv.set("config:db", "postgres://localhost:5432")
  return yield* kv.get("config:db")
})

program.pipe(Effect.provide(kvLayer), NodeRuntime.runMain)
```

### Schema-Based Typed Storage

```typescript
import { KeyValueStore } from "@effect/platform"
import { Schema, Effect, Option } from "effect"

const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String
})

const typedKV = Effect.gen(function* () {
  const kv = yield* KeyValueStore.KeyValueStore
  const userStore = kv.forSchema(User)

  yield* userStore.set("user:1", { id: "1", name: "Alice", email: "a@example.com" })
  const user = yield* userStore.get("user:1")  // Option<User>
})
```

### Prefixed Store

```typescript
import { KeyValueStore } from "@effect/platform"
import { Effect } from "effect"

const prefixedOps = Effect.gen(function* () {
  const kv = yield* KeyValueStore.KeyValueStore
  const sessions = kv.prefix("session:")
  const cache = kv.prefix("cache:")

  yield* sessions.set("user1", "token123")  // stores "session:user1"
  yield* cache.set("data", "value")         // stores "cache:data"
})
```

---

## Terminal

### Input/Output

```typescript
import { Terminal } from "@effect/platform"
import { NodeTerminal, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const terminal = yield* Terminal.Terminal

  yield* terminal.display("Enter your name: ")
  const name = yield* terminal.readLine
  yield* terminal.display(`Hello, ${name}!\n`)

  return name
})

program.pipe(Effect.provide(NodeTerminal.layer), NodeRuntime.runMain)
```

### Handle Ctrl+C

```typescript
import { Terminal } from "@effect/platform"
import { Effect } from "effect"

const withInterrupt = Effect.gen(function* () {
  const terminal = yield* Terminal.Terminal

  const input = yield* terminal.readLine.pipe(
    Effect.catchTag("QuitException", () => Effect.succeed("cancelled"))
  )
})
```

### Interactive Prompts

```typescript
import { Terminal } from "@effect/platform"
import { Effect } from "effect"

const confirm = (message: string) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal
    yield* terminal.display(`${message} (y/n): `)
    const input = yield* terminal.readLine
    return input.toLowerCase() === "y"
  })

const prompt = (message: string, defaultValue?: string) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal
    yield* terminal.display(defaultValue ? `${message} [${defaultValue}]: ` : `${message}: `)
    const input = yield* terminal.readLine
    return input.trim() || defaultValue || ""
  })
```

---

## Platform Layers

### Node.js Combined Layer

```typescript
import {
  NodeCommandExecutor, NodeFileSystem, NodePath, NodeTerminal, NodeRuntime
} from "@effect/platform-node"
import { Layer } from "effect"

const NodePlatformLive = Layer.mergeAll(
  NodeCommandExecutor.layer,
  NodeFileSystem.layer,
  NodePath.layer,
  NodeTerminal.layer
)

program.pipe(Effect.provide(NodePlatformLive), NodeRuntime.runMain)
```

---

## Error Handling

```typescript
import { FileSystem } from "@effect/platform"
import { Effect } from "effect"

const safeRead = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const content = yield* fs.readFileString("./config.json").pipe(
    Effect.catchTag("SystemError", (error) =>
      error.reason === "NotFound"
        ? Effect.succeed("{}")
        : Effect.fail(error)
    )
  )
  return content
})
```

---

## Best Practices

1. **Write platform-agnostic code** - Import from `@effect/platform`, provide runtime-specific layers
2. **Use scoped resources** - `makeTempDirectoryScoped()` auto-cleans on scope exit
3. **Stream large files** - Use `fs.stream()` instead of `readFile()` for large data
4. **Handle platform errors** - Catch `SystemError` with specific `reason` checks
5. **Combine layers** - Use `Layer.mergeAll()` to compose platform services

## Multipart uploads (`PersistedFile`)

`@effect/platform` multipart parsing writes each file part to a temp path (`persistedFile.path`). In `Effect.Service` code, **never** import `node:fs` to read those bytes — depend on `FileSystem.FileSystem` instead.

```typescript
import { FileSystem } from '@effect/platform'

// Main.ts — provide once at the app root (Bun)
Layer.provide(BunContext.layer)

// Inside Effect.Service effect block
const fs = yield* FileSystem.FileSystem

// Buffering is fine when uploads are capped (avatars/logos ≤ 5 MiB, session attachments ≤ 10 MiB)
const bytes = yield* fs.readFile(persistedFile.path).pipe(
  Effect.mapError((cause) => new FileError({ cause }))
)
const sizeBytes = bytes.length

// Some sinks accept a Uint8Array directly; others need a re-readable Blob
const blob = new Blob([bytes], { type: persistedFile.contentType })
```

**Layer wiring:** any service that `yield* FileSystem.FileSystem` propagates `FileSystem` as an `R` requirement. Provide `BunContext.layer` (or `BunFileSystem.layer` for FileSystem only) in the app's `Main.ts` and in test layers (`makeFilesServiceLayer`, `makeServiceLayer`, etc.).

**When `node:fs` is still OK:** one-off scripts, codegen, CI actions, Vitest fixtures that set up temp files, build-time readers, and low-level POSIX fd helpers. Effect **services** doing disk I/O should use `FileSystem`.

