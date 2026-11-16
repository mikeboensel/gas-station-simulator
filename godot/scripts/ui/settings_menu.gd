extends Control
## Settings modal. Esc toggles it; it can't open mid-pump.

const VIEW_BLURBS := {
	&"pump": "Tight on the pump display. Best for precision.",
	&"chase": "Behind the car, the whole forecourt in view.",
}

var _dim: ColorRect
var _panel: PanelContainer
var _blurb: Label
var _view_buttons := {}
var _assist_buttons := {}
var _assist_blurb: Label


func _ready() -> void:
	theme = UiTheme.get_theme()
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build_panel()
	Settings.camera_view_changed.connect(_sync_view_buttons)
	_sync_view_buttons(Settings.camera_view)
	Settings.stop_assist_changed.connect(_sync_assist_buttons)
	_sync_assist_buttons(Settings.stop_assist)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		_set_open(not _panel.visible)
		get_viewport().set_input_as_handled()


func _set_open(open: bool) -> void:
	if open and GameState.phase == &"pumping":
		return
	_panel.visible = open
	_dim.visible = open
	Settings.menu_open = open
	if open:
		_panel.pivot_offset = _panel.size / 2.0
		_panel.scale = Vector2(0.92, 0.92)
		_panel.modulate.a = 0.0
		_dim.color.a = 0.0
		var tw := create_tween().set_parallel()
		tw.tween_property(_panel, "scale", Vector2.ONE, 0.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tw.tween_property(_panel, "modulate:a", 1.0, 0.15)
		tw.tween_property(_dim, "color:a", 0.45, 0.2)


func _build_panel() -> void:
	_dim = ColorRect.new()
	_dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_dim.color = Color(0.02, 0.02, 0.04, 0.0)
	_dim.visible = false
	_dim.add_to_group(&"blocks_pump_click")
	_dim.gui_input.connect(_on_dim_input)
	add_child(_dim)

	_panel = PanelContainer.new()
	_panel.visible = false
	_panel.set_anchors_preset(Control.PRESET_CENTER)
	_panel.custom_minimum_size = Vector2(500, 0)
	_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	_panel.add_to_group(&"blocks_pump_click")
	add_child(_panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	_panel.add_child(box)
	var title := Label.new()
	title.text = "Settings"
	title.uppercase = true
	title.theme_type_variation = &"Title"
	title.add_theme_font_size_override("font_size", 48)
	box.add_child(title)
	box.add_child(_label("Camera", &"Caption"))

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
		b.theme_type_variation = &"SegmentButton"
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.pressed.connect(Settings.set_camera_view.bind(view))
		row.add_child(b)
		_view_buttons[view] = b
	_blurb = _label("", &"Muted")
	box.add_child(_blurb)
	box.add_child(HSeparator.new())

	box.add_child(_label("Stop assist (testing)", &"Caption"))
	var assist_row := HBoxContainer.new()
	assist_row.add_theme_constant_override("separation", 10)
	box.add_child(assist_row)
	var assist_group := ButtonGroup.new()
	for mode in Settings.STOP_ASSISTS:
		var b := Button.new()
		b.text = Settings.STOP_ASSISTS[mode]
		b.toggle_mode = true
		b.button_group = assist_group
		b.focus_mode = Control.FOCUS_NONE
		b.theme_type_variation = &"SegmentButton"
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.pressed.connect(Settings.set_stop_assist.bind(mode))
		assist_row.add_child(b)
		_assist_buttons[mode] = b
	_assist_blurb = _label("", &"Muted")
	box.add_child(_assist_blurb)
	box.add_child(HSeparator.new())

	var close := Button.new()
	close.text = "Done"
	close.focus_mode = Control.FOCUS_NONE
	close.theme_type_variation = &"PrimaryButton"
	close.pressed.connect(_set_open.bind(false))
	box.add_child(close)
	var hint := _label("Esc to close", &"Muted")
	hint.add_theme_font_size_override("font_size", 13)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(hint)


func _on_dim_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		_set_open(false)


func _sync_view_buttons(view: StringName) -> void:
	for v in _view_buttons:
		(_view_buttons[v] as Button).set_pressed_no_signal(v == view)
	_blurb.text = VIEW_BLURBS.get(view, "")


func _sync_assist_buttons(mode: StringName) -> void:
	for m in _assist_buttons:
		(_assist_buttons[m] as Button).set_pressed_no_signal(m == mode)
	_assist_blurb.text = (
		"You stop the pump yourself." if mode == &"off"
		else "One click pumps; it stops itself. Resets when the game restarts."
	)


func _label(text: String, variation: StringName) -> Label:
	var l := Label.new()
	l.text = text
	l.theme_type_variation = variation
	if variation == &"Caption":
		l.uppercase = true
	return l
