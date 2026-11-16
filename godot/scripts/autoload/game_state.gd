extends Node

## Scoring matches the Phaser prototype + gasstationsimulator.com perfect zone.
## Diverges on purpose: odd targets, per-round flow speed, and nozzle ease-off near the target.

const PERFECT_ZONE_DOLLARS := 0.05
const PRICE_PER_GALLON := 3.0
const FLOW_GALLONS_PER_SEC := 0.78
const FLOW_RANGE := Vector2(0.35, 1.3)
## Over the last stretch the nozzle eases off to this fraction of full flow.
const EASE_OFF_FACTOR := 0.3
const EASE_OFF_START := 1.5
const EASE_OFF_END := 0.4
const TARGET_MIN := 6.0
const TARGET_MAX := 10.0
const TARGET_STEP := 0.25
const STOP_LATENCY_SEC := 0.14
## Rounds that would end below this are treated as an accidental tap, not a stop.
const FALSE_START_DOLLARS := 1.0

signal round_finished(grade: Dictionary)
signal flow_changed(flowing: bool)
signal round_reset
signal perfect_zone_entered
signal went_over_target
signal dollar_crossed(whole_dollars: int)
signal false_start

var target_dollars: float = 12.0
var flow_gallons_per_sec: float = FLOW_GALLONS_PER_SEC
var total_score: int = 0
var streak: int = 0
var best_streak: int = 0
var phase: StringName = &"ready" # ready | pumping | result

var gallons: float = 0.0
var dollars: float = 0.0
var pumping: bool = false
var pending_stop: bool = false
var _stop_timer: float = 0.0
var _was_in_perfect := false
var _was_over := false
var _last_whole_dollar := 0


func _ready() -> void:
	pick_new_target()


func try_same_target() -> void:
	reset_round()
	phase = &"ready"
	round_reset.emit()


func pick_new_target() -> void:
	var steps := int((TARGET_MAX - TARGET_MIN) / TARGET_STEP)
	target_dollars = TARGET_MIN + TARGET_STEP * randi_range(0, steps)
	# Pick a round length first so big targets don't drag; flow speed follows from it.
	var full_speed_secs := randf_range(3.4, 5.6)
	flow_gallons_per_sec = clampf(
		target_dollars / PRICE_PER_GALLON / full_speed_secs, FLOW_RANGE.x, FLOW_RANGE.y
	)
	reset_round()
	round_reset.emit()


func reset_round() -> void:
	gallons = 0.0
	dollars = 0.0
	pumping = false
	pending_stop = false
	_stop_timer = 0.0
	_was_in_perfect = false
	_was_over = false
	_last_whole_dollar = 0
	phase = &"ready"


func start_pump() -> void:
	if phase == &"result":
		pick_new_target()
		return
	if pending_stop:
		return
	if phase == &"ready":
		phase = &"pumping"
	pumping = true
	flow_changed.emit(true)


func request_stop() -> void:
	if not pumping or phase != &"pumping":
		return
	pumping = false
	pending_stop = true
	_stop_timer = STOP_LATENCY_SEC


func tick(delta: float) -> void:
	# Flow for exactly STOP_LATENCY_SEC after release, independent of frame rate.
	var flow_time := 0.0
	if pumping:
		flow_time = delta
	elif pending_stop:
		flow_time = minf(delta, _stop_timer)
		_stop_timer -= flow_time
		if _stop_timer <= 0.0:
			pending_stop = false

	var flowing := pumping or pending_stop
	if flow_time > 0.0:
		gallons += flow_gallons_per_sec * flow_ratio() * flow_time
		dollars = gallons * PRICE_PER_GALLON
		var whole := int(floor(dollars))
		if whole > _last_whole_dollar:
			_last_whole_dollar = whole
			dollar_crossed.emit(whole)

	if phase == &"pumping" and not pumping and not pending_stop:
		_finish_round()

	if not flowing and phase == &"pumping":
		flow_changed.emit(false)

	var in_perfect := in_perfect_zone()
	var over := is_over_target()
	if in_perfect and not _was_in_perfect:
		perfect_zone_entered.emit()
	if over and not _was_over and dollars > 0.0:
		went_over_target.emit()
	_was_in_perfect = in_perfect
	_was_over = over


func _finish_round() -> void:
	if dollars < FALSE_START_DOLLARS:
		reset_round()
		false_start.emit()
		round_reset.emit()
		return
	phase = &"result"
	var grade := grade_stop(target_dollars, shown_dollars())
	if not grade.over:
		total_score += grade.score
	if not grade.over and float(grade.cents_off) <= 5.0:
		streak += 1
	else:
		streak = 0
	best_streak = maxi(best_streak, streak)
	grade["streak"] = streak
	round_finished.emit(grade)


## Graded in whole cents, exactly as the pump display reads.
func grade_stop(target: float, final_amount: float) -> Dictionary:
	var diff_cents := int(round(final_amount * 100.0)) - int(round(target * 100.0))
	if diff_cents > 0:
		return {
			"over": true,
			"perfect": false,
			"cents_off": float(diff_cents),
			"score": 0,
			"label": "Over by $%.2f" % (diff_cents / 100.0),
		}
	var cents_off := float(-diff_cents)
	var score := maxi(0, int(round(1000.0 - cents_off * 20.0)))
	var label := "Solid stop"
	if cents_off == 0.0:
		label = "Perfect — nailed it!"
	elif cents_off <= 5.0:
		label = "So close!"
	elif cents_off <= 20.0:
		label = "Pretty good"
	elif score == 0:
		label = "Way short"
	var perfect := cents_off == 0.0
	return {"over": false, "cents_off": cents_off, "score": score, "label": label, "perfect": perfect}


## The sale as the pump shows it: truncated to whole cents.
func shown_cents() -> int:
	return int(floor(dollars * 100.0 + 0.000001))


func shown_dollars() -> float:
	return shown_cents() / 100.0


func _cents_to_target() -> int:
	return int(round(target_dollars * 100.0)) - shown_cents()


func in_perfect_zone() -> bool:
	var left := _cents_to_target()
	return shown_cents() > 0 and left >= 0 and left <= int(round(PERFECT_ZONE_DOLLARS * 100.0))


func is_over_target() -> bool:
	return _cents_to_target() < 0


## 1 at full flow, easing to EASE_OFF_FACTOR over the last stretch before the target.
func flow_ratio() -> float:
	return lerpf(1.0, EASE_OFF_FACTOR, smoothstep(
		target_dollars - EASE_OFF_START, target_dollars - EASE_OFF_END, dollars
	))


func dollars_per_sec() -> float:
	return flow_gallons_per_sec * PRICE_PER_GALLON * flow_ratio()


## SLOW / STEADY / FAST for the round's flow speed.
func flow_speed_label() -> String:
	var per_sec := flow_gallons_per_sec * PRICE_PER_GALLON
	return "SLOW" if per_sec < 1.9 else ("FAST" if per_sec > 3.0 else "STEADY")


## 0 when far from the target, ramping to 1 at the target (and while over).
func tension() -> float:
	if dollars <= 0.0:
		return 0.0
	if is_over_target():
		return 1.0
	return smoothstep(target_dollars * 0.6, target_dollars, dollars)