extends CanvasLayer

## Full-screen feedback: tension vignette (heartbeat pulse near target, red when over)
## and punchy pop-up words for milestones.

const VIGNETTE_SHADER := preload("res://shaders/tension_vignette.gdshader")
const IDLE_TINT := Color(0.02, 0.0, 0.06)
const PERFECT_TINT := Color(0.0, 0.35, 0.18)
const OVER_TINT := Color(0.6, 0.0, 0.0)

var _vignette: ColorRect
var _mat: ShaderMaterial
var _popups: Control
var _t := 0.0


func _ready() -> void:
	layer = 4
	_vignette = ColorRect.new()
	_vignette.set_anchors_preset(Control.PRESET_FULL_RECT)
	_vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mat = ShaderMaterial.new()
	_mat.shader = VIGNETTE_SHADER
	_mat.set_shader_parameter("tint", IDLE_TINT)
	_vignette.material = _mat
	add_child(_vignette)
	_popups = Control.new()
	_popups.set_anchors_preset(Control.PRESET_FULL_RECT)
	_popups.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_popups)
	GameState.went_over_target.connect(_on_went_over)
	GameState.false_start.connect(_popup.bind("HOLD TO PUMP", Color(1, 1, 1, 0.9), 56, 0.24))
	GameState.dollar_crossed.connect(_on_dollar)
	GameState.round_finished.connect(_on_round_finished)


func _process(delta: float) -> void:
	_t += delta
	var tension := GameState.tension() if GameState.phase == &"pumping" else 0.0
	var tint := IDLE_TINT
	if GameState.is_over_target():
		tint = OVER_TINT
	elif GameState.in_perfect_zone():
		tint = PERFECT_TINT
	var bpm := lerpf(1.2, 3.2, tension)
	var beat := pow(maxf(0.0, sin(_t * TAU * bpm)), 8.0) * tension
	var cur: Color = _mat.get_shader_parameter("tint")
	_mat.set_shader_parameter("tint", cur.lerp(tint, 1.0 - exp(-delta * 8.0)))
	_mat.set_shader_parameter("intensity", 0.28 + 0.32 * tension)
	_mat.set_shader_parameter("pulse", beat)


func _on_dollar(whole: int) -> void:
	if GameState.is_over_target():
		return
	var remaining := GameState.target_dollars - float(whole)
	if remaining <= 0.0 or remaining > 3.0:
		return
	var color := Color("#ffd36b") if remaining <= 2.0 else Color(1, 1, 1, 0.85)
	var size := 54 if remaining <= 2.0 else 40
	_popup("$%d" % whole, color, size, 0.62, Vector2(110.0 if whole % 2 == 0 else -110.0, 0))


func _on_went_over() -> void:
	_clear_popups()
	_popup("OVER!", Color("#ff4b3a"), 110, 0.24)


func _on_round_finished(grade: Dictionary) -> void:
	_clear_popups()
	if grade.get("over", false):
		_flash(Color(1.0, 0.82, 0.55, 0.85))
	if grade.get("perfect", false):
		_popup("PERFECT!", Color("#7dffc4"), 130, 0.13)
	elif not grade.get("over", false) and float(grade.get("cents_off", 99.0)) <= 5.0:
		_popup("SO CLOSE!", Color("#ffd36b"), 96, 0.13)
	var streak := int(grade.get("streak", 0))
	if streak >= 2:
		_popup("%d× STREAK" % streak, Color("#ff7ad9"), 52, 0.24)


func _flash(color: Color) -> void:
	var rect := ColorRect.new()
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rect.color = color
	add_child(rect)
	var tw := rect.create_tween()
	tw.tween_property(rect, "color:a", 0.0, 0.45).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)
	tw.tween_callback(rect.queue_free)


func _clear_popups() -> void:
	for child in _popups.get_children():
		child.queue_free()


func _popup(text: String, color: Color, size: int, y_frac: float, offset := Vector2.ZERO) -> void:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	label.add_theme_constant_override("outline_size", maxi(6, int(size / 9.0)))
	label.add_theme_color_override("font_shadow_color", Color(color, 0.45))
	label.add_theme_constant_override("shadow_offset_x", 0)
	label.add_theme_constant_override("shadow_offset_y", 6)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_popups.add_child(label)
	var view := _popups.get_viewport_rect().size
	label.reset_size()
	label.pivot_offset = label.size / 2.0
	label.position = Vector2(view.x / 2.0, view.y * y_frac) - label.size / 2.0 + offset
	label.scale = Vector2(2.2, 2.2)
	label.modulate.a = 0.0
	label.rotation = randf_range(-0.06, 0.06)
	var tw := label.create_tween()
	tw.set_parallel(true)
	tw.tween_property(label, "scale", Vector2.ONE, 0.32).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(label, "modulate:a", 1.0, 0.08)
	tw.chain().tween_interval(0.45)
	tw.chain().set_parallel(true)
	tw.tween_property(label, "position:y", label.position.y - 70.0, 0.45).set_ease(Tween.EASE_IN)
	tw.tween_property(label, "modulate:a", 0.0, 0.45)
	tw.chain().tween_callback(label.queue_free)