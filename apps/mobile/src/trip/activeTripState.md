# ActiveTripState

`ActiveTripState` is the single source of truth for an active or previewed
Movia trip. UI layers must not independently derive current station, next
station, current line, next line, transfer points, route direction, progress, or
notification state.

## `currentStationIndex === null`

`null` is an expected state, especially for `tripStatus: "preview"`.

- Timeline: render a planned route. Do not show "You are here", pulse, completed,
  current, or arrived states.
- Map: draw the complete ordered route. Do not split completed/remaining path or
  highlight a current station.
- ETA: show total route ETA, estimated arrival, and initial direction if
  `directionTerminal !== null`.
- Notifications: send nothing. Notification policy only runs when
  `tripStatus === "active"`.
- Pulse: never render the "You are here" pulse when `currentStationIndex` is
  `null`.

## `directionTerminal`

All metro lines have configured terminals, so `directionTerminal: null` should
only happen before initialization or when route data is inconsistent. Consumers
must check for `null` before rendering direction text.

## Consumers

These modules must consume `ActiveTripState` instead of deriving parallel route
state:

- map route polyline and progress
- timeline station states
- ETA and arrival copy
- bottom sheet summary
- line direction display
- "You are here" pulse
- destination arrival message
- trip notifications
- route progress

## Active-To-Ended Policy

`arrived -> ended` is user-driven through "End trip". If a future persistence
layer restores `tripStatus: "active"` after app restart and GPS is invalid for
longer than `TRIP_RECOVERY_WINDOW_MS`, the app should transition to `ended` and
log the reason.

The default recovery window is 10 minutes. It can be overridden later by
environment or remote configuration, but `10 * 60 * 1000` is the module default.
