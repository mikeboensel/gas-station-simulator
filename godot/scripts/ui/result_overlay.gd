extends CanvasLayer

const ResultStars := preload("res://scripts/ui/result_stars.gd")
## Over-target stops hold the panel back so the explosion reads first.
const EXPLOSION_HOLD_SEC := 1.4

@onready var panel: PanelContainer = %Panel
@onready var title: Label = %Title
@onready var subtitle: Label = %Subtitle
@onready var stopped: Label = %StoppedAt
@onready var target: Label = %TargetStat
@onready var delta: Label = %DeltaStat

var _fail_tween: Tween
var _score_label: Label
var _streak_label: Label
var _stars: Control
var _round_token := 0


func _ready() -> void:
	visible = false
	($Center as Control).theme = UiTheme.get_theme()
	GameState.round_finished.connect(_on_round_finished)
	GameState.round_reset.connect(_hide)
	_build_extras()


func _build_extras() -> void:
	var box := title.get_parent()
	_stars = ResultStars.new()
	box.add_child(_stars)
	box.move_child(_stars, title.get_index())
	_score_label = Label.new()
	_score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_score_label.theme_type_variation = &"DisplayMedium"
	box.add_child(_score_label)
	box.move_child(_score_label, subtitle.get_index() + 1)
	_streak_label = Label.new()
	_streak_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_streak_label.theme_type_variation = &"Caption"
	_streak_label.add_theme_color_override("font_color", UiTheme.PINK)
	box.add_child(_streak_label)
	box.move_child(_streak_label, _score_label.get_index() + 1)


func _on_round_finished(grade: Dictionary) -> void:
	var over: bool = grade.get("over", false)
	var perfect: bool = grade.get("perfect", false)
	var score := int(grade.get("score", 0))
	_round_token += 1
	if over:
		var token := _round_token
		await get_tree().create_timer(EXPLOSION_HOLD_SEC).timeout
		if GameState.phase != &"result" or token != _round_token:
			return
	stopped.text = "$%.2f" % GameState.shown_dollars()
	target.text = "$%.2f" % GameState.target_dollars

	var cents_off := float(grade.get("cents_off", 0)) / 100.0
	var accent := UiTheme.MUTED
	if over:
		title.text = "Over target"
		subtitle.text = "Stopped $%.2f past the target." % cents_off
		delta.text = "+$%.2f" % cents_off
		accent = UiTheme.RED
		_pulse_fail()
	elif perfect:
		title.text = "Perfect stop"
		subtitle.text = "Right on the money."
		delta.text = "$%.2f" % cents_off
		accent = UiTheme.GREEN
		_pulse_success()
	else:
		title.text = "So close" if cents_off <= 0.05 else ("Solid stop" if score > 0 else "Missed target")
		subtitle.text = "Just %d¢ short." % int(grade.get("cents_off", 0)) if cents_off <= 0.05 else grade.get("label", "")
		delta.text = "-$%.2f" % cents_off
		accent = UiTheme.AMBER if score > 0 else UiTheme.MUTED
	title.add_theme_color_override("font_color", accent)
	delta.add_theme_color_override("font_color", accent)
	_score_label.add_theme_color_override("font_color", accent)
	panel.add_theme_stylebox_override("panel", UiTheme.card(accent))

	var streak := int(grade.get("streak", 0))
	_streak_label.text = "Streak ×%d  ·  best %d" % [streak, GameState.best_streak] if streak >= 2 else ""
	_streak_label.visible = streak >= 2
	_score_label.visible = score > 0
	_count_up(score)
	_stars.call("reveal", _star_count(grade))

	visible = true
	var dim := %Dim as ColorRect
	dim.color.a = 0.0
	create_tween().tween_property(dim, "color:a", 0.45, 0.25)
	await get_tree().process_frame
	panel.pivot_offset = panel.size / 2.0
	title.pivot_offset = title.size / 2.0
	panel.scale = Vector2(0.8, 0.8)
	panel.modulate.a = 0.0
	panel.rotation = -0.04 if over else 0.03
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(panel, "modulate:a", 1.0, 0.18)
	tw.tween_property(panel, "scale", Vector2.ONE, 0.45).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(panel, "rotation", 0.0, 0.4).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	title.scale = Vector2(1.6, 1.6)
	tw.tween_property(title, "scale", Vector2.ONE, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT).set_delay(0.08)


func _star_count(grade: Dictionary) -> int:
	if grade.get("over", false):
		return 0
	if grade.get("perfect", false):
		return 3
	var cents := float(grade.get("cents_off", 99.0))
	if cents <= 5.0:
		return 2
	return 1 if int(grade.get("score", 0)) > 0 else 0


func _count_up(score: int) -> void:
	_score_label.text = "+0 pts"
	var tw := create_tween()
	tw.tween_interval(0.25)
	tw.tween_method(func(v: float) -> void: _score_label.text = "+%d pts" % int(v), 0.0, float(score), 0.7)\
		.set_trans(Tween.TRANS_QUART).set_ease(Tween.EASE_OUT)
	tw.tween_callback(_pop_score)


func _pop_score() -> void:
	_score_label.pivot_offset = _score_label.size / 2.0
	_score_label.scale = Vector2(1.3, 1.3)
	create_tween().tween_property(_score_label, "scale", Vector2.ONE, 0.25).set_trans(Tween.TRANS_BACK)


func _pulse_fail() -> void:
	if _fail_tween:
		_fail_tween.kill()
	var bg := %FailFlash as ColorRect
	bg.color = Color(0.85, 0.18, 0.12, 0.0)
	_fail_tween = create_tween()
	_fail_tween.tween_property(bg, "color:a", 0.32, 0.06)
	_fail_tween.tween_property(bg, "color:a", 0.05, 0.1)
	_fail_tween.tween_property(bg, "color:a", 0.22, 0.06)
	_fail_tween.tween_property(bg, "color:a", 0.0, 0.4)


func _pulse_success() -> void:
	var bg := %SuccessFlash as ColorRect
	bg.color = Color(0.85, 1.0, 0.9, 0.0)
	var tw := create_tween()
	tw.tween_property(bg, "color:a", 0.55, 0.04)
	tw.tween_property(bg, "color", Color(0.05, 0.6, 0.42, 0.18), 0.12)
	tw.tween_property(bg, "color:a", 0.0, 0.5)


func _on_try_same_pressed() -> void:
	GameState.try_same_target()


func _on_next_pressed() -> void:
	GameState.pick_new_target()


func _hide() -> void:
	visible = false