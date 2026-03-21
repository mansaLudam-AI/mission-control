# Mission Control V5 — Polish & Fix Plan

## User Decisions
- **Navigation**: Keep all 9 views, polish each one
- **Icons**: Replace Unicode glyphs with inline SVG icons
- **Nudge**: Always show nudge UI; show "disconnected" badge when no endpoint configured

---

## Phase 1: Bug Fixes & Code Quality

### 1.1 Fix `titleCase()` — uppercases every char instead of first-per-word
**File**: `app.js`
```js
// Current (broken): "hello world" → "HELLO WORLD"
return humanize(value).replace(/\w/g, (char) => char.toUpperCase());
// Fixed:
return humanize(value).replace(/\b\w/g, (char) => char.toUpperCase());
```

### 1.2 Fix `stripMarkdown()` — breaks identifiers by replacing `_` with space
**File**: `app.js`
- Only strip markdown emphasis (`_text_`) not bare underscores
- Keep underscores that are part of identifiers (surrounded by word chars)
```js
function stripMarkdown(value = '') {
  return String(value)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/(?<!\w)_(.*?)_(?!\w)/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^#+\s*/gm, '')
    .trim();
}
```

### 1.3 Fix duplicate skeleton in `renderSummaryCard()`
**File**: `app.js`
- The loading state and "no summary yet" state are identical — merge into one branch:
```js
if (!aiSummary) { /* show skeleton */ }
```

### 1.4 Add AI source indicator
**File**: `app.js`
- Show whether summary is AI-generated or fallback template
- Add subtle "AI" or "Template" label in the summary card header

### 1.5 Fix silent catch blocks
**File**: `app.js`
- `fetchSummary()` silently swallows errors — add visible error state
- Show "Summary unavailable" with retry button instead of permanent skeleton

### 1.6 Extract status logic to shared function
**File**: `server.mjs` + `app.js`
- Server already computes status and returns it in `/api/summary` response
- Client should use the status from `aiSummary.status` when available, only fall back to local computation

---

## Phase 2: Typography & Design System

### 2.1 Establish proper type scale
**File**: `styles.css`
Add CSS custom properties for a coherent type scale:
```css
--font-size-xs: 11px;
--font-size-sm: 12px;
--font-size-base: 13px;
--font-size-md: 14px;
--font-size-lg: 16px;
--font-size-xl: 20px;
--font-size-2xl: 24px;
--font-size-3xl: 32px;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--line-height-tight: 1.2;
--line-height-normal: 1.5;
--line-height-relaxed: 1.6;
```
Apply consistently across all components.

### 2.2 Replace Unicode nav icons with inline SVGs
**File**: `app.js`
Replace VIEW_DEFS icons with clean SVG strings:
- Overview: dashboard/grid icon
- Work: checkbox/kanban icon
- Approvals: check-circle icon
- Events: activity/pulse icon
- Agents: cpu/bot icon
- Schedule: clock icon
- Usage/Cost: dollar-sign icon
- Artifacts: package/box icon
- Intel: brain/lightbulb icon

