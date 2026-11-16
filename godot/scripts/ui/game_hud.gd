extends Control

@onready var target_label: Label = %TargetAmount
@onready var showing_label: Label = %NowShowing
@onready var status_badge: Label = %StatusBadge
@onready var flow_status: Label = %FlowStatus
@onready var session_label: Label = %SessionScore
@onready var detail_label: Label = %RoundDetail

var _flowing := false
var _last_shown_cents := -1


func _ready() -> void:
	theme = UiTheme.get_theme()
	Settings.stop_assist_changed.connect(_on_stop_assist_changed)
	_on_stop_assist_changed(Settings.stop_assist)
	GameState.round_finished.connect(_on_round_finished)
	GameState.flow_changed.connect(_on_flow_changed)
	GameState.round_reset.connect(_refresh_all)
	GameState.perfect_zone_entered.connect(_on_perfect_zone)
	_add_hint()
	_refresh_all()


func _process(_delta: float) -> void:
	if GameState.phase == &"pumping" or GameState.phase == &"ready":
		_update_live()


func _on_flow_changed(flowing: bool) -> void:
	_flowing = flowing
	flow_status.text = ("Fuel flowing" if flowing else "No flow") + " · %s flow" % GameState.flow_speed_label()


func _on_round_finished(grade: Dictionary) -> void:
	_update_live()
	_flowing = false
	flow_status.text = "No flow"
	session_label.text = "Session: %d pts" % GameState.total_score
	_pop(session_label, 1.25)
	if grade.over:
		detail_label.text = grade.label
	else:
		var short_dollars: float = float(grade.cents_off) / 100.0
		detail_label.text = "%s · $%.2f short · +%d" % [grade.label, short_dollars, grade.score]


func _update_live() -> void:
	showing_label.text = "$%.2f" % GameState.shown_dollars()
	var cents := GameState.shown_cents()
	if cents != _last_shown_cents and _flowing:
		_pulse_showing()
	_last_shown_cents = cents
	showing_label.add_theme_color_override(
		"font_color",
		UiTheme.RED if GameState.is_over_target() else (
			UiTheme.GREEN if GameState.in_perfect_zone() else UiTheme.TEXT
		)
	)
	if GameState.is_over_target():
		_set_badge("Over target", true)
	elif GameState.in_perfect_zone():
		_set_badge("Perfect zone", false, true)
	elif _flowing:
		_set_badge("Keep pumping", false)
	elif GameState.phase == &"ready":
		_set_badge("Ready", false)


func _refresh_all() -> void:
	_last_shown_cents = 0
	_flowing = false
	flow_status.text = "Pump ready · %s flow" % GameState.flow_speed_label()
	target_label.text = "$%.2f" % GameState.target_dollars
	showing_label.text = "$0.00"
	showing_label.scale = Vector2.ONE
	session_label.text = "Session: %d pts" % GameState.total_score
	detail_label.text = "Hold nozzle / space to pump."
	_set_badge("Ready", false)
	_pop(target_label, 1.35)


func _pop(label: Label, peak: float) -> void:
	label.pivot_offset = Vector2(0, label.size.y / 2.0)
	label.scale = Vector2(peak, peak)
	create_tween().tween_property(label, "scale", Vector2.ONE, 0.4)\
		.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)


func _set_badge(text: String, danger: bool, perfect: bool = false) -> void:
	if status_badge.text == text:
		return
	status_badge.text = text
	var bg := UiTheme.RED if danger else (UiTheme.GREEN if perfect else Color(1, 1, 1, 0.12))
	status_badge.add_theme_stylebox_override("normal", UiTheme.pill(bg))


func _on_stop_assist_changed(mode: StringName) -> void:
	var solo := $Panel/VBox/Header/Solo as Label
	var assisted := mode != &"off"
	solo.text = "Assist: %s" % Settings.STOP_ASSISTS[mode] if assisted else "Solo run"
	solo.add_theme_color_override("font_color", Color("#2a1a00") if assisted else UiTheme.TEXT)
	solo.add_theme_stylebox_override("normal", UiTheme.pill(UiTheme.AMBER if assisted else UiTheme.GREEN_DARK))


func _add_hint() -> void:
	var bar := PanelContainer.new()
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var bg := UiTheme.pill(Color(0.05, 0.05, 0.07, 0.62))
	bg.content_margin_left = 16
	bg.content_margin_right = 16
	bg.content_margin_top = 6
	bg.content_margin_bottom = 6
	bar.add_theme_stylebox_override("panel", bg)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	bar.add_child(row)
	for pair in [["Space", "Pump"], ["R", "Next"], ["M", "Mute"], ["Tab", "Free cam"], ["Esc", "Settings"]]:
		var key := Label.new()
		key.text = pair[0]
		key.add_theme_font_size_override("font_size", 13)
		var cap := UiTheme.pill(Color(1, 1, 1, 0.16))
		cap.set_corner_radius_all(6)
		cap.content_margin_left = 8
		cap.content_margin_right = 8
		cap.content_margin_top = 1
		cap.content_margin_bottom = 1
		key.add_theme_stylebox_override("normal", cap)
		row.add_child(key)
		var what := Label.new()
		what.text = pair[1] + "   "
		what.theme_type_variation = &"Muted"
		what.add_theme_font_size_override("font_size", 13)
		row.add_child(what)
	var strip := CenterContainer.new()
	strip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	strip.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	strip.offset_top = -50
	strip.offset_bottom = -12
	strip.add_child(bar)
	add_child(strip)


func _pulse_showing() -> void:
	var tw := create_tween()
	showing_label.modulate = Color(1.18, 1.18, 1.18, 1.0)
	tw.tween_property(showing_label, "modulate", Color.WHITE, 0.14)


func _on_perfect_zone() -> void:
	var tw := create_tween()
	target_label.modulate = Color(0.82, 1.12, 0.95, 1.0)
	tw.tween_property(target_label, "modulate", Color.WHITE, 0.2)