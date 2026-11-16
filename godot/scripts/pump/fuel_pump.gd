extends Node3D

@onready var lcd_viewport: SubViewport = %LCDViewport
@onready var nozzle_area: Area3D = %NozzleArea
@onready var screen_quad: MeshInstance3D = $LcdMount/ScreenQuad
@onready var art: Node3D = $Art

var _anim: AnimationPlayer
var _open_clip: String
var _close_clip: String
var _lcd_glow: float = 0.0


func _ready() -> void:
	GameState.flow_changed.connect(_on_flow_changed)
	_bind_lcd_texture()
	_setup_nozzle_hitbox()
	_setup_pump_animations()
	if nozzle_area:
		nozzle_area.input_event.connect(_on_nozzle_input)
		nozzle_area.mouse_entered.connect(_on_nozzle_hover.bind(true))
		nozzle_area.mouse_exited.connect(_on_nozzle_hover.bind(false))


func _setup_nozzle_hitbox() -> void:
	var nozzle := art.find_child("pump-nozzle", true, false) as Node3D
	if nozzle == null:
		return
	nozzle_area.reparent(nozzle)
	nozzle_area.transform = Transform3D.IDENTITY
	nozzle_area.position = Vector3(0, -0.05, 0.08)


func _setup_pump_animations() -> void:
	_anim = art.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if _anim == null:
		return
	if _anim.has_animation(&"open"):
		_open_clip = "open"
	if _anim.has_animation(&"close"):
		_close_clip = "close"


func _bind_lcd_texture() -> void:
	var lcd_mat := StandardMaterial3D.new()
	lcd_mat.albedo_texture = lcd_viewport.get_texture()
	lcd_mat.emission_enabled = true
	lcd_mat.emission_texture = lcd_viewport.get_texture()
	lcd_mat.emission_energy_multiplier = 1.25
	lcd_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	screen_quad.set_surface_override_material(0, lcd_mat)


func _process(delta: float) -> void:
	GameState.tick(delta)
	_update_lcd()
	_update_led_color(delta)


func _input(event: InputEvent) -> void:
	# Result-panel buttons need the click; keyboard still restarts from the result screen.
	if event is InputEventMouseButton and GameState.phase == &"result":
		return
	if event.is_pressed() and (Settings.menu_open or _pointer_on_blocker(event)):
		return
	if event.is_action_pressed("pump_hold"):
		GameState.start_pump()
	if event.is_action_released("pump_hold"):
		if GameState.request_stop():
			Sfx.play_stop()
	if event.is_action_pressed("next_round") and GameState.phase == &"result":
		GameState.pick_new_target()


func _pointer_on_blocker(event: InputEvent) -> bool:
	if not event is InputEventMouseButton:
		return false
	var c := get_viewport().gui_get_hovered_control()
	while c:
		if c.is_in_group(&"blocks_pump_click"):
			return true
		c = c.get_parent() as Control
	return false


func _on_nozzle_input(_camera: Node, event: InputEvent, _pos: Vector3, _normal: Vector3, _shape: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			GameState.start_pump()
		else:
			if GameState.request_stop():
				Sfx.play_stop()


func _on_nozzle_hover(inside: bool) -> void:
	Input.set_default_cursor_shape(Input.CURSOR_POINTING_HAND if inside else Input.CURSOR_ARROW)


func _on_flow_changed(flowing: bool) -> void:
	if _anim == null:
		return
	var clip := _open_clip if flowing else _close_clip
	if clip.is_empty():
		return
	_anim.play(clip)


func _update_led_color(delta: float) -> void:
	var state := lcd_viewport.get_node_or_null("Display/HeaderLine/State") as Label
	if state:
		var flowing := GameState.pumping or GameState.pending_stop
		state.text = "OVER!" if GameState.is_over_target() else ("PUMP" if flowing else "READY")
		if GameState.in_perfect_zone():
			state.add_theme_color_override("font_color", Color("#7dffb8"))
		elif GameState.is_over_target():
			state.add_theme_color_override("font_color", Color("#ff6b55"))
		else:
			state.add_theme_color_override("font_color", Color("#a8ffd0"))
	var sale := lcd_viewport.get_node_or_null("Display/Sale") as Label
	if sale == null:
		return
	if GameState.is_over_target():
		sale.add_theme_color_override("font_color", Color("#ff4444"))
	elif GameState.in_perfect_zone():
		_lcd_glow = fmod(_lcd_glow + delta * 4.5, TAU)
		var pulse := 0.85 + 0.15 * sin(_lcd_glow)
		sale.add_theme_color_override("font_color", Color("#b8ffe0").lerp(Color.WHITE, pulse * 0.35))
	else:
		sale.add_theme_color_override("font_color", Color("#52ff9d"))


func _update_lcd() -> void:
	var sale := lcd_viewport.get_node_or_null("Display/Sale") as Label
	var gal := lcd_viewport.get_node_or_null("Display/Meta/Gallons") as Label
	if sale:
		sale.text = "$%.2f" % GameState.shown_dollars()
	if gal:
		gal.text = "%.3f gal" % GameState.gallons