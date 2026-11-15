extends Control

## Two fixed-scale meters (neither ever rescales, so fills only move forward):
## - main bar: $0 → just past the target
## - precision meter: last PRECISION_SPAN dollars before the target, fades in near the end
##   so the 5-cent perfect band is wide enough to aim at.

const BG := Color(0.04, 0.04, 0.07, 0.82)
const FILL_LOW := Color("#2fd987")
const FILL_HIGH := Color("#ffd23f")
const FILL_OVER := Color("#ff3b2f")
const PERFECT := Color("#7dffc4")
const PRECISION_SPAN := 0.6
const PRECISION_OVERSHOOT := 0.15
const PRECISION_SHOW_FROM := 1.6
const MAIN_TOP := 70.0

var _precision_alpha := 0.0
var _flash := 0.0
var _t := 0.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	GameState.dollar_crossed.connect(func(_d: int) -> void: _flash = 1.0)
	GameState.round_reset.connect(func() -> void: _precision_alpha = 0.0)


func _process(delta: float) -> void:
	_t += delta
	_flash = maxf(0.0, _flash - delta * 5.0)
	var near := GameState.dollars >= GameState.target_dollars - PRECISION_SHOW_FROM
	_precision_alpha = move_toward(_precision_alpha, 1.0 if near else 0.0, delta * 4.0)
	position.x = (get_parent_area_size().x - size.x) / 2.0
	queue_redraw()


func _draw() -> void:
	var target := GameState.target_dollars
	var dollars := GameState.shown_dollars()
	var fill_color := _fill_color()
	if _precision_alpha > 0.01:
		_draw_precision(Rect2(0, 0, size.x, MAIN_TOP - 10.0), target, dollars, fill_color)
	_draw_main(Rect2(0, MAIN_TOP, size.x, size.y - MAIN_TOP), target, dollars, fill_color)


func _draw_main(r: Rect2, target: float, dollars: float, fill_color: Color) -> void:
	var vmax := target * 1.12
	var bar := Rect2(r.position + Vector2(16, 30), Vector2(r.size.x - 32, r.size.y - 44))
	draw_style_box(_rounded(BG, 16), r)
	_draw_zone(bar, 0.0, vmax, target, 0.5)
	_draw_fill(bar, 0.0, vmax, dollars, fill_color)
	for d in range(1, int(vmax) + 1):
		var x := _x(bar, 0.0, vmax, float(d))
		draw_line(Vector2(x, bar.end.y - 8), Vector2(x, bar.end.y), Color(1, 1, 1, 0.35), 1.0)
	var tx := _x(bar, 0.0, vmax, target)
	draw_line(Vector2(tx, bar.position.y - 6), Vector2(tx, bar.end.y + 4), Color.WHITE, 3.0)
	var font := get_theme_default_font()
	var y := r.position.y + 22
	draw_string(font, Vector2(r.position.x + 16, y), "$%.2f" % dollars, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, fill_color.lightened(0.3))
	if GameState.phase == &"pumping" and not GameState.is_over_target():
		draw_string(font, Vector2(r.position.x + 100, y), "$%.2f to go" % (target - dollars), HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(1, 1, 1, 0.6))
	draw_string(font, Vector2(r.end.x - 196, y), "TARGET $%.2f" % target, HORIZONTAL_ALIGNMENT_RIGHT, 180, 15, Color(1, 1, 1, 0.85))


func _draw_precision(r: Rect2, target: float, dollars: float, fill_color: Color) -> void:
	var a := _precision_alpha
	var vmin := target - PRECISION_SPAN
	var vmax := target + PRECISION_OVERSHOOT
	var inset := Rect2(r.position + Vector2(60, 0), Vector2(r.size.x - 120, r.size.y))
	draw_style_box(_rounded(Color(BG, BG.a * a), 12), inset)
	var bar := Rect2(inset.position + Vector2(12, 8), Vector2(inset.size.x - 24, inset.size.y - 26))
	_draw_zone(bar, vmin, vmax, target, a)
	_draw_fill(bar, vmin, vmax, dollars, Color(fill_color, a))
	var font := get_theme_default_font()
	for i in int(round(PRECISION_SPAN * 10.0)) + 1:
		var v := target - i * 0.1
		var x := _x(bar, vmin, vmax, v)
		draw_line(Vector2(x, bar.end.y), Vector2(x, bar.end.y + 4), Color(1, 1, 1, 0.5 * a), 1.0)
		var txt := "%d¢" % (i * 10) if i > 0 else "0"
		draw_string(font, Vector2(x - 20, bar.end.y + 15), txt, HORIZONTAL_ALIGNMENT_CENTER, 40, 11, Color(1, 1, 1, 0.55 * a))
	var tx := _x(bar, vmin, vmax, target)
	draw_line(Vector2(tx, bar.position.y - 4), Vector2(tx, bar.end.y + 2), Color(1, 1, 1, a), 2.0)


func _draw_zone(bar: Rect2, vmin: float, vmax: float, target: float, alpha: float) -> void:
	var l := _x(bar, vmin, vmax, target - GameState.PERFECT_ZONE_DOLLARS)
	var r := _x(bar, vmin, vmax, target)
	var pulse := 0.4 + 0.3 * (0.5 + 0.5 * sin(_t * (5.0 + 8.0 * GameState.tension())))
	draw_rect(Rect2(l, bar.position.y - 3, maxf(2.0, r - l), bar.size.y + 6), Color(PERFECT, pulse * alpha))


func _draw_fill(bar: Rect2, vmin: float, vmax: float, value: float, color: Color) -> void:
	var right := clampf(_x(bar, vmin, vmax, value), bar.position.x, bar.end.x)
	if right <= bar.position.x:
		return
	var fill := Rect2(bar.position, Vector2(right - bar.position.x, bar.size.y))
	draw_style_box(_rounded(color.lerp(Color.WHITE, _flash * 0.35), 5), fill)
	draw_rect(Rect2(fill.position, Vector2(fill.size.x, 3)), Color(1, 1, 1, 0.3 * color.a))
	draw_rect(Rect2(right - 2, bar.position.y - 3, 4, bar.size.y + 6), Color(1, 1, 1, 0.9 * color.a))


func _fill_color() -> Color:
	if GameState.is_over_target():
		return FILL_OVER if fmod(_t, 0.2) < 0.1 else FILL_OVER.darkened(0.35)
	return FILL_LOW.lerp(FILL_HIGH, GameState.tension())


func _x(bar: Rect2, vmin: float, vmax: float, value: float) -> float:
	return bar.position.x + (value - vmin) / maxf(0.001, vmax - vmin) * bar.size.x


func _rounded(color: Color, radius: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = color
	s.set_corner_radius_all(radius)
	return s