### 2.3 Improve card design
**File**: `styles.css`
- Slightly increase border contrast: `--border-default: #35353D` (up from #2E2E35)
- Add subtle hover elevation: `transform: translateY(-1px)` + shadow lift
- Add focus-visible ring on all interactive cards
- Improve card padding rhythm: 20px instead of 16px for main cards

### 2.4 Better empty states
**File**: `styles.css` + `app.js`
- Replace plain "No items" text with styled empty state illustrations
- Use a muted icon + descriptive text + optional action button
- Example: "No active tasks" → ghost kanban icon + "Nothing in the now lane" + "View all work →"

### 2.5 Improve metric/KPI cards
**File**: `styles.css`
- Add subtle background gradient on hover
- Improve number typography: larger font-size for the value, tighter letter-spacing
- Add trend indicator placeholder (↑ / ↓ / →)

### 2.6 View transitions
**File**: `styles.css` + `app.js`
- Stagger child animations on view change (each card fades in with slight delay)
- Use `animation-delay` on `.view > *:nth-child(n)` pattern

---

## Phase 3: Component Polish

### 3.1 Improve Status Banner
**File**: `styles.css` + `app.js`
- Add gradient backgrounds instead of flat tints
- Better visual hierarchy between status label, current task, and meta info
- Add pulsing dot animation for "ok" state

### 3.2 Improve Commitment Rows
**File**: `styles.css` + `app.js`
- Add tap-to-expand for commitment details (PRD requirement)
- Show proof/context in expanded state
- Better countdown typography with monospace alignment

### 3.3 Improve Delivery Scorecard
**File**: `styles.css` + `app.js`
- Replace single monospace line with a proper mini data card
- Show delivery rate as a visual progress bar
- Split into 3 inline metrics: Delivery Rate, On Time, Avg Lead

### 3.4 Improve Activity Timeline
**File**: `styles.css` + `app.js`
- Add visual timeline connector (vertical line between events)
- Better event type icons/dots
- Improve row layout with better spacing

### 3.5 Improve Problems Accordion
**File**: `styles.css`
- Smoother expand/collapse animation (max-height transition)
- Better visual separation between problems
- Improve toggle arrow animation

### 3.6 Improve Approval Cards
**File**: `styles.css`
- Better button sizing and spacing
- Improve the consequence callout styling
- Better notes textarea with character count

### 3.7 Toast/Notification System
**File**: `styles.css` + `app.js`
- Add a toast notification component for user feedback
- Show toast on: approval resolved, nudge sent, snooze applied, refresh complete
- Auto-dismiss after 3s, stack up to 3 toasts

---

## Phase 4: Nudge System + Snooze Improvements

### 4.1 Always show nudge UI with disconnect indicator
**File**: `app.js` + `styles.css`
- Remove `isNudgeEnabled()` gating from `renderNudgeButton()` and `renderNudgeBar()`
- When `meta.nudgeEnabled` is false, show nudge bar with a subtle banner:
  "Nudge transport not connected — configure MC_NUDGE_ENDPOINT to enable"
- Nudge buttons still visible but show the disconnected state on click
- Style: muted badge with info tone, not blocking

### 4.2 Improve snooze feedback
**File**: `app.js`
- Show toast when problem is snoozed
- Add visual indicator for "X problems snoozed" in the Problems card header
- Consider: "Snoozed until [time]" text before hiding

---

## Phase 5: Responsive & Performance

### 5.1 Fix scroll position loss on 30s refresh
**File**: `app.js`
- Save scroll position before `draw()`, restore after
- Only re-render sections that changed (compare old vs new HTML)

### 5.2 Debounce manual refresh
**File**: `app.js`
- Prevent spamming the refresh button
- Show loading spinner during refresh

### 5.3 Mobile polish (390px breakpoint)
**File**: `styles.css`
- Add 390px breakpoint (PRD requirement, currently missing)
- Ensure all touch targets are 44px minimum
- Test commitment tap-to-expand on mobile

### 5.4 Pull-to-refresh (mobile)
**File**: `app.js` + `styles.css`
- Implement touch-based pull-to-refresh on mobile
- Show pull indicator arrow that transitions to spinner

---

## Phase 6: Remaining View Polish

### 6.1 Format long render functions
**File**: `app.js`
- Break up `renderSchedule()`, `renderUsageCost()`, `renderArtifacts()`, `renderIntel()` from single-line blobs into readable multi-line functions

### 6.2 Kanban board polish
**File**: `styles.css` + `app.js`
- Better task card design with clear visual hierarchy
- Improve empty lane states
- Add task count badges to lane headers

### 6.3 Events view polish
**File**: `styles.css`
- Fix rigid grid layout that breaks on medium screens
- Better event type categorization with color-coded dots

### 6.4 Agents view polish
**File**: `styles.css`
- Better agent card layout with clearer health indicators
- Improve delivery history section within agent card

### 6.5 Usage/Cost view polish
**File**: `styles.css`
- Better table styling with alternating row tints
- Improve mobile stacked card layout

---

## Implementation Order
1. **Phase 1** first (bugs) — foundational correctness
2. **Phase 2** next (design system) — establishes visual language
3. **Phase 3** (component polish) — uses new design system
4. **Phase 4** (nudge/snooze) — user-facing feature completion
5. **Phase 5** (responsive/perf) — refinement
6. **Phase 6** (remaining views) — completeness

## Files Modified
- `app.js` — all phases
- `styles.css` — phases 2-6
- `index.html` — minimal (maybe add toast container div)
- `server.mjs` — phase 1 only (status logic dedup)
