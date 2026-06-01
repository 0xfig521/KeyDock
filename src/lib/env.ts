// Mirrors validate_env_name in crates/keydock-core/src/storage.rs:716-727.
// Rules: non-empty, only [A-Z0-9_], must NOT start with a digit.
// (The Rust impl: c == '_' || c.is_ascii_uppercase() || c.is_ascii_digit() && i > 0)

const ENV_NAME_RE = /^[A-Z_][A-Z0-9_]*$/

export function isValidEnvName(name: string): boolean {
  return ENV_NAME_RE.test(name)
}

export function validateEnvName(name: string): void {
  if (!isValidEnvName(name)) {
    throw new Error(`invalid env name: ${name}`)
  }
}

export function normalizeEnvName(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9_]/g, "")
}
