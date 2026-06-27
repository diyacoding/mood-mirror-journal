## Problem

The `firestore.rules` file in the repo already contains `/pets/{ownerKey}` and `/pets/{ownerKey}/items/{itemId}` rules, but the **published** ruleset in Firebase Console does not — it was never deployed. Firestore therefore default-denies every write to `pets/*/items/*`.

The fix is purely a **deploy** step: copy the complete file below into Firebase Console → Firestore Database → Rules → Publish. No code changes are needed.

## Authorization model (already implemented in the code)

- `pets/{ownerKey}` doc carries `members: [uid, ...]`
- `pets/{ownerKey}/items/{itemId}` doc carries `ownerKey`, `members`, and `createdBy: uid` (stamped by `createPet` in `src/lib/petApi.ts`)
- A user may read/write the parent doc if they appear in `members`
- A user may create an item only if `createdBy == auth.uid` AND they're in the item's `members`
- Update/delete an item requires membership; `createdBy` is immutable

## Rules to add (the pets block)

```
match /pets/{ownerKey} {
  function isMember() {
    return request.auth != null
           && resource.data.members.hasAny([request.auth.uid]);
  }
  function newIsMember() {
    return request.auth != null
           && request.resource.data.members.hasAny([request.auth.uid]);
  }
  allow read:   if isMember();
  allow create: if newIsMember();
  allow update: if isMember() && newIsMember();
  allow delete: if false;

  match /items/{itemId} {
    function parentMember() {
      let parent = get(/databases/$(database)/documents/pets/$(ownerKey));
      return request.auth != null
             && parent != null
             && parent.data.keys().hasAny(['members'])
             && parent.data.members.hasAny([request.auth.uid]);
    }
    function itemMember() {
      return request.auth != null
             && request.resource.data.keys().hasAny(['members'])
             && request.resource.data.members.hasAny([request.auth.uid])
             && request.resource.data.createdBy == request.auth.uid;
    }
    function existingItemMember() {
      return request.auth != null
             && resource.data.keys().hasAny(['members'])
             && resource.data.members.hasAny([request.auth.uid]);
    }
    allow read:   if parentMember() || existingItemMember();
    allow create: if itemMember();
    allow update: if (parentMember() || existingItemMember())
                  && request.resource.data.createdBy == resource.data.createdBy;
    allow delete: if existingItemMember();
  }
}
```

## Complete `firestore.rules` to publish

Paste the entire contents of the repo's `firestore.rules` into Firebase Console. It already includes the pets block above plus the existing rules for `mood_entries` and `connections/{...}` subcollections — no rules will be lost. The plan step is simply: open `firestore.rules` in the repo → copy all → paste into Firebase Console → Rules → **Publish**.

## Verification

After publish:
1. Hatch egg → draw pet → Save
2. Console should show `[pet-save] ✅ item written` instead of `permission-denied`
3. Firestore Console → `pets/u_{uid}/items` contains the new document

## Notes

- No code changes are required; `createPet` already stamps `ownerKey`, `members`, and `createdBy` on each item, which is exactly what the rules check.
- If you'd prefer, the same file can be deployed via CLI with `firebase deploy --only firestore:rules` — but publishing through the Console works identically.
