import type { ReactElement } from 'react'
import type { ColorValue, StyleProp, ViewStyle } from 'react-native'

export interface SelectionEvent {
    /** The menu option the user tapped (one of `menuOptions`). */
    chosenOption: string
    /** Its position in `menuOptions`; handy when the options are translated. */
    chosenOptionIndex: number
    /** The selected text. */
    highlightedText: string
    /** Selection range in the text, in UTF-16 units. */
    selectionStart: number
    selectionEnd: number
}

export interface TextLink {
    /** Range of the link in the rendered text, in UTF-16 units (JavaScript string indices). */
    start: number
    end: number
    href: string
    /** The link's text; used to find it again if the offsets don't line up. */
    text?: string
    [key: string]: unknown
}

export interface LinkPressEvent {
    index: number
    href: string
    link: TextLink
}

export interface SelectableTextViewProps {
    /** Exactly one <Text>. Nested <Text> styling is supported. */
    children: ReactElement
    /** Labels of the menu shown for a selection, e.g. ['Highlight', 'Copy']. */
    menuOptions: string[]
    onSelection?: (event: SelectionEvent) => void
    /** iOS: links inside the text, so they stay tappable. Android handles links itself. */
    links?: TextLink[]
    onLinkPress?: (event: LinkPressEvent) => void
    /** Selection highlight and handle color (iOS) / highlight color fallback. */
    selectionColor?: ColorValue
    /** Android 10+: color of the selection handles. Defaults to `selectionColor`. */
    handleColor?: ColorValue
    /** Change it when the text changes without the component remounting. Defaults to the text's strings. */
    contentKey?: string
    style?: StyleProp<ViewStyle>
}

export function SelectableTextView(props: SelectableTextViewProps): ReactElement
export default SelectableTextView

/** Text and link ranges of a react-native-render-html tnode, ready for `links`. */
export function collectTextAndLinks(tnode: unknown): {
    text: string
    links: (TextLink & { attributes?: Record<string, string> })[]
}
