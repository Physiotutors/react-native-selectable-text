# How the selectable text works: a guide for reviewers

This guide explains what this package does and how, for developers who know the Physiotutors stack (Laravel, PHP, JavaScript) but not iOS or Android code. You don't need to read Swift or Kotlin to review the behaviour or to maintain the app's side of it.

## In one paragraph

In an article, the user drags over text, a small menu appears with **Highlight** and **Copy**, and links in the text keep working when tapped. React Native can't show a custom menu like that by itself, so a small amount of native code (one file per platform that does the work) adds it. Everything the app decides (which options, what happens on Highlight, where links go) stays in JavaScript. Saving a highlight still calls the same Laravel endpoint as before: `POST api/user/highlights`.

## Why there is native code at all

- React Native's `<Text selectable>` gives selection with the system's standard menu (Copy, Share, Look Up). On iOS it doesn't let you **add your own items** such as Highlight, and on Android it can't be done from JavaScript either.
- So every package that offers a custom selection menu contains native code. The package the app used before, `@rob117/react-native-selectable-text`, has 577 lines of Objective-C++ for iOS and 169 lines of Kotlin for Android. It lived in `node_modules`, so it was easy to overlook.
- That package hides React Native's text on iOS and draws its own copy on top, which **catches every tap**, so links in the text stopped working (ticket PHYS-656). The app then switched iOS to a "long-press a paragraph" bottom sheet as a workaround.
- This package takes a different approach: on iOS it shows the same text in Apple's standard text view, which already knows how to select text and open links. On Android it doesn't draw anything; it only swaps the items in Android's own selection menu.

## What happens, step by step

### iOS

1. The app renders `<SelectableTextView>` around a normal React Native `<Text>`.
2. React Native lays the text out as usual. The native view (`ios/SelectableTextView.swift`) finds that text, copies its content and styling into an Apple `UITextView` placed exactly on top, and hides the original. The original stays in place because React Native uses it to decide sizes and line breaks.
3. The user long-presses and drags: the `UITextView` does the selection, with the standard iOS handles.
4. iOS asks which menu to show. The native view answers with the `menuOptions` the app passed in, for example "Markeren" and "Kopiëren" in Dutch.
5. The user taps an option: the native view sends `{ option, selected text, start, end }` to JavaScript, which calls the app's `onSelection`.
6. Links: JavaScript works out where the links are in the text (`collectTextAndLinks`) and passes their positions. The native view marks those ranges as links. A tap on one is sent back to JavaScript (`onLinkPress`), and the app opens it with the same handler it uses for every other link.

### Android

1. The app renders the same `<SelectableTextView>`. The package makes the `<Text>` `selectable`, which Android supports natively.
2. Android's own text view does the selection and its handles; React Native still handles taps on links, exactly as for any other text.
3. When Android builds the selection menu, the native view (`android/…/SelectableTextView.kt`) replaces Android's items (Copy, Share, Translate…) with the app's `menuOptions`, and tints the handles in the brand color.
4. Tapping an option sends the same event to JavaScript as on iOS.

The app sees one component and one event on both platforms.

## What lives where

| File | Lines | Language | What it does |
|---|---|---|---|
| `src/index.js` | 115 | JavaScript | The component the app uses: props, the Android "selectable" timing workaround, turning native events into `onSelection` / `onLinkPress`. |
| `src/textAndLinks.js` | 37 | JavaScript | Finds the text and link positions in an article paragraph (render-html). Covered by unit tests. |
| `src/index.d.ts` | – | TypeScript types | Editor hints and documentation of every prop. |
| `ios/SelectableTextView.swift` | 221 | Swift | The iOS view: shows the text in a `UITextView`, builds the menu, reports the selection, handles link taps. |
| `ios/SelectableTextModule.swift` | 40 | Swift | Registers the view and its props with Expo. Plain declarations. |
| `ios/PhysiotutorsSelectableText.podspec` | 21 | Ruby (config) | Tells iOS builds how to compile the Swift files. |
| `android/…/SelectableTextView.kt` | 156 | Kotlin | The Android view: replaces the selection menu items, reports the selection, tints the handles. |
| `android/…/SelectableTextModule.kt` | 33 | Kotlin | Registers the view and its props with Expo. Plain declarations. |
| `android/build.gradle`, `expo-module.config.json` | – | config | Build configuration; Expo links the module automatically. |

About 380 lines of native code in total, of which the two `…View` files hold the logic.

## The contract between JavaScript and native code

This is the part to review if you don't read Swift or Kotlin: everything crossing the boundary is listed here.

**JavaScript → native (props):**

