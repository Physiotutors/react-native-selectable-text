/**
 * Walks a react-native-render-html tnode in render order and returns its text plus the character
 * ranges of its links, ready for <SelectableTextView links={...}>.
 *
 * Offsets are UTF-16 code units (JavaScript string indices), the same unit iOS uses (NSString).
 *
 * @returns {{ text: string, links: { start: number, end: number, href: string, text: string, attributes: object }[] }}
 */
export function collectTextAndLinks(tnode) {
    const result = { text: '', links: [] }
    if (tnode) walk(tnode, result)
    return result
}

function walk(tnode, result) {
    const start = result.text.length

    // An element that only holds text (e.g. <a href="…">text</a>) is a text node that keeps its tagName.
    if (tnode.tagName === 'br') {
        result.text += '\n'
    } else if (tnode.type === 'text') {
        result.text += tnode.data ?? ''
    } else {
        (tnode.children ?? []).forEach(child => walk(child, result))
    }

    const href = tnode.tagName === 'a' ? tnode.attributes?.href : null
    if (href) {
        result.links.push({
            start,
            end: result.text.length,
            href,
            text: result.text.slice(start),
            attributes: tnode.attributes,
        })
    }
}
