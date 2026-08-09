# Architecture

The Manifest V3 service worker owns OAuth, Gmail API calls, classification,
local settings, correction learning, and writes. The popup is an unprivileged
review surface that communicates through extension messages.

The connected adapter uses `chrome.identity.getAuthToken` and the Gmail REST API.
The dry-run path lists at most 20 recent non-trash message IDs, then requests
metadata headers and snippets. The write path accepts only the exact message IDs
and labels selected in the popup.

Classification combines transparent rules with a multinomial Naive Bayes model
compiled from Rust to WebAssembly. Corrections update token counts in
`chrome.storage.local`; the personal model is chosen only above a configurable
confidence threshold. No generalized training or remote inference exists.

Mock mode exercises the complete classification and review UI without OAuth.
