# Changelog

## 1.0.0

First release, replacing `@rob117/react-native-selectable-text` in the Physiotutors app.

- `SelectableTextView` with the same `menuOptions` / `onSelection({ chosenOption, highlightedText })` API.
- Links inside the text stay tappable (iOS: `links` + `onLinkPress`; Android: unchanged React Native handling).
- `onSelection` also reports `chosenOptionIndex`, `selectionStart` and `selectionEnd`.
- Brand-colored selection and handles (`selectionColor`, `handleColor`).
- `collectTextAndLinks(tnode)` helper for react-native-render-html.
