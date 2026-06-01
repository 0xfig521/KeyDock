# KeyDock Security Model

## Storage

- SQLite stores Secret metadata, non-sensitive entry values, and encrypted sensitive entry values.
- Sensitive entry values use field-level XChaCha20-Poly1305 encryption.
- The user creates a master password.
- Argon2id derives a key-encryption key from the master password.
- A random 256-bit data-encryption key encrypts sensitive entries.
- The data-encryption key is encrypted and stored in SQLite metadata.
- While unlocked, the decrypted data-encryption key is held only in app memory.

## Plaintext exposure

Plaintext sensitive entry values are only produced for:

- reveal
- copy
- env export
- command launch

Audit logs record action, target, workspace, env name, and timestamp only. They must never include secret values.

## Clipboard

Desktop quick-copy clears the clipboard on a best-effort 30 second timer. CLI copy waits for the configured timeout and clears the clipboard if it still contains the copied value.

## Export

`keydock export env <workspace>` writes to stdout only. The MVP does not write `.env` files automatically.

## Deferred security-sensitive features

Local HTTP API and provider health checks are intentionally deferred because they expand the attack surface and can cause unplanned third-party API calls.

Touch ID/passkey support is deferred. Touch ID should be implemented as a convenience unlock path for the encrypted data key; the master password remains the recovery/root unlock method. Passkeys are better suited for future cloud identity or sync, not MVP local decryption.
