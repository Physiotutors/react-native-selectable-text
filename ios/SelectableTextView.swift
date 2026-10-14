import ExpoModulesCore
import UIKit

/// Shows the React Native text mounted inside it in a UITextView, which gives native drag-to-select,
/// a custom edit menu and tappable links. The React Native paragraph stays mounted because it drives
/// the layout, but it is hidden while the UITextView draws its text.
class SelectableTextView: ExpoView, UITextViewDelegate {
  let onMenuAction = EventDispatcher()
  let onLinkPress = EventDispatcher()

  var menuItems: [MenuItem] = []
  var links: [TextLink] = [] {
    didSet { setNeedsContentUpdate() }
  }
  var selectionColor: UIColor? {
    didSet { textView.tintColor = selectionColor }
  }

  private static let linkScheme = "selectable-text-link"
  private static let paragraphClass: AnyClass? = NSClassFromString("RCTParagraphComponentView")

  private let textView: UITextView
  private let hiddenViews = NSHashTable<UIView>.weakObjects()
  private var sourceText: NSAttributedString?

  public required init(appContext: AppContext? = nil) {
    // TextKit 1, so lines break exactly like they do in React Native's paragraph.
    textView = UITextView(usingTextLayoutManager: false)
    super.init(appContext: appContext)

    textView.isEditable = false
    textView.isSelectable = true
    textView.isScrollEnabled = false
    textView.backgroundColor = .clear
    textView.textContainerInset = .zero
    textView.textContainer.lineFragmentPadding = 0
    textView.dataDetectorTypes = []
    // Keep the link styling React Native already applied instead of UIKit's default blue.
    textView.linkTextAttributes = [:]
    textView.delegate = self
    // Must stay the last subview: React Native expects its children at the indices it mounted them at.
    addSubview(textView)
  }

  func setNeedsContentUpdate() {
    sourceText = nil
    setNeedsLayout()
  }

  // MARK: - React Native children

  override func didAddSubview(_ subview: UIView) {
    super.didAddSubview(subview)
    guard subview !== textView else { return }
    bringSubviewToFront(textView)
    setNeedsContentUpdate()
  }

  override func willRemoveSubview(_ subview: UIView) {
    super.willRemoveSubview(subview)
    // React Native recycles its views, so they must be visible again before they are reused elsewhere.
    for view in hiddenViews.allObjects where view === subview || view.isDescendant(of: subview) {
      view.isHidden = false
      hiddenViews.remove(view)
    }
    if subview !== textView {
      setNeedsContentUpdate()
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    updateContent()
  }

  private func updateContent() {
    guard let paragraph = firstParagraph(in: self) else {
      textView.attributedText = nil
      return
    }

    let frame = paragraph.convert(paragraph.bounds, to: self)
    if textView.frame != frame {
      textView.frame = frame
    }

    guard let source = paragraph.value(forKey: "attributedText") as? NSAttributedString, source.length > 0 else {
      return
    }
    // Reassigning the text drops the user's selection, so only do it when the content really changed.
    if let sourceText, sourceText.isEqual(to: source) {
      return
    }
    sourceText = source

    let text = NSMutableAttributedString(attributedString: source)
    applyLinks(to: text)
    textView.attributedText = text

    paragraph.isHidden = true
    hiddenViews.add(paragraph)
  }

  private func firstParagraph(in view: UIView) -> UIView? {
    guard let paragraphClass = Self.paragraphClass else { return nil }
    for subview in view.subviews where subview !== textView {
      if subview.isKind(of: paragraphClass) {
        return subview
      }
      if let paragraph = firstParagraph(in: subview) {
        return paragraph
      }
    }
    return nil
  }

  // MARK: - Links

  private func applyLinks(to text: NSMutableAttributedString) {
    let string = text.string as NSString
    var searchStart = 0

    for (index, link) in links.enumerated() {
      guard let range = range(of: link, in: string, searchingFrom: searchStart),
            let url = URL(string: "\(Self.linkScheme)://\(index)") else {
        continue
      }
      text.addAttribute(.link, value: url, range: range)
      searchStart = NSMaxRange(range)
    }
  }

  /// The offsets come from the HTML tree in JS. If they don't line up with the rendered text
  /// (e.g. a collapsed line break), fall back to finding the link's text after the previous link.
  private func range(of link: TextLink, in string: NSString, searchingFrom searchStart: Int) -> NSRange? {
    let expected = NSRange(location: link.start, length: link.end - link.start)
    if expected.location >= 0, expected.length > 0, NSMaxRange(expected) <= string.length,
       link.text.isEmpty || string.substring(with: expected) == link.text {
      return expected
    }

    guard !link.text.isEmpty, searchStart < string.length else {
      return nil
    }
    let found = string.range(of: link.text, range: NSRange(location: searchStart, length: string.length - searchStart))
    return found.location == NSNotFound ? nil : found
  }

  private func linkIndex(for url: URL) -> Int? {
    guard url.scheme == Self.linkScheme, let host = url.host, let index = Int(host), links.indices.contains(index) else {
      return nil
    }
    return index
  }

  private func pressLink(at index: Int) {
    onLinkPress(["index": index, "href": links[index].href])
  }

  // MARK: - Edit menu

  private func performMenuAction(_ id: String) {
    let range = textView.selectedRange
    guard range.location != NSNotFound, range.length > 0, let string = textView.attributedText?.string as NSString? else {
      return
    }

    onMenuAction([
      "id": id,
      "text": string.substring(with: range),
      "start": range.location,
      "end": NSMaxRange(range),
    ])

    textView.selectedRange = NSRange(location: 0, length: 0)
    textView.resignFirstResponder()
  }

  // MARK: - UITextViewDelegate

  func textView(_ textView: UITextView, editMenuForTextIn range: NSRange, suggestedActions: [UIMenuElement]) -> UIMenu? {
    guard !menuItems.isEmpty else {
      return UIMenu(children: suggestedActions)
    }
    return UIMenu(children: menuItems.map { item in
      UIAction(title: item.title) { [weak self] _ in
        self?.performMenuAction(item.id)
      }
    })
  }

  @available(iOS 17.0, *)
  func textView(_ textView: UITextView, primaryActionFor textItem: UITextItem, defaultAction: UIAction) -> UIAction? {
    guard case .link(let url) = textItem.content, let index = linkIndex(for: url) else {
      return defaultAction
    }
    return UIAction { [weak self] _ in
      self?.pressLink(at: index)
    }
  }

  @available(iOS 17.0, *)
  func textView(_ textView: UITextView, menuConfigurationFor textItem: UITextItem, defaultMenu: UIMenu) -> UITextItem.MenuConfiguration? {
    // No link preview on long press: in this view long press is for selecting text.
    guard case .link(let url) = textItem.content, linkIndex(for: url) != nil else {
      return UITextItem.MenuConfiguration(menu: defaultMenu)
    }
    return nil
  }

  // iOS 16 only; iOS 17+ uses the two UITextItem methods above.
  func textView(_ textView: UITextView, shouldInteractWith URL: URL, in characterRange: NSRange, interaction: UITextItemInteraction) -> Bool {
    guard let index = linkIndex(for: URL) else {
      return true
    }
    if interaction == .invokeDefaultAction {
      pressLink(at: index)
    }
    return false
  }
}
