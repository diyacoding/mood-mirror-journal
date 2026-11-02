# Reliable account isolation

- Replace browser-wide appearance, sticker, audio and reminder settings with UID-scoped settings, loaded before signed-in screens appear. Keep unowned legacy settings intact and unassigned, as requested.
- Remount the complete signed-in experience on account changes; guard subscriptions and delayed results so old moods, pets, connections, profiles and achievements cannot populate a new account.
- Validate pet ownership and connection membership; stop owner resolution from falling back to personal data on connection lookup failures. Preserve current shared-pet behavior and all saved data.
- Scope facial calibration to the signed-in account. Leave the reusable face model and non-personal app resources shared.
- Add account-switch regression tests and exercise two separate Firebase test accounts in the same browser, including themes, stickers, pet creation, refreshes and navigation.

## Technical details
Keep Firebase and existing collections and security rules. No server migration is planned. New local keys use the authenticated UID; legacy keys remain untouched. Record architectural boundaries in AGENTS.md and report test coverage and any unverified cases.