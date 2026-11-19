package com.physiotutors.selectabletext

import android.content.Context
import android.graphics.drawable.Drawable
import android.os.Build
import android.text.Editable
import android.text.Spannable
import android.text.TextWatcher
import android.text.style.BackgroundColorSpan
import android.view.ActionMode
import android.view.Menu
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/**
 * Replaces the text selection menu of the React Native <Text> inside it with custom items.
 *
 * Unlike iOS, Android needs no overlay: the <Text> is rendered with `selectable`, so React Native's
 * own TextView does the drag-to-select, and taps on nested links still reach JS through React
 * Native's touch handling.
 */
class SelectableTextView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onMenuAction by EventDispatcher()

  var menuItems: List<MenuItem> = emptyList()

  var highlights: List<TextHighlight> = emptyList()
    set(value) {
      field = value
      applyHighlights()
    }
  var highlightColor: Int? = null
    set(value) {
      field = value
      applyHighlights()
    }

  private class SavedHighlight(color: Int) : BackgroundColorSpan(color)
  private val textWatcher = object : TextWatcher {
    override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
    override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = applyHighlights()
    override fun afterTextChanged(s: Editable?) = Unit
  }

  var handleColor: Int? = null
    set(value) {
      field = value
      applyHandleColor()
    }

  private var textView: TextView? = null

  /** The TextView's own selection handles, put back when it's detached. */
  private var originalHandles: Pair<Drawable?, Drawable?>? = null

  private val selectionCallback = object : ActionMode.Callback {
    override fun onCreateActionMode(mode: ActionMode, menu: Menu) = true

    // Runs after the TextView added its own items (copy, share, translate, ...), so swap them for ours.
    override fun onPrepareActionMode(mode: ActionMode, menu: Menu): Boolean {
      menu.clear()
      menuItems.forEachIndexed { index, item ->
        menu.add(Menu.NONE, index, index, item.title)
      }
      return true
    }

    override fun onActionItemClicked(mode: ActionMode, item: android.view.MenuItem): Boolean {
      val menuItem = menuItems.getOrNull(item.itemId) ?: return false
      val textView = textView ?: return false
      val start = minOf(textView.selectionStart, textView.selectionEnd)
      val end = maxOf(textView.selectionStart, textView.selectionEnd)
      if (start < 0 || end <= start) {
        return false
      }

      onMenuAction(
        mapOf(
          "id" to menuItem.id,
          "text" to textView.text.subSequence(start, end).toString(),
          "start" to start,
          "end" to end
        )
      )
      mode.finish()
      return true
    }

    override fun onDestroyActionMode(mode: ActionMode) = Unit
  }

  // React Native measures and positions the <Text> inside this view. ExpoView is a LinearLayout,
  // which would otherwise measure and lay out the child again whenever Android runs its own layout
  // pass (e.g. when returning to a screen that was built while the app was in the background): the
  // text then shrinks to nothing or wraps one letter per line. React Native's own container views
  // skip both steps in the same way.
  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) = Unit

  override fun onViewAdded(child: View) {
    super.onViewAdded(child)
    attach()
  }

  override fun onViewRemoved(child: View) {
    super.onViewRemoved(child)
    // React Native recycles its views, so don't leave this menu on a TextView that gets reused elsewhere.
    val current = textView ?: return
    if (current === child || current.isInside(child)) {
      detach()
    }
  }

  private fun attach() {
    val found = findTextView(this) ?: return
    if (found === textView) {
      return
    }
    detach()
    found.customSelectionActionModeCallback = selectionCallback
    textView = found
    found.addTextChangedListener(textWatcher)
    applyHighlights()
    applyHandleColor()
  }

  private fun detach() {
    restoreHandles()
    textView?.removeTextChangedListener(textWatcher)
    (textView?.text as? Spannable)?.let { text ->
      text.getSpans(0, text.length, SavedHighlight::class.java).forEach { text.removeSpan(it) }
    }
    textView?.customSelectionActionModeCallback = null
    textView = null
  }

  private fun applyHighlights() {
    val view = textView ?: return
    // Selectable TextView uses a Spannable buffer; never replace it or lose React Native's links.
    val text = view.text as? Spannable ?: return
    text.getSpans(0, text.length, SavedHighlight::class.java).forEach { text.removeSpan(it) }
    val color = highlightColor ?: return
    highlights.filter { it.start >= 0 && it.end > it.start && it.end <= text.length }.forEach {
      text.setSpan(SavedHighlight(color), it.start, it.end, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
    }
    view.invalidate()
  }

  // Per-view selection handles exist since Android 10; older versions keep the theme's accent color.
  private fun applyHandleColor() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      return
    }
    val textView = textView ?: return
    val color = handleColor ?: return restoreHandles()

    val (left, right) = originalHandles
      ?: (textView.textSelectHandleLeft to textView.textSelectHandleRight).also { originalHandles = it }
    left?.let { textView.setTextSelectHandleLeft(it.tinted(color)) }
    right?.let { textView.setTextSelectHandleRight(it.tinted(color)) }
  }

  private fun restoreHandles() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      return
    }
    val textView = textView ?: return
    val (left, right) = originalHandles ?: return
    left?.let { textView.setTextSelectHandleLeft(it) }
    right?.let { textView.setTextSelectHandleRight(it) }
    originalHandles = null
  }

  // A copy, so the tint doesn't leak into other views that share the theme's drawable.
  private fun Drawable.tinted(color: Int): Drawable =
    (constantState?.newDrawable(resources) ?: this).mutate().apply { setTint(color) }

  private fun findTextView(view: View): TextView? {
    if (view is TextView) {
      return view
    }
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) {
        findTextView(view.getChildAt(i))?.let { return it }
      }
    }
    return null
  }

  private fun View.isInside(ancestor: View): Boolean {
    var parent = parent
    while (parent is View) {
      if (parent === ancestor) {
        return true
      }
      parent = parent.parent
    }
    return false
  }
}