| Prop | Example | Meaning |
|---|---|---|
| `menuItems` | `[{ id: '0', title: 'Highlight' }, { id: '1', title: 'Copy' }]` | Built by `src/index.js` from `menuOptions`. |
| `links` | `[{ start: 4, end: 17, href: 'https://…', text: 'the guideline' }]` | iOS only. Link positions in the text. |
| `selectionColor` / `handleColor` | `'#7973ff'` | Brand color of selection and handles. |
| `contentKey` | the paragraph's text | Changes when the text changes, so iOS re-reads it. |

**Native → JavaScript (events):**

| Event | Payload | Becomes |
|---|---|---|
| `onMenuAction` | `{ id: '0', text: 'selected words', start: 12, end: 26 }` | `onSelection({ chosenOption, chosenOptionIndex, highlightedText, selectionStart, selectionEnd })` |
| `onLinkPress` | `{ index: 0, href: 'https://…' }` | `onLinkPress({ index, href, link })` (iOS only) |

## How the app uses it

`components/text/SelectableText.js` in the app:

1. Builds the menu: **Highlight** (only when the text belongs to an entry) and **Copy**, translated with `__()`.
2. On **Highlight**, posts the selected text to `api/user/highlights` with the entry id. That's the existing Laravel endpoint, unchanged. It then shows a toast. Highlights appear under Library → Highlights as before.
3. On **Copy**, puts the text on the clipboard.
4. On iOS, passes the paragraph's links (from `collectTextAndLinks`) and opens tapped links with render-html's normal link handler, so internal app links, external links and references behave as everywhere else.

## Changing things without touching native code

| You want to… | Change |
|---|---|
| Rename, translate or reorder menu options | `menuOptions` in the app (`SelectableText.js`) and the translation files. |
| Add a menu option, e.g. "Share" | Add it to `menuOptions` and handle it in `onSelection`. |
| Change what Highlight does | `onHighlight` in `SelectableText.js` (and the Laravel endpoint behind it). |
| Change colors | `selectionColor` / `handleColor` props. |
| Turn it off for some text | Render a plain `<Text>` instead of `<SelectableTextView>`. |

Native code only needs to change for new **kinds** of behaviour, for example showing an icon in the menu or reacting while the user is still dragging.

## Upgrades: what can break, and how you'd notice

The native code relies on a few things from React Native, Expo and the operating systems. After upgrading any of them, run the test checklist below on both platforms.

| Depends on | Where | If it changes |
|---|---|---|
| React Native's paragraph view being called `RCTParagraphComponentView` (iOS) | `SelectableTextView.swift`, `paragraphClass` | Text shows but can't be selected on iOS. The view falls back to doing nothing, so the article still reads fine. |
| React Native's text being an Android `TextView` | `SelectableTextView.kt`, `findTextView` | Android shows its standard menu (Copy/Share) instead of Highlight. |
| Expo Modules API (`View`, `Prop`, `Events`) | both `…Module` files | The build fails with a clear error rather than misbehaving. These APIs have been stable across recent Expo SDKs. |
| iOS 16+ edit menu (`editMenuForTextIn`) and iOS 17 link APIs | `SelectableTextView.swift` | Older APIs are used as a fallback on iOS 16. |

None of these fail silently in a way that loses data: at worst a platform falls back to the standard menu or plain text.

## Test checklist

Run in the app, on an iPhone simulator/device and an Android emulator/device, in an article with links:

- [ ] Long-press a word: it's selected with handles in the brand color; drag the handles across lines.
- [ ] The menu shows **Highlight** and **Copy** (in the app's language), nothing else.
- [ ] **Highlight** shows the "highlight added" toast; the text appears under Library → Highlights.
- [ ] **Copy** puts exactly the selected text on the clipboard.
- [ ] Tap an inline link: it opens (internal links in the app, external links in the browser).
- [ ] Tap a reference / footnote link: it opens.
- [ ] Bold or italic parts inside a paragraph look the same as before and can be selected.
- [ ] Scroll quickly through a long article and come back: text still selectable, no blank paragraphs.
- [ ] Switch app language and repeat the menu check.

## Glossary

- **Expo module:** Expo's standard way to add native code to an app. It's a folder with a JavaScript entry point plus Swift/Kotlin files that Expo compiles and links automatically during the build.
- **UITextView (iOS):** Apple's built-in text view, the same one used by Notes. It already supports selection, menus and links.
- **TextView (Android):** Android's built-in text view. React Native's `<Text>` is one on Android.
- **Selection menu (ActionMode / edit menu):** the small bar with Copy etc. that appears over a selection.
- **render-html:** `react-native-render-html`, which turns article HTML from the CMS into React Native views. A **tnode** is its representation of one HTML element.
- **UTF-16 offsets:** how both JavaScript and iOS count characters in a string; that's why link positions computed in JavaScript match on iOS.
