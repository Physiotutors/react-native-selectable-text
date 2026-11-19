import ExpoModulesCore

struct MenuItem: Record {
  @Field var id: String = ""
  @Field var title: String = ""
}

struct TextLink: Record {
  @Field var start: Int = 0
  @Field var end: Int = 0
  @Field var href: String = ""
  @Field var text: String = ""
}

struct TextHighlight: Record {
  @Field var start: Int = 0
  @Field var end: Int = 0
}

public class SelectableTextModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PhysiotutorsSelectableText")

    View(SelectableTextView.self) {
      Events("onMenuAction", "onLinkPress")

      Prop("menuItems") { (view: SelectableTextView, items: [MenuItem]) in
        view.menuItems = items
      }

      Prop("links") { (view: SelectableTextView, links: [TextLink]) in
        view.links = links
      }

      Prop("highlights") { (view: SelectableTextView, highlights: [TextHighlight]) in
        view.highlights = highlights
      }

      Prop("highlightColor") { (view: SelectableTextView, color: UIColor?) in
        view.highlightColor = color
      }

      Prop("selectionColor") { (view: SelectableTextView, color: UIColor?) in
        view.selectionColor = color
      }

      // Changes whenever the rendered text changes, so the view re-reads it even if its size stays the same.
      Prop("contentKey") { (view: SelectableTextView, _: String?) in
        view.setNeedsContentUpdate()
      }
    }
  }
}
