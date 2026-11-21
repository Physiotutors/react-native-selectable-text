# Changelog

## 1.1.0

- Add persistent `highlights` ranges and `highlightColor` on iOS and Android.

## 1.0.0

First release, replacing `@rob117/react-native-selectable-text` in the Physiotutors app.

- `SelectableTextView` with the same `menuOptions` / `onSelection({ chosenOption, highlightedText })` API.
- Links inside the text stay tappable (iOS: `links` + `onLinkPress`; Android: unchanged React Native handling).
- `onSelection` also reports `chosenOptionIndex`, `selectionStart` and `selectionEnd`.
- Brand-colored selection and handles (`selectionColor`, `handleColor`).
- `collectTextAndLinks(tnode)` helper for react-native-render-html.
- Android: the paragraph no longer shows up empty after returning to a screen that was built while the app was in the background (e.g. behind a paywall or the browser).
