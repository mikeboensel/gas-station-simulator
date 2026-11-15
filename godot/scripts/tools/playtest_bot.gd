extends Node
## Scripted playtester. Launch offscreen so it never takes over the screen:
##   Godot --path . --position 6000,6000 --resolution 1920x1080 --fixed-fps 60 -- --playtest
## Plays a fixed set of rounds through real input events, logs per-frame state to
## res://.capture/playtest/frames.json, and saves event screenshots + gauge filmstrips.

const OUT := "res://.capture/playtest"
const ROUNDS := [
	{"play": "early", "advance": "click_next"},
	{"play": "aim", "advance": "key_r"},
	{"play": "over", "advance": "space_tap"},
	{"play": "tap", "advance": "key_r"},
	{"play": "aim_late", "advance": "click_same"},
	{"play": "mouse_hold", "advance": "key_r"},
	{"play": "aim", "advance": "key_r"},
	{"play": "over_long", "advance": "key_r"},
	{"play": "stutter", "advance": "key_r"},
	{"play": "human", "advance": "key_r"},
	{"play": "human", "advance": "key_r"},
	{"play": "human", "advance": "key_r"},
	{"play": "human", "advance": "key_r"},
	{"play": "human", "advance": "key_r"},
	{"play": "human", "advance": "key_r"},
	{"play": "human", "advance": "key_r"},
	{"play": "human", "advance": "key_r"},
]

var _frames: Array = []
var _events: Array = []
var _round := 0
var _label := ""
var _frame := 0
var _strip: Array[Image] = []
var _strip_every := 0
var _main: Node


func _ready() -> void:
	process_priority = 1000
	_main = get_parent()
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT))
	for sig in ["perfect_zone_entered", "went_over_target", "round_reset"]:
		GameState.connect(sig, _note.bind(sig))
	GameState.round_finished.connect(func(g: Dictionary) -> void: _note("round_finished " + JSON.stringify(g)))
	GameState.flow_changed.connect(func(f: bool) -> void: _note("flow_changed %s" % f))
	call_deferred("_run")


func _process(_delta: float) -> void:
	_frame += 1
	var t := GameState.target_dollars
	var pmin := t - 0.6
	var pops := _main.get_node("ScreenFx").get_child(1).get_child_count()
	_frames.append({
		"f": _frame, "round": _round, "label": _label, "phase": String(GameState.phase),
		"d": snappedf(GameState.dollars, 0.001), "target": GameState.target_dollars,
		"pumping": GameState.pumping, "pending": GameState.pending_stop,
		"fill": snappedf(clampf(GameState.dollars / (t * 1.12), 0.0, 1.0), 0.0001),
		"pfill": snappedf(clampf((GameState.dollars - pmin) / 0.75, 0.0, 1.0), 0.0001),
		"palpha": snappedf(float(_gauge().get("_precision_alpha")), 0.01),
		"fov": snappedf((_main.get_node("CameraRig/Camera3D") as Camera3D).fov, 0.01),
		"ts": Engine.time_scale, "overlay": _main.get_node("ResultOverlay").visible,
		"pops": pops, "score": GameState.total_score, "streak": GameState.streak,
	})
	if _strip_every > 0 and _frame % _strip_every == 0:
		_strip.append(_grab_gauge())


func _run() -> void:
	await _wait(0.8)
	var args := OS.get_cmdline_user_args()
	var limit := int(args[args.find("--rounds") + 1]) if args.has("--rounds") else ROUNDS.size()
	for spec in ROUNDS.slice(0, limit):
		_round += 1
		_label = "%d-%s" % [_round, spec.play]
		await _play(spec.play)
		await _wait(0.12)
		_shot("result_early")
		await _wait(0.9)
		_shot("result_settled")
		await _advance(spec.advance)
		await _wait(0.6)
		_shot("after_advance")
	_finish()


func _play(kind: String) -> void:
	var t := GameState.target_dollars
	# Live overshoot estimate; parse_input_event lands one frame late, so add a frame.
	var latency := func() -> float: return GameState.dollars_per_sec() * (GameState.STOP_LATENCY_SEC + 1.0 / 60.0)
	match kind:
		"early":
			await _hold_until(t * 0.5)
		"aim":
			_strip_every = 3
			await _hold_until(func() -> bool: return GameState.dollars >= t - latency.call() - 0.005, true)
		"human":
			# Reaction error in seconds, applied as dollars at the live flow rate.
			var jitter := randfn(0.0, 0.025)
			_note("human jitter %.3f" % jitter)
			await _hold_until(func() -> bool:
				return GameState.dollars >= t - latency.call() + jitter * GameState.dollars_per_sec())
		"aim_late":
			_strip_every = 3
			await _hold_until(t - 0.12, true)
		"over":
			_strip_every = 3
			await _hold_until(t + 0.8, true)
		"over_long":
			await _hold_until(t + 3.0)
		"tap":
			_press()
			await _wait(0.05)
			_release()
			await _wait(0.6)
			_shot("false_start")
			_note("after tap phase=%s" % GameState.phase)
			await _hold_until(t * 0.7)
		"mouse_hold":
			_mouse(Vector2(960, 300), true)
			await _until(func() -> bool: return GameState.dollars >= t - latency.call() - 0.005)
			_mouse(Vector2(960, 300), false)
		"stutter":
			for i in 4:
				_press()
				await _wait(1.2)
				_release()
				await _wait(0.3)
				if GameState.phase == &"result":
					break
	await _until(func() -> bool: return GameState.phase == &"result", 6.0)
	_flush_strip()


