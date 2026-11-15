extends Control
## Settings button (top-right) and modal panel. Esc toggles it; it can't open mid-pump.

const THEME := preload("res://resources/gss_theme.tres")

var _open_button: Button
var _panel: PanelContainer
var _view_buttons := {}


func _ready() -> void:
	theme = THEME
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build_open_button()
	_build_panel()
	Settings.camera_view_changed.connect(_sync_view_buttons)
	_sync_view_buttons(Settings.camera_view)


func _process(_delta: float) -> void:
	_open_button.disabled = GameState.phase == &"pumping"


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		_set_open(not _panel.visible)
		get_viewport().set_input_as_handled()


func _set_open(open: bool) -> void:
	if open and GameState.phase == &"pumping":
		return
	_panel.visible = open
	Settings.menu_open = open
	if open:
		_panel.pivot_offset = _panel.size / 2.0
		_panel.scale = Vector2(0.92, 0.92)
		_panel.modulate.a = 0.0
		var tw := create_tween().set_parallel()
		tw.tween_property(_panel, "scale", Vector2.ONE, 0.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tw.tween_property(_panel, "modulate:a", 1.0, 0.15)


func _build_open_button() -> void:
	_open_button = Button.new()
	_open_button.text = "Settings"
	_open_button.focus_mode = Control.FOCUS_NONE
	_open_button.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	_open_button.offset_left = -132
	_open_button.offset_top = 24
	_open_button.offset_right = -24
	_open_button.offset_bottom = 60
	_open_button.pressed.connect(_set_open.bind(true))
	_open_button.add_to_group(&"blocks_pump_click")
	add_child(_open_button)


func _build_panel() -> void:
	_panel = PanelContainer.new()
	_panel.visible = false
	_panel.set_anchors_preset(Control.PRESET_CENTER)
	_panel.custom_minimum_size = Vector2(420, 0)
	_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#fffdf7")
	style.set_corner_radius_all(16)
	style.set_content_margin_all(24)
	style.shadow_color = Color(0, 0, 0, 0.35)
	style.shadow_size = 18
	_panel.add_theme_stylebox_override("panel", style)
	_panel.add_to_group(&"blocks_pump_click")
	add_child(_panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 14)
	_panel.add_child(box)
	box.add_child(_label("Settings", 26, Color("#171717")))
	box.add_child(_label("Camera", 13, Color(0.45, 0.45, 0.45)))

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	box.add_child(row)
	var group := ButtonGroup.new()
	for view in Settings.VIEWS:
		var b := Button.new()
		b.text = Settings.VIEWS[view].label
		b.toggle_mode = true
		b.button_group = group
		b.focus_mode = Control.FOCUS_NONE
		b.custom_minimum_size = Vector2(0, 44)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.pressed.connect(Settings.set_camera_view.bind(view))
		row.add_child(b)
		_view_buttons[view] = b

	var close := Button.new()
	close.text = "Done  (Esc)"
	close.focus_mode = Control.FOCUS_NONE
	close.custom_minimum_size = Vector2(0, 40)
	close.pressed.connect(_set_open.bind(false))
	box.add_child(close)


func _sync_view_buttons(view: StringName) -> void:
	for v in _view_buttons:
		var b: Button = _view_buttons[v]
		b.set_pressed_no_signal(v == view)
		b.add_theme_color_override("font_color", Color.WHITE if v == view else Color("#171717"))
		var s := StyleBoxFlat.new()
		s.bg_color = Color("#087f5b") if v == view else Color("#ece7dc")
		s.set_corner_radius_all(12)
		b.add_theme_stylebox_override("normal", s)
		b.add_theme_stylebox_override("pressed", s)
		b.add_theme_stylebox_override("hover", s)
		b.add_theme_stylebox_override("hover_pressed", s)


func _label(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l
