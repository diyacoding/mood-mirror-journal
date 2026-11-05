# Account-isolation results

## Causes and corrections
Browser-wide `mm.preferences` and `mm.theme` reused the same theme, sticker, audio and reminder selections for everyone. Preferences also lived in a shared in-memory singleton without an account lifecycle. The old keyed screen wrapper did not remount the hooks or navigation held above it. Delayed subscriptions and achievement results could update obsolete state. Pet resolution swallowed connection lookup errors and resolved the owner twice.

The app now activates UID-scoped settings before publishing a new authenticated session; the whole account experience remounts per UID and session revision. Captured-session guards reject late operations, including A → B → A. Connections wait for both initial queries; ambiguous connections and lookup failures do not silently select personal pets. Pet owner initialization resolves once, validates existing ownership, and never rewrites an existing owner's membership or resets progress.

## Files changed
- `src/lib/accountSession.ts`: central authentication lifecycle and captured-session checks.
- `src/main.tsx`, `src/pages/Index.tsx`: activate preferences before account rendering; remount all account hooks/navigation.
- `src/hooks/useAuth.ts`, `usePreferences.ts`, `useTheme.ts`, `useConnection.ts`, `usePet.ts`, `useMoodEntries.ts`, `useAchievements.ts`, `useProfile.ts`: scoped settings/state, loading guards and obsolete-result protection.
- `src/lib/petApi.ts`, `connectionsApi.ts`, `moodApi.ts`, `achievementsApi.ts`, `faceMood.ts`: validated account operations, owner resolution and UID-scoped facial calibration.
- `src/components/screens/SettingsScreen.tsx`, `PetScreen.tsx`, `ConnectionsScreen.tsx`, `ProfileScreen.tsx`, `LogScreen.tsx`, `ScanScreen.tsx`: stop global reminder writes, display loading/ownership errors and suppress obsolete completion effects.
- `src/lib/accountIsolation.test.tsx`: ten regression tests.
- `AGENTS.md`, `roadmap.md`: account-boundary conventions and outstanding verification.

## Storage and queries
New preferences use `mm.preferences.{uid}`, including theme mode, both hue selections, sticker set, audio, reminders and accessibility. Facial calibration uses `moodmirror.face.calibration.v2.{uid}`. Existing UID-scoped profile, onboarding, achievements and counters are retained; the first-hatch marker remains owner-scoped for shared pets.

Legacy `mm.preferences`, `mm.theme`, `mm.reminders`, `mm.reminderTime` and unowned facial calibration remain untouched and unassigned, as requested. Accounts without their own settings receive defaults—not another account's old settings. These preferences remain browser-local per account; cross-device synchronization was not added.

No collection paths or stored mood/pet records were migrated. Mood queries retain `userId == uid`; connection queries retain `userA == uid` and `userB == uid`, now waiting for both initial results. Pet item subscriptions remain under the validated `pets/{ownerKey}/items` path. The app does not explicitly enable persistent Firestore IndexedDB caching, and no personal React Query responses were found. Firebase-managed authentication persistence was left alone.

## Security and migration
Neither Firestore nor Storage rules were edited or deployed. Deployed rules could not be read. The repository rules need a separate security hardening review: Storage grants all authenticated accounts drawing reads, and pet rules trust editable membership fields. Client isolation does not fix those server authorization weaknesses.

Live testing returned `permission-denied` when initializing a new pet owner, so normal pet creation could not be verified. The repository rules also lack an authorized read condition for a nonexistent personal owner, which transactional initialization needs. A secure rule update must bind personal owner paths to the caller and shared paths to active connection members, authorize legitimate initialization, and prevent arbitrary membership reassignment. Removing the broad Storage read requires a compatible, specifically authorized shared-image access design. No rule workaround or broad read grant was applied.

Existing data was not deleted or reset. Ownership-deficient records are reported as unverified rather than assigned to a guessed UID. No automated migration is needed for valid owner records; records missing or inconsistent ownership require a privileged audit before any backfill. A live audit of existing records was not available.

## Tests
- All 19 tests passed, including 10 account-isolation regressions: distinct themes/stickers, preserved unassigned legacy keys, delayed preference handlers, rapid A → B → A invalidation, slow connection/mood loading, late pet snapshots, unauthorized owner rejection and shared-scope changes.
- Two real Firebase accounts in one browser: A selected Light Mode / Mint / Pastel Hearts; B selected Dark Mode / Dark rose / Cosmic. Both retained their choices across three repeated sign-in/sign-out rounds, navigation and page refreshes. Legacy settings stayed unchanged. No browser page errors were observed.
- A real mood save succeeded and read back on Home. Pet points/creation then failed with Firebase `permission-denied` during owner initialization.
- Real pet creation, scrapbook read-back, shared-pet authorization and live slow-network/rapid-switch pet checks remain unverified. Their isolation boundaries have regression coverage, not a completed live end-to-end result.