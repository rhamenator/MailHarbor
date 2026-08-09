# Mail Harbor

Mail Harbor is a Manifest V3 browser extension for local, review-first mailbox
label suggestions. A Rust WebAssembly classifier learns only from a user's
corrections, deterministic rules remain visible, every suggestion includes an
explanation, and applying labels always requires explicit selection.

The repository works immediately in mock mode with fictional messages. No OAuth
credential, token, mailbox export, or real message is included.

## Build and test

```powershell
cargo install wasm-pack --locked --version 0.15.0
npm run build:wasm
npm test
npm run verify:no-credentials
cargo test --manifest-path ml/Cargo.toml
cargo audit --file ml/Cargo.lock
```

Load `extension` as an unpacked extension to use mock mode.

## Why connected mode needs a restricted scope

The Gmail API's non-sensitive `gmail.labels` scope manages label definitions,
but it cannot inspect messages or attach labels to messages. The
`users.messages.modify` operation requires `gmail.modify`; metadata access is
also restricted. Mail Harbor therefore requests exactly `gmail.modify` and no
broader mail scope.

Connected mode retrieves only sender, subject, and snippet for up to 20 recent
non-trash messages. It does not retrieve bodies, transmit mailbox data to an
application server, auto-run in the background, delete mail, send mail, bypass
CAPTCHA, or apply an unreviewed suggestion.

To test connected mode, create a new Google Cloud development project and a
Chrome Extension OAuth client for the unpacked extension ID, enable the Gmail
API, add only test users, and replace the manifest placeholder with the public
client ID. Do not download or place a client-secret JSON file in this project.
Chrome extension clients use `chrome.identity`; a client secret does not belong
in an extension.

Public distribution requires the OAuth consent configuration, verified domain,
homepage and privacy-policy links, scope justification, demonstration video,
and restricted-scope review described in [Verification](docs/VERIFICATION.md).
Processing and personalized learning remain local, which avoids transmitting or
storing restricted Gmail data on an application server; Google makes the final
verification determination.

See [Architecture](docs/ARCHITECTURE.md), [Privacy](docs/PRIVACY.md), and
[Clean-room boundary](docs/CLEAN_ROOM_BOUNDARY.md).
