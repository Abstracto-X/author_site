# Standalone Writer manual QA

Use `writer.html` in a signed-in admin browser. This checklist is for a **disposable story and disposable chapters/notes only**; do not test publication shortcuts on real reader-facing content. Record browser, viewport, outcome, and any console/network error for each failed item.

## Setup

- [ ] Confirm the Writer opens from Admin and rejects a non-admin session.
- [ ] Create or select a disposable story. Keep a copy of any text used in failure tests outside the Writer.
- [ ] Check the normal desktop viewport, then 1024px, 800px, and 390px widths. At each width, verify the navigation, editor settings, Context presets, dialogs, and Save controls remain reachable without an overlapping panel.

## Draft and live-save contract

- [ ] Type in a disposable draft and wait for **Saved**. Reload; the exact latest text should remain.
- [ ] Throttle the connection, type again while a save is running, and immediately switch chapters or stories. The switch must wait for the latest revision or stay put with a visible error; it must not claim Saved for older text.
- [ ] Double-click **New Chapter**. Exactly one new draft should appear.
- [ ] On a disposable published chapter, edit text and wait longer than the draft autosave delay. It must remain unsaved until **Save Live Changes** is clicked. Confirm that action updates the public row; it is *not* a private draft.
- [ ] Change a disposable chapter's access tier while typing in its draft. After operations settle and the page reloads, both the final tier and latest manuscript text must persist.

## Other editors and navigation

- [ ] In a Chapter Note, type during a throttled Save. The newer text must remain visible and marked unsaved for a second explicit Save; note/chapter/story switching should not discard it.
- [ ] Repeat that in a Context block. Closing or switching the block while its Save is in flight must not discard the newer text.
- [ ] Save and reload a disposable Context preset with chapter and note selections in a known order. Confirm the order survives reload; repeat with an empty selection.
- [ ] Duplicate that preset and confirm the copy has the same settings and item order. If an RPC error is shown, confirm the original remains intact and no empty duplicate was created. If a write is marked unconfirmed, verify the server result before retrying.
- [ ] Start saving a disposable Chapter Note, then immediately press Delete. Deletion should wait with a clear message; after the save finishes, Delete should work normally.
- [ ] Open Summary Manager and AI Chat, then switch stories rapidly. Older story/thread responses must not appear under the newer story. **Stop generation** must end its busy state without applying a late result.
- [ ] Use browser Back/Forward between Dashboard, Editor, and Context. Confirm the intended view, focus target, and in-session chapter caret/scroll position.

## Failure and accessibility paths

- [ ] Simulate an image-upload failure. The Writer must report failure and must not insert a base64 image or place it into another chapter after switching tabs.
- [ ] Test a failed save and a timed-out/uncertain save on disposable content. A definite failure should remain visibly retryable. An uncertain outcome should remain **Save unconfirmed — verify first**; copy work and inspect the server row before any retry.
- [ ] Test dialog Tab, Shift+Tab, Escape, and focus return; check that editor shortcuts do not publish while a dialog, note, Summary, or AI surface has focus.
- [ ] Enable reduced motion and verify the Writer remains usable without large transitions. Check Context preview scroll restoration and readable labels at narrow widths.
- [ ] Block a required external dependency or disconnect the network, then reload. Confirm the failure/retry notice is understandable and recovery works when connectivity returns.

Report each failure with the step, expected versus actual result, browser/viewport, and a screenshot or console/network error if available. Do not include credentials, access tokens, or private chapter text in the report.
