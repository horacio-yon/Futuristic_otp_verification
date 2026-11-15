# OTP Verification Animation Pro

Dial OTP with a futuristic safe interface. Built with vanilla HTML, CSS, SVG and JavaScript, with no build step or dependencies.

Open `index.html` directly in a modern browser or publish the project with GitHub Pages. The classic scripts support `file://` usage.

## Interaction

- Drag the dial, scroll over it, or use the arrow keys to rotate.
- Press Enter, Space or click the center to confirm a digit.
- The visual demonstration code is `5451`. Any other four digits show ACCESS DENIED and start a fresh attempt automatically.
- The experience has no manual mode, demo, reset or sound controls.
- Mechanical, confirmation, unlock, success and error sounds begin after the first user gesture.

The code is for visual demonstration only. No credentials are sent or stored.

## Files

- `index.html`: semantic page structure and SVG dial.
- `css/styles.css`: visual styles, animation and responsive layout.
- `js/dial-controller.js`: rotation, inertia and digit selection.
- `js/otp-controller.js`: four digit slots and validation state.
- `js/audio-controller.js`: synthesized sound effects through Web Audio API.
- `js/app.js`: verification flow and animation states.
