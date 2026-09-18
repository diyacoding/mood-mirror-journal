# Pet Scrapbook Page-Flip and Music Refresh

## Goal
Make the existing pet scrapbook feel like a physical notebook with draggable page corners, while preserving every pet page, progression rule, navigation path, and audio preference. Replace only the current generated background composition with a new original cozy visual-novel-inspired loop.

## Scrapbook interaction
- Keep the existing oldest-to-newest ordering, newest-first opening behavior, trailing locked page, 100-point progress, empty state, and Older/Newer controls.
- Layer the current page over a small visible preview of the adjacent page, with a theme-aware folded corner, paper edge, and restrained depth shadow.
- Use unified pointer events so mouse, touch, and stylus all share the same drag behavior.
- Start a turn from a forgiving left or right corner/edge target, capture the pointer, and make the page bend/rotate with the drag position.
- Complete the turn when the drag crosses a practical distance threshold; otherwise animate the sheet gently back into place.
- Prevent scrolling or accidental repeated turns only while the page is actively being dragged.
- Keep arrow navigation as an accessible fallback, and add clear labels for the draggable page corners.
- Respect reduced-motion preferences by minimizing the completion/snap-back animation without changing navigation.

## Page-turn audio
- Trigger the existing page-turn effect only after a drag or arrow turn successfully changes pages.
- Play nothing for cancelled drags.
- Keep the existing sound-effects volume routing and overlap guard so each completed turn produces at most one subtle sound.

## Background music
- Replace the current synthesized melody and pad arrangement with a new original composition made in the existing Web Audio engine.
- Use a gentle piano-like pluck, soft bell accents, warm accompaniment, and an original dreamy harmonic/melodic pattern designed for seamless looping.
- Preserve opt-in playback, browser interaction requirements, background music toggle, music volume, separate effects volume, and saved preferences.
- Use no external or copyrighted audio and make no attempt to reproduce the DDLC melody, arrangement, or recording.

## Validation
- Verify Pets still opens directly to the scrapbook and all pet/locked-page content remains intact.
- Test forward, backward, completed, and cancelled drags with mouse and mobile touch emulation.
- Confirm the folded corner and underlying page preview render in light and dark themes at desktop and mobile sizes.
- Confirm one sound per completed turn, none on cancellation, and independent music/effects controls.
- Run focused type/tests and inspect the rendered preview; no Firebase models, rules, pet records, achievements, or unrelated screens will change.
