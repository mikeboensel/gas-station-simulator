extends Control

## Three drawn stars that pop in one at a time on the result card.

const GOLD := Color("#f6b51e")
const EMPTY := Color(0, 0, 0, 0.16)
const RADIUS := 30.0
const GAP := 84.0

var _lit := 0
var _scales: Array[float] = [0.0, 0.0, 0.0]


func _ready() -> void:
	custom_minimum_size = Vector2(0, RADIUS * 2.0 + 8.0)


func reveal(count: int) -> void:
	_lit = count
	_scales = [0.0, 0.0, 0.0]
	var tw := create_tween()
	for i in 3:
		tw.tween_interval(0.08 if i == 0 else 0.1)
		tw.tween_method(_set_scale.bind(i), 0.0, 1.0, 0.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		if i < count:
			tw.tween_callback(_chime.bind(i))


func _set_scale(v: float, i: int) -> void:
	_scales[i] = v
	queue_redraw()


func _chime(i: int) -> void:
	if Sfx.has_method("play_star"):
		Sfx.play_star(i)


func _draw() -> void:
	var cx := size.x / 2.0
	for i in 3:
		var s := _scales[i]
		if s <= 0.0:
			continue
		var c := Vector2(cx + (i - 1) * GAP, size.y / 2.0 + (6.0 if i != 1 else 0.0))
		var r := RADIUS * s * (1.15 if i == 1 else 1.0)
		var lit := i < _lit
		draw_colored_polygon(_star(c, r), GOLD if lit else EMPTY)
		if lit:
			draw_colored_polygon(_star(c + Vector2(-r * 0.12, -r * 0.12), r * 0.45), Color(1, 1, 1, 0.35))


func _star(c: Vector2, r: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for k in 10:
		var a := -PI / 2.0 + k * PI / 5.0
		var rr := r if k % 2 == 0 else r * 0.45
		pts.append(c + Vector2(cos(a), sin(a)) * rr)
	return pts