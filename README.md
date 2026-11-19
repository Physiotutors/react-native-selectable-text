# @physiotutors/react-native-selectable-text

Native text selection with your own menu (for example **Highlight** and **Copy**) for React Native and Expo, with links inside the text that stay tappable.

It has the same component and props as [`@rob117/react-native-selectable-text`](https://github.com/Rob117/react-native-selectable-text) (`SelectableTextView`, `menuOptions`, `onSelection`), which it replaces in the Physiotutors app. That package draws its own copy of the text on iOS, so taps never reach links in it. This one keeps React Native's text, so links keep working.

New to the code? Start with the plain-language guide: **[docs/GUIDE.md](docs/GUIDE.md)**.

## Features

- Drag-to-select with the platform's own selection handles (iOS and Android)
- Your own menu options for the selection, in any language
- Links inside the text stay tappable
- Nested text styling (bold, italic, colored parts) is kept
- Brand-colored selection and handles
- Expo module: no extra native setup, works with EAS Build

## Installation

```sh
npm install github:Physiotutors/react-native-selectable-text#v1.0.0
```

It's an [Expo module](https://docs.expo.dev/modules/overview/): the native code is linked automatically. Rebuild the app after installing (`npx expo run:ios` / `run:android`, or an EAS build). There's no separate `pod install` step with Expo prebuild.

Requires Expo SDK 53+ and iOS 16.4+.

## Usage

### Basic example

```jsx
import { Alert, Text } from 'react-native'
import { SelectableTextView } from '@physiotutors/react-native-selectable-text'

export default function Example() {
    const handleSelection = ({ chosenOption, highlightedText }) => {
        Alert.alert('Selection', `Option: ${chosenOption}\nText: ${highlightedText}`)
    }

    return (
        <SelectableTextView menuOptions={['Highlight', 'Copy']} onSelection={handleSelection}>
            <Text>This is simple selectable text</Text>
        </SelectableTextView>
    )
}
```

### Nested text styling

```jsx
<SelectableTextView menuOptions={['Highlight', 'Copy']} onSelection={handleSelection}>
    <Text style={{ fontSize: 16 }}>
        This text is black <Text style={{ fontWeight: 'bold', color: 'red' }}>this part is bold and red</Text>{' '}
        and this is black again.
    </Text>
</SelectableTextView>
```

### With links (react-native-render-html)

On **Android** links work without extra props. On **iOS** the text is drawn by a native text view, so it needs to know where the links are. `collectTextAndLinks` works that out from a render-html `tnode`:

```jsx
import { collectTextAndLinks, SelectableTextView } from '@physiotutors/react-native-selectable-text'

function Paragraph({ tnode, children, onLinkPress }) {
    const { text, links } = useMemo(() => collectTextAndLinks(tnode), [tnode])

    return (
        <SelectableTextView
            menuOptions={['Highlight', 'Copy']}
            onSelection={handleSelection}
            links={links}
            onLinkPress={({ href }) => onLinkPress(href)}
            contentKey={text}
        >
            <Text>{children}</Text>
        </SelectableTextView>
    )
}
```

## API reference

### `<SelectableTextView>`

| Prop | Type | | Description |
|---|---|---|---|
| `children` | one `<Text>` | required | The text to make selectable. Nested `<Text>` is fine. |
| `menuOptions` | `string[]` | required | Labels of the menu shown for a selection. |
| `onSelection` | `(event) => void` | | Called when the user taps a menu option (see below). |
| `links` | `{ start, end, href, text? }[]` | iOS | Character ranges of links in the rendered text (UTF-16, i.e. JavaScript string indices). |
| `onLinkPress` | `({ index, href, link }) => void` | iOS | Called when a link is tapped. |
| `highlights` | `{ start, end }[]` | `[]` | Persistent background ranges in UTF-16 units. Links and text styling are preserved. |
| `highlightColor` | color | `#e0e3fe` | Background color of saved highlights. |
| `selectionColor` | color | | Selection highlight and, on iOS, the handles. |
| `handleColor` | color | Android 10+ | Selection handle color. Defaults to `selectionColor`. |
| `contentKey` | `string` | | Change it when the text changes without remounting. Defaults to the text's strings. |
| `style` | view style | | Style of the wrapper. |

### `onSelection` event

```js
{
    chosenOption: 'Highlight',      // the tapped option, as in menuOptions
    chosenOptionIndex: 0,           // its index, handy when labels are translated
    highlightedText: 'the selection',
    selectionStart: 12,
    selectionEnd: 25,
}
```

`chosenOption` and `highlightedText` are the same fields as in `@rob117/react-native-selectable-text`.

### `collectTextAndLinks(tnode)`

Returns `{ text, links }` for a react-native-render-html tnode: the text in render order and every `<a href>` as `{ start, end, href, text, attributes }`.

## Migrating from `@rob117/react-native-selectable-text`

1. Replace the dependency and the import path.
2. Keep `SelectableTextView`, `menuOptions` and `onSelection` as they are.
3. On iOS, pass `links` and `onLinkPress` if the text contains links.

## Platform notes

- **iOS:** the `<Text>` stays mounted (it still decides the layout) but is hidden, and a native `UITextView` shows the same text on top of it. That view handles selection, the menu and links. See [docs/GUIDE.md](docs/GUIDE.md).
- **Android:** React Native's own text view does the selecting; the package only replaces its menu items and tints the handles. Links keep working through React Native.
- **Web and other platforms:** renders the `<Text>` with `selectable`, without a custom menu.

## Development

```sh
npm test   # unit tests for collectTextAndLinks
```

The native code is built by the app that installs the package. Test changes in the Physiotutors app on both platforms with the checklist in [docs/GUIDE.md](docs/GUIDE.md#test-checklist).

## License

MIT
