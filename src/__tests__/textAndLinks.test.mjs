import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectTextAndLinks } from '../textAndLinks.js'

// Minimal react-native-render-html tnodes.
const text = (data, extra = {}) => ({ type: 'text', data, children: [], ...extra })
const el = (tagName, children, attributes = {}) => ({ type: 'block', tagName, attributes, children })

test('plain text has no links', () => {
    assert.deepEqual(collectTextAndLinks(el('p', [text('Hello world')])), { text: 'Hello world', links: [] })
})

test('a link that only holds text keeps its tagName on the text node', () => {
    const tnode = el('p', [
        text('See '),
        text('the guideline', { tagName: 'a', attributes: { href: 'https://example.com/g' } }),
        text(' for details.'),
    ])
    const { text: all, links } = collectTextAndLinks(tnode)
    assert.equal(all, 'See the guideline for details.')
    assert.equal(links.length, 1)
    assert.deepEqual({ ...links[0], attributes: undefined }, {
        start: 4, end: 17, href: 'https://example.com/g', text: 'the guideline', attributes: undefined,
    })
    assert.equal(all.slice(links[0].start, links[0].end), 'the guideline')
})

test('a link with nested formatting covers all of its text', () => {
    const tnode = el('p', [
        el('a', [text('bold '), el('strong', [text('part')])], { href: '/x' }),
        text(' after'),
    ])
    const { links } = collectTextAndLinks(tnode)
    assert.equal(links[0].text, 'bold part')
    assert.equal(links[0].href, '/x')
})

test('line breaks count as one character and links after them line up', () => {
    const tnode = el('p', [text('one'), el('br', []), text('two', { tagName: 'a', attributes: { href: '/2' } })])
    const { text: all, links } = collectTextAndLinks(tnode)
    assert.equal(all, 'one\ntwo')
    assert.equal(all.slice(links[0].start, links[0].end), 'two')
})

test('anchors without href are not links', () => {
    const { links } = collectTextAndLinks(el('p', [text('anchor', { tagName: 'a', attributes: { name: 'top' } })]))
    assert.deepEqual(links, [])
})

test('offsets are UTF-16 units, like iOS', () => {
    const tnode = el('p', [text('😀 '), text('link', { tagName: 'a', attributes: { href: '/l' } })])
    const { links } = collectTextAndLinks(tnode)
    assert.equal(links[0].start, 3) // the emoji is 2 code units
})

test('no tnode gives empty output', () => {
    assert.deepEqual(collectTextAndLinks(null), { text: '', links: [] })
})
