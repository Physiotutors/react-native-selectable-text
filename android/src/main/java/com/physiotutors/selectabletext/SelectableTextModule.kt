package com.physiotutors.selectabletext

import android.graphics.Color
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class MenuItem : Record {
  @Field
  val id: String = ""

  @Field
  val title: String = ""
}

class TextHighlight : Record {
  @Field val start: Int = 0
  @Field val end: Int = 0
}

class SelectableTextModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PhysiotutorsSelectableText")

    View(SelectableTextView::class) {
      Events("onMenuAction")

      Prop("menuItems") { view: SelectableTextView, items: List<MenuItem> ->
        view.menuItems = items
      }

      Prop("highlights") { view: SelectableTextView, highlights: List<TextHighlight> ->
        view.highlights = highlights
      }

      Prop("highlightColor") { view: SelectableTextView, color: Color? ->
        view.highlightColor = color?.toArgb()
      }

      Prop("handleColor") { view: SelectableTextView, color: Color? ->
        view.handleColor = color?.toArgb()
      }
    }
  }
}
