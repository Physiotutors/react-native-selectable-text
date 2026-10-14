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

class SelectableTextModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PhysiotutorsSelectableText")

    View(SelectableTextView::class) {
      Events("onMenuAction")

      Prop("menuItems") { view: SelectableTextView, items: List<MenuItem> ->
        view.menuItems = items
      }

      Prop("handleColor") { view: SelectableTextView, color: Color? ->
        view.handleColor = color?.toArgb()
      }
    }
  }
}