## `stop` is a dollar amount or a Callable returning true when it's time to release.
func _hold_until(stop: Variant, shots := false) -> void:
	var done: Callable = stop if stop is Callable else func() -> bool: return GameState.dollars >= float(stop)
	_press()
	await _until(func() -> bool: return GameState.phase == &"pumping", 0.5)
	var marks := [0.5, 0.8, 0.9, 0.95, 0.98]
	while not done.call() and GameState.phase == &"pumping":
		if shots and not marks.is_empty() and GameState.dollars >= GameState.target_dollars * marks[0]:
			_shot("pump_%d" % int(marks.pop_front() * 100))
		await get_tree().process_frame
	_release()


func _advance(how: String) -> void:
	match how:
		"key_r":
			_key(KEY_R)
		"space_tap":
			_press()
			await _wait(0.05)
			_release()
			await _wait(0.3)
			_note("after space phase=%s pumping=%s" % [GameState.phase, GameState.pumping])
		"click_next", "click_same":
			var btn := _main.get_node("ResultOverlay/Center/Panel/Box/Buttons/%s" % ("Next" if how == "click_next" else "Same")) as Button
			var at := btn.get_global_rect().get_center()
			_mouse(at, true)
			await get_tree().process_frame
			var hovered := get_viewport().gui_get_hovered_control()
			_note("click %s at %s rect %s hovered %s" % [btn.name, at, btn.get_global_rect(), hovered.get_path() if hovered else "none"])
			_mouse(at, false)
			await get_tree().process_frame
			_note("after click phase=%s" % GameState.phase)
	_note("advance " + how)


func _press() -> void:
	var e := InputEventAction.new()
	e.action = &"pump_hold"
	e.pressed = true
	Input.parse_input_event(e)


func _release() -> void:
	var e := InputEventAction.new()
	e.action = &"pump_hold"
	e.pressed = false
	Input.parse_input_event(e)


func _key(code: Key) -> void:
	for pressed in [true, false]:
		var e := InputEventKey.new()
		e.physical_keycode = code
		e.keycode = code
		e.pressed = pressed
		Input.parse_input_event(e)


func _mouse(pos: Vector2, pressed: bool) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = pressed
	e.position = pos
	e.global_position = pos
	e.button_mask = MOUSE_BUTTON_MASK_LEFT if pressed else 0
	Input.parse_input_event(e)


func _wait(sec: float) -> void:
	await get_tree().create_timer(sec, true, false, true).timeout


func _until(cond: Callable, timeout := 10.0) -> void:
	var left := timeout
	while not cond.call() and left > 0.0:
		left -= get_process_delta_time()
		await get_tree().process_frame


func _note(what: String) -> void:
	_events.append({"f": _frame, "label": _label, "event": what, "d": snappedf(GameState.dollars, 0.001)})


func _gauge() -> Control:
	return _main.get_node("UI/GameHud/TensionGauge") as Control


func _image() -> Image:
	return get_viewport().get_texture().get_image()


func _grab_gauge() -> Image:
	var img := _image()
	var k := img.get_size().x / get_viewport().get_visible_rect().size.x
	var r := _gauge().get_global_rect()
	return img.get_region(Rect2i(Vector2i(r.position * k), Vector2i(r.size * k)))


func _shot(tag: String) -> void:
	_image().save_png(ProjectSettings.globalize_path("%s/%s_%s.png" % [OUT, _label, tag]))


func _flush_strip() -> void:
	if _strip.is_empty():
		_strip_every = 0
		return
	var w := _strip[0].get_width()
	var h := _strip[0].get_height()
	var sheet := Image.create(w, h * _strip.size(), false, _strip[0].get_format())
	for i in _strip.size():
		sheet.blit_rect(_strip[i], Rect2i(0, 0, w, h), Vector2i(0, i * h))
	sheet.save_png(ProjectSettings.globalize_path("%s/%s_gauge_strip.png" % [OUT, _label]))
	_strip.clear()
	_strip_every = 0


func _finish() -> void:
	var f := FileAccess.open(ProjectSettings.globalize_path(OUT + "/frames.json"), FileAccess.WRITE)
	f.store_string(JSON.stringify({"frames": _frames, "events": _events}))
	f.close()
	get_tree().quit()