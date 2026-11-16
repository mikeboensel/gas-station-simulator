class_name UiTheme
extends RefCounted
## Shared look for every menu: dark glass cards, condensed pump-display numerals, chunky buttons.
## Type variations: Caption, Muted, Display, DisplayMedium, DisplaySmall, Title, Pill (Label);
## Tile (PanelContainer); PrimaryButton, SegmentButton (Button).

const BG := Color(0.065, 0.07, 0.085, 0.9)
const TILE := Color(1, 1, 1, 0.05)
const LINE := Color(1, 1, 1, 0.1)
const TEXT := Color("#f5f3ee")
const MUTED := Color("#9b9ba8")
const GREEN := Color("#16c58f")
const GREEN_DARK := Color("#0b7a59")
const AMBER := Color("#ffb627")
const RED := Color("#ff4d3d")
const PINK := Color("#ff6ad5")

static var _theme: Theme


static func get_theme() -> Theme:
	if _theme == null:
		_theme = _build()
	return _theme


static func card(accent: Color = GREEN) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = BG
	s.set_corner_radius_all(18)
	s.border_width_top = 4
	s.border_color = accent
	s.shadow_color = Color(0, 0, 0, 0.45)
	s.shadow_size = 28
	s.shadow_offset = Vector2(0, 10)
	s.content_margin_left = 26
	s.content_margin_right = 26
	s.content_margin_top = 22
	s.content_margin_bottom = 24
	return s


static func pill(bg: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(999)
	s.content_margin_left = 12
	s.content_margin_right = 12
	s.content_margin_top = 4
	s.content_margin_bottom = 4
	return s


static func display_font() -> Font:
	return _system_font(["DIN Condensed", "Avenir Next Condensed", "Futura"], 700)


static func _build() -> Theme:
	var t := Theme.new()
	var body := _system_font(["Avenir Next", "Helvetica Neue", "Segoe UI"], 500)
	var bold := _system_font(["Avenir Next", "Helvetica Neue", "Segoe UI"], 700)
	var caps := FontVariation.new()
	caps.base_font = _system_font(["Avenir Next", "Helvetica Neue", "Segoe UI"], 600)
	caps.spacing_glyph = 2
	var display := display_font()

	t.default_font = body
	t.default_font_size = 18
	t.set_color("font_color", "Label", TEXT)

	_label_variation(t, "Caption", caps, 13, MUTED)
	_label_variation(t, "Muted", body, 15, MUTED)
	_label_variation(t, "Display", display, 72, AMBER)
	_label_variation(t, "DisplayMedium", display, 50, TEXT)
	_label_variation(t, "DisplaySmall", display, 36, TEXT)
	_label_variation(t, "Title", display, 64, TEXT)
	_label_variation(t, "Pill", caps, 12, TEXT)
	t.set_stylebox("normal", "Pill", pill(Color(1, 1, 1, 0.1)))

	t.set_stylebox("panel", "PanelContainer", card())
	t.set_type_variation("Tile", "PanelContainer")
	var tile := StyleBoxFlat.new()
	tile.bg_color = TILE
	tile.set_corner_radius_all(12)
	tile.set_border_width_all(1)
	tile.border_color = Color(1, 1, 1, 0.06)
	tile.content_margin_left = 14
	tile.content_margin_right = 14
	tile.content_margin_top = 10
	tile.content_margin_bottom = 12
	t.set_stylebox("panel", "Tile", tile)

	var line := StyleBoxLine.new()
	line.color = LINE
	line.thickness = 1
	t.set_stylebox("separator", "HSeparator", line)
	t.set_constant("separation", "HSeparator", 14)

	_button(t, "Button", Color(1, 1, 1, 0.07), Color(1, 1, 1, 0.13), Color(1, 1, 1, 0.16), TEXT, bold)
	t.set_type_variation("PrimaryButton", "Button")
	_button(t, "PrimaryButton", GREEN, GREEN.lightened(0.15), GREEN_DARK, Color.WHITE, bold)
	t.set_type_variation("SegmentButton", "Button")
	_button(t, "SegmentButton", Color(1, 1, 1, 0.06), Color(1, 1, 1, 0.11), Color(1, 1, 1, 0.12), MUTED, bold)
	t.set_stylebox("pressed", "SegmentButton", _button_box(GREEN, GREEN_DARK, 4))
	t.set_stylebox("hover_pressed", "SegmentButton", _button_box(GREEN.lightened(0.1), GREEN_DARK, 4))
	t.set_color("font_pressed_color", "SegmentButton", Color.WHITE)
	t.set_color("font_hover_pressed_color", "SegmentButton", Color.WHITE)
	return t


static func _label_variation(t: Theme, name: String, font: Font, size: int, color: Color) -> void:
	t.set_type_variation(name, "Label")
	t.set_font("font", name, font)
	t.set_font_size("font_size", name, size)
	t.set_color("font_color", name, color)


static func _button(t: Theme, type: String, bg: Color, hover: Color, edge: Color, fg: Color, font: Font) -> void:
	t.set_stylebox("normal", type, _button_box(bg, edge, 4))
	t.set_stylebox("hover", type, _button_box(hover, edge, 4))
	var pressed := _button_box(bg.darkened(0.08), edge, 1)
	pressed.content_margin_top += 3
	t.set_stylebox("pressed", type, pressed)
	var disabled := _button_box(Color(bg, bg.a * 0.4), Color(edge, 0.2), 4)
	t.set_stylebox("disabled", type, disabled)
	t.set_stylebox("focus", type, StyleBoxEmpty.new())
	t.set_font("font", type, font)
	t.set_font_size("font_size", type, 18)
	for state in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color", "font_hover_pressed_color"]:
		t.set_color(state, type, fg)
	t.set_color("font_disabled_color", type, Color(fg, 0.35))


static func _button_box(bg: Color, edge: Color, depth: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(12)
	s.border_width_bottom = depth
	s.border_color = edge
	s.content_margin_left = 22
	s.content_margin_right = 22
	s.content_margin_top = 12
	s.content_margin_bottom = 12 - (depth - 4)
	return s


static func _system_font(names: Array, weight: int) -> SystemFont:
	var f := SystemFont.new()
	f.font_names = PackedStringArray(names)
	f.font_weight = weight
	f.antialiasing = TextServer.FONT_ANTIALIASING_GRAY
	return f
