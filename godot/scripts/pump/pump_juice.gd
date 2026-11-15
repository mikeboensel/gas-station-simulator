extends Node3D

## Pump-level feedback: LCD glow/flash, body rumble + squash, fuel vapor, and the
## over-target spill (droplets + growing puddle). Child of FuelPump; local space = pump.

const LCD_IDLE := Color(0.02, 0.03, 0.02)
const LCD_PERFECT := Color(0.0, 0.2, 0.09)
const LCD_OVER := Color(0.45, 0.02, 0.0)
const GLOW_IDLE := Color(0.35, 1.0, 0.6)
const GLOW_OVER := Color(1.0, 0.15, 0.08)
const NOZZLE_LOCAL := Vector3(0.17, 0.95, 0.42)

@onready var _pump: Node3D = get_parent()
@onready var _art: Node3D = _pump.get_node("Art")
@onready var _quad: MeshInstance3D = _pump.get_node("LcdMount/ScreenQuad")
@onready var _backdrop: ColorRect = _pump.get_node("LcdMount/LCDViewport/Backdrop")

var _glow: OmniLight3D
var _vapor: GPUParticles3D
var _spill: GPUParticles3D
var _puddle: Decal
var _art_base_pos: Vector3
var _art_base_scale: Vector3
var _flash := 0.0
var _t := 0.0


func _ready() -> void:
	_art_base_pos = _art.position
	_art_base_scale = _art.scale
	_glow = OmniLight3D.new()
	_glow.position = _pump.get_node("LcdMount").position + Vector3(0, -0.2, 1.1)
	_glow.light_color = GLOW_IDLE
	_glow.light_energy = 0.25
	_glow.omni_range = 2.2
	_glow.omni_attenuation = 2.0
	add_child(_glow)
	_vapor = _make_vapor()
	_spill = _make_spill()
	_puddle = _make_puddle()
	GameState.flow_changed.connect(_on_flow_changed)
	GameState.dollar_crossed.connect(func(_d: int) -> void: _flash = 1.0)
	GameState.went_over_target.connect(_on_went_over)
	GameState.round_reset.connect(_on_round_reset)


func _process(delta: float) -> void:
	_t += delta
	_flash = maxf(0.0, _flash - delta * 5.0)
	var flowing := GameState.pumping or GameState.pending_stop
	var over := GameState.is_over_target()
	var perfect := GameState.in_perfect_zone()
	var tension := GameState.tension()

	var rumble := (0.0025 + 0.004 * tension) if flowing else 0.0
	_art.position = _art_base_pos + Vector3(
		sin(_t * 71.0) * rumble, sin(_t * 89.0) * rumble * 0.6, cos(_t * 63.0) * rumble
	)

	var bg := LCD_IDLE
	if over:
		bg = LCD_OVER if fmod(_t, 0.24) < 0.12 else LCD_IDLE
	elif perfect:
		bg = LCD_IDLE.lerp(LCD_PERFECT, 0.6 + 0.4 * sin(_t * 12.0))
	_backdrop.color = bg

	var mat := _quad.get_surface_override_material(0) as StandardMaterial3D
	if mat:
		var base := 1.1 + 0.35 * tension
		mat.emission_energy_multiplier = base + _flash * 1.4

	_glow.light_color = GLOW_OVER if over else GLOW_IDLE
	var glow_base := 0.15 + (0.1 if flowing else 0.0) + 0.35 * tension
	if perfect:
		glow_base += 0.25 * (0.5 + 0.5 * sin(_t * 12.0))
	_glow.light_energy = glow_base + _flash * 0.4

	_vapor.emitting = flowing and not over
	_spill.emitting = flowing and over
	if flowing and over:
		var grow := minf(_puddle.size.x + delta * 0.9, 1.6)
		_puddle.size = Vector3(grow, 0.5, grow)
		_puddle.modulate.a = minf(1.0, _puddle.modulate.a + delta * 3.0)


