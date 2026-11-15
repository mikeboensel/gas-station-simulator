extends Control

@onready var target_label: Label = %TargetAmount
@onready var showing_label: Label = %NowShowing
@onready var status_badge: Label = %StatusBadge
@onready var flow_status: Label = %FlowStatus
@onready var session_label: Label = %SessionScore
@onready var detail_label: Label = %RoundDetail

var _flowing := false
var _last_shown_cents := -1
var _hint: Label


func _ready() -> void:
	var solo := $Panel/Margin/VBox/Solo as Label
	if solo:
		var pill := StyleBoxFlat.new()
		pill.bg_color = Color("#087f5b")
		pill.set_corner_radius_all(14)
		pill.content_margin_left = 12
		pill.content_margin_right = 12
		pill.content_margin_top = 6
		pill.content_margin_bottom = 6
		solo.add_theme_stylebox_override("normal", pill)
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
		Color("#d92d20") if GameState.is_over_target() else (
			Color("#087f5b") if GameState.in_perfect_zone() else Color("#171717")
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
	status_badge.text = text
	status_badge.add_theme_color_override("font_color", Color.WHITE)
	if danger:
		status_badge.add_theme_stylebox_override(
			"normal",
			_make_badge_style(Color("#d92d20"))
		)
	elif perfect:
		status_badge.add_theme_stylebox_override("normal", _make_badge_style(Color("#087f5b")))
	else:
		status_badge.add_theme_stylebox_override("normal", _make_badge_style(Color("#171717")))


func _make_badge_style(bg: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(12)
	s.content_margin_left = 10
	s.content_margin_right = 10
	s.content_margin_top = 4
	s.content_margin_bottom = 4
	return s


func _add_hint() -> void:
	_hint = Label.new()
	_hint.text = "Space / click nozzle · M mute · R next · Tab free camera · Esc settings"
	_hint.add_theme_color_override("font_color", Color(1, 1, 1, 0.72))
	_hint.add_theme_font_size_override("font_size", 13)
	_hint.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	_hint.offset_top = -44
	_hint.offset_bottom = -16
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(_hint)


func _pulse_showing() -> void:
	var tw := create_tween()
	showing_label.modulate = Color(1.18, 1.18, 1.18, 1.0)
	tw.tween_property(showing_label, "modulate", Color.WHITE, 0.14)


func _on_perfect_zone() -> void:
	var tw := create_tween()
	target_label.modulate = Color(0.82, 1.12, 0.95, 1.0)
	tw.tween_property(target_label, "modulate", Color.WHITE, 0.2)