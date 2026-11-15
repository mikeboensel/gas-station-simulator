extends Node

@onready var _pump: AudioStreamPlayer = $PumpLoop
@onready var _stop: AudioStreamPlayer = $Stop
@onready var _success: AudioStreamPlayer = $Success
@onready var _fail: AudioStreamPlayer = $Fail
@onready var _tick: AudioStreamPlayer = $Tick

var muted := false


const _LEVELS := {
	"PumpLoop": -10.0,
	"Stop": -6.0,
	"Success": -4.0,
	"Fail": -4.0,
	"Tick": -10.0,
}


func _ready() -> void:
	for child in get_children():
		if child is AudioStreamPlayer:
			var db: float = _LEVELS.get(child.name, -8.0)
			child.set_meta("base_db", db)
			child.volume_db = db
	var loop := _pump.stream as AudioStreamWAV
	if loop:
		loop.loop_mode = AudioStreamWAV.LOOP_FORWARD
	GameState.flow_changed.connect(_on_flow_changed)
	GameState.round_finished.connect(_on_round_finished)
	GameState.dollar_crossed.connect(_on_dollar_crossed)


func _process(_delta: float) -> void:
	if _pump.playing:
		var speed := GameState.flow_gallons_per_sec / GameState.FLOW_GALLONS_PER_SEC
		_pump.pitch_scale = (0.85 + 0.15 * speed) * lerpf(0.78, 1.0, GameState.flow_ratio()) + 0.15 * GameState.tension()


func _on_dollar_crossed(whole: int) -> void:
	if muted or GameState.is_over_target():
		return
	var remaining := GameState.target_dollars - float(whole)
	_tick.pitch_scale = 0.75 + 0.5 * clampf(1.0 - remaining / GameState.target_dollars, 0.0, 1.0)
	_tick.volume_db = _tick.get_meta("base_db", -10.0) - (2.0 if remaining > 2.0 else -2.0)
	_tick.play()


func play_star(index: int) -> void:
	if muted:
		return
	var p := _tick.duplicate() as AudioStreamPlayer
	add_child(p)
	p.pitch_scale = 1.25 + 0.2 * index
	p.volume_db = _tick.get_meta("base_db", -10.0) + 2.0
	p.finished.connect(p.queue_free)
	p.play()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_mute"):
		muted = not muted
		_apply_mute()


func _apply_mute() -> void:
	for player in [_pump, _stop, _success, _fail, _tick]:
		player.stream_paused = muted
		if muted:
			player.volume_db = -80.0
		else:
			player.volume_db = player.get_meta("base_db", -8.0)


func _on_flow_changed(flowing: bool) -> void:
	if muted:
		return
	if flowing:
		if not _pump.playing:
			_pump.play()
	else:
		_fade_pump_out()


func _fade_pump_out() -> void:
	if not _pump.playing:
		return
	var tw := create_tween()
	tw.tween_property(_pump, "volume_db", -36.0, 0.12)
	tw.tween_callback(_pump.stop)
	tw.tween_callback(_restore_pump_volume)


func _restore_pump_volume() -> void:
	if not muted:
		_pump.volume_db = _pump.get_meta("base_db", -10.0)


func play_stop() -> void:
	if muted:
		return
	_stop.pitch_scale = randf_range(0.96, 1.04)
	_stop.play()


func _on_round_finished(grade: Dictionary) -> void:
	if muted:
		return
	if grade.get("over", false):
		_fail.pitch_scale = 1.0
		_fail.play()
		return
	if grade.get("perfect", false):
		_success.pitch_scale = 1.12
		_success.play()
		_brief_hit_stop(0.14, 0.12)
	elif grade.get("score", 0) > 0:
		_success.pitch_scale = 1.0 + clampf(grade.score / 2000.0, 0.0, 0.08)
		_success.play()


func _brief_hit_stop(duration: float, time_scale: float) -> void:
	Engine.time_scale = time_scale
	await get_tree().create_timer(duration, true, false, true).timeout
	Engine.time_scale = 1.0