func _on_flow_changed(flowing: bool) -> void:
	var tw := create_tween()
	if flowing:
		tw.tween_property(_art, "scale", _art_base_scale * Vector3(1.04, 0.95, 1.04), 0.06)
	else:
		tw.tween_property(_art, "scale", _art_base_scale * Vector3(0.97, 1.04, 0.97), 0.06)
	tw.tween_property(_art, "scale", _art_base_scale, 0.35).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)


func _on_went_over() -> void:
	_spill.restart()
	_spill.emitting = true
	_puddle.visible = true


func _on_round_reset() -> void:
	_puddle.visible = false
	_puddle.size = Vector3(0.2, 0.5, 0.2)
	_puddle.modulate.a = 0.0


func _make_vapor() -> GPUParticles3D:
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(0, 1, 0)
	pm.spread = 25.0
	pm.initial_velocity_min = 0.15
	pm.initial_velocity_max = 0.4
	pm.gravity = Vector3(0, 0.25, 0)
	pm.scale_min = 0.6
	pm.scale_max = 1.4
	pm.scale_curve = _curve_texture([Vector2(0, 0.3), Vector2(1, 1.6)])
	pm.color_ramp = _gradient_texture([Color(1, 1, 1, 0.0), Color(0.9, 0.95, 1, 0.22), Color(1, 1, 1, 0.0)])
	var p := _particles(pm, _soft_quad(0.12), 24, 1.4)
	p.position = NOZZLE_LOCAL
	return p


func _make_spill() -> GPUParticles3D:
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(0, -0.3, 1)
	pm.spread = 35.0
	pm.initial_velocity_min = 0.8
	pm.initial_velocity_max = 2.0
	pm.gravity = Vector3(0, -9.8, 0)
	pm.scale_min = 0.5
	pm.scale_max = 1.2
	pm.color = Color(1.0, 0.72, 0.15)
	var mesh := SphereMesh.new()
	mesh.radius = 0.018
	mesh.height = 0.04
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.6, 0.1)
	mat.emission_energy_multiplier = 0.8
	mat.roughness = 0.1
	mesh.material = mat
	var p := _particles(pm, mesh, 90, 0.9)
	p.position = NOZZLE_LOCAL
	return p


func _make_puddle() -> Decal:
	var tex := GradientTexture2D.new()
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	var g := Gradient.new()
	g.set_color(0, Color(0.35, 0.22, 0.05, 0.9))
	g.set_color(1, Color(0.35, 0.22, 0.05, 0.0))
	tex.gradient = g
	var d := Decal.new()
	d.texture_albedo = tex
	d.position = Vector3(NOZZLE_LOCAL.x, 0.0, NOZZLE_LOCAL.z + 0.35)
	d.size = Vector3(0.2, 0.5, 0.2)
	d.modulate = Color(1, 1, 1, 0)
	d.visible = false
	add_child(d)
	return d


func _particles(pm: ParticleProcessMaterial, mesh: Mesh, amount: int, life: float) -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.process_material = pm
	p.draw_pass_1 = mesh
	p.amount = amount
	p.lifetime = life
	p.emitting = false
	p.local_coords = false
	add_child(p)
	return p


func _soft_quad(size: float) -> QuadMesh:
	var tex := GradientTexture2D.new()
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	tex.gradient = g
	var mat := StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	mat.vertex_color_use_as_albedo = true
	mat.albedo_texture = tex
	var q := QuadMesh.new()
	q.size = Vector2(size, size)
	q.material = mat
	return q


func _curve_texture(points: Array) -> CurveTexture:
	var c := Curve.new()
	c.max_value = 2.0
	for pt in points:
		c.add_point(pt)
	var t := CurveTexture.new()
	t.curve = c
	return t


func _gradient_texture(colors: Array) -> GradientTexture1D:
	var offsets := PackedFloat32Array()
	for i in colors.size():
		offsets.append(float(i) / float(colors.size() - 1))
	var g := Gradient.new()
	g.offsets = offsets
	g.colors = PackedColorArray(colors)
	var t := GradientTexture1D.new()
	t.gradient = g
	return t