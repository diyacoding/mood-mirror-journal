# Mood Mirror — Connections, Scrapbook, Sounds, Wheel, Achievements & Audio

## 1. Correct "You / Them" labels in Recent Shared Moods
Each shared mood already stores who sent it. The labels will be decided strictly by comparing that
sender to the currently signed-in account (taken live from the auth session, not from cached UI
state), and anything that isn't the signed-in account is labelled "Them". Nothing about how moods
are stored changes.

## 2. Pets tab opens straight into the Scrapbook
Opening Pets shows the scrapbook immediately, already turned to the newest pet. A "Pet garden"
button opens the existing pet screen (hero pet, rewards, accessories, wheel, egg hatching) so
nothing is lost. Flipping backward/forward, one permanent page per pet, no overwriting, and the
trailing "To Be Unlocked" page all stay exactly as they are. When an egg is ready to hatch or a new
pet is owed, the creation flow still takes priority so the user is never stuck.

## 3. Page-flip sound
One short, soft paper-flip sound per completed flip, forward or backward, with a small guard so
rapid flipping can't stack overlapping sounds. Silent when the user has reduced motion on, and
follows the sound-effects volume.

## 4. Chalk drawing sound
A gentle chalk-on-whiteboard sound that fades in when a stroke starts and fades out shortly after
the user lifts the pen. Nothing plays while the canvas just sits open. Works for mouse, touch and
stylus (it hooks into the existing stroke events, so drawing behaviour itself is untouched).
Follows the sound-effects volume.

## 5. Accessory wheel: fair random + "draw what you won"
- Wheel options become exactly: Flower, Hat, Bow, Cat ears, Dress, Wings, Draw your own.
- The winner is chosen with a properly random, unbiased draw, and the wheel animation lands on the
  slice that was actually won (the current pointer maths is what makes it look like the same prize
  every time).
- Winning no longer hands out a ready-made picture. Instead a drawing canvas opens with a prompt
  such as "Draw your flower!", and the drawing the user makes is saved as their custom Flower
  accessory and applied to their current pet. "Draw your own" opens the same canvas with no theme.
- Saved accessories keep using the existing custom-accessory storage on the pet record, so they
  stay attached to the right pet and still drag/resize/rotate.

## 6. Achievements unlock once and stay unlocked
Unlocked badges (and counters like letters sent) move into a per-user record in the cloud database,
read on sign-in and written the moment a badge is first earned. A badge that already exists is
never re-announced, so a second accessory can't retrigger "First Accessory". Existing local badges
are migrated up on first load so nobody loses progress. Refreshing, signing out, and signing back
in all keep the same state. Achievement requirements themselves are unchanged.

## 7. Optional happy background music + App Audio settings
Background music and all sound effects are generated inside the app itself (soft synthesised
chimes and pads, seamless loop) — no third-party recordings, so there is no licensing risk. Music
starts only after the user's first tap, never autoplays at full blast, and defaults to a
comfortable low volume with music switched off until the user turns it on.

Settings gains an "App Audio" section: Music on/off, a Background Music slider, and a Sound
Effects slider. Choices are saved with the existing preferences, so they persist across reopening
the app. Audio never touches camera/mood analysis, logging, drawing, scrapbook or messages.

## Database change that needs your approval
Achievements need one new place to live: a per-user document keyed by the signed-in user's ID.
The security rule to add is narrow — only the signed-in user can read or write their own
achievements document; nothing else in your existing rules is modified. I'll include the rule text
in `firestore.rules` for you to publish in the Firebase console. Until you publish it, achievements
keep working from local storage as a fallback.

## Technical notes
- New: `src/lib/audioEngine.ts` (WebAudio: flip, chalk loop, music loop, volume/mute state),
  `src/hooks/useAudioSettings.ts`, achievements cloud layer in `src/lib/achievementsApi.ts`.
- Changed: `ConnectionsScreen` (label source), `PetScreen` + `Index` (scrapbook-first),
  `PetScrapbook` (flip sound), `PetDrawingCanvas` (chalk sound + optional prompt),
  `AccessoryWheel` + `petApi.consumeSpin` (random fix, returns a prompt instead of granting art),
  `useAchievements` (Firestore-backed earned map), `SettingsScreen` (App Audio), `usePreferences`
  (music on, musicVolume, sfxVolume).
- Verify with `bunx tsgo --noEmit -p tsconfig.app.json` plus a Playwright pass over the Pets tab,
  wheel spins, and Settings audio controls.
