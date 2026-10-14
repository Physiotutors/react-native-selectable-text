import React, { Children, cloneElement, isValidElement, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { requireNativeView } from 'expo'

export { collectTextAndLinks } from './textAndLinks'

const NO_LINKS = []

const NativeSelectableTextView = ['ios', 'android'].includes(Platform.OS)
    ? requireNativeView('PhysiotutorsSelectableText')
    : null

/**
 * Android: make the text selectable shortly after the first render.
 *
 * Workaround for an Android bug where selectable text further down the navigation tree isn't drawn.
 * @see https://github.com/react-navigation/react-navigation/issues/12060
 */
function useAndroidSelectable() {
    const [selectable, setSelectable] = useState(false)

    useEffect(() => {
        if (Platform.OS !== 'android') return undefined
        const timeout = setTimeout(() => setSelectable(true), 100)
        return () => clearTimeout(timeout)
    }, [])

    return selectable
}

// The plain strings inside a <Text> tree, used to notice when the text changes.
function textOf(node) {
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(textOf).join('')
    if (isValidElement(node)) return textOf(node.props.children)
    return ''
}

/**
 * Wraps one <Text> and gives it native drag-to-select with your own menu options.
 * Links inside the text stay tappable (on iOS pass `links` + `onLinkPress`, see README).
 *
 * Same API as @rob117/react-native-selectable-text's SelectableTextView: `menuOptions` and
 * `onSelection({ chosenOption, highlightedText })`.
 */
export function SelectableTextView({
    children,
    menuOptions = [],
    onSelection,
    links = NO_LINKS,
    onLinkPress,
    selectionColor,
    handleColor,
    contentKey,
    style,
}) {
    const androidSelectable = useAndroidSelectable()
    const text = Children.only(children)

    // iOS draws the text in its own native text view, so React Native's <Text> must not be selectable
    // there. Android selects on React Native's own text view.
    const child = isValidElement(text)
        ? cloneElement(text, { selectable: Platform.OS === 'android' ? androidSelectable : false })
        : text

    const menuItems = useMemo(
        () => menuOptions.map((title, index) => ({ id: String(index), title: String(title) })),
        [menuOptions.join('\u0000')]
    )

    // Keyed on the content, not the array: a new but equal array must not reach iOS, because changing
    // the links re-reads the text there and drops the user's selection.
    const linksKey = links.map(({ start, end, href }) => `${start}:${end}:${href}`).join('\u0000')
    const nativeLinks = useMemo(
        () => links.map(({ start, end, href, text: linkText = '' }) => ({ start, end, href, text: linkText })),
        [linksKey]
    )

    if (!NativeSelectableTextView) {
        return isValidElement(text) ? cloneElement(text, { selectable: true }) : text
    }

    const onMenuAction = ({ nativeEvent }) => {
        const index = Number(nativeEvent.id)
        onSelection?.({
            chosenOption: menuOptions[index],
            chosenOptionIndex: index,
            highlightedText: nativeEvent.text,
            selectionStart: nativeEvent.start,
            selectionEnd: nativeEvent.end,
        })
    }

    const onNativeLinkPress = ({ nativeEvent }) => {
        const link = links[nativeEvent.index]
        if (link) onLinkPress?.({ index: nativeEvent.index, href: link.href, link })
    }

    return (
        <NativeSelectableTextView
            style={style}
            menuItems={menuItems}
            links={nativeLinks}
            contentKey={contentKey ?? textOf(text)}
            selectionColor={selectionColor}
            handleColor={handleColor ?? selectionColor}
            onMenuAction={onMenuAction}
            onLinkPress={onNativeLinkPress}
        >
            {child}
        </NativeSelectableTextView>
    )
}

export default SelectableTextView
