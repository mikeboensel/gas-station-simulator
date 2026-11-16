extends Node3D

## Over-target failure: fireball, smoke, sparks, debris, flash light, ground shockwave, scorch
## mark, and a chain of secondary blasts. Scales with how far over the stop landed.
## Lives under the pump anchor; the camera side of the pump is local -Z.

const MAIN_BLAST := Vector3(0.0, 1.1, -0.15)
const OVER_CENTS_PER_POWER := 150.0
const MAX_POWER := 2.2

var _fire_pm: ParticleProcessMaterial
var _smoke_pm: ParticleProcessMaterial
var _spark_pm: ParticleProcessMaterial
var _debris_pm: ParticleProcessMaterial
var _fire_mesh: QuadMesh
var _smoke_mesh: QuadMesh
var _spark_mesh: BoxMesh
var _debris_mesh: BoxMesh
var _ring_mat: StandardMaterial3D
var _scorch: Decal


func _ready() -> void:
	_build_materials()
	_scorch = _make_scorch()
	# Pipelines compile on first draw; a throwaway blast under the ground keeps the first real one smooth.
	_blast(Vector3(0, -30, 0), 1.0, false)
	GameState.round_finished.connect(_on_round_finished)
	GameState.round_reset.connect(func() -> void: _scorch.visible = false)


func _on_round_finished(grade: Dictionary) -> void:
	if not grade.get("over", false):
		return
	var power := clampf(1.0 + float(grade.get("cents_off", 0)) / OVER_CENTS_PER_POWER, 1.0, MAX_POWER)
	_blast(MAIN_BLAST, power, true)
	_scorch.visible = true
	_scorch.size = Vector3(2.4, 1.0, 2.4) * power
	_kick_pump(power)
	_shake(1.0)
	var secondaries := 2 + int(power > 1.5)
	for i in secondaries:
		await get_tree().create_timer(0.2 + 0.18 * i).timeout
		if GameState.phase != &"result":
			return
		var pos := Vector3(randf_range(-2.4, 2.4), randf_range(0.5, 2.6), randf_range(-1.6, 0.8))
		_blast(pos, power * randf_range(0.45, 0.65), false)
		_shake(0.45)


func _blast(pos: Vector3, power: float, with_ring: bool) -> void:
	var root := Node3D.new()
	root.position = pos
	add_child(root)
	_emit(root, _fire_pm, _fire_mesh, int(70 * power), 0.9, power)
	_emit(root, _smoke_pm, _smoke_mesh, int(36 * power), 3.2, power)
	_emit(root, _spark_pm, _spark_mesh, int(90 * power), 1.6, power)
	_emit(root, _debris_pm, _debris_mesh, int(14 * power), 2.2, power)
	_flash_light(root, power)
	if with_ring:
		_shockwave(power)
	get_tree().create_timer(4.0).timeout.connect(root.queue_free)


func _emit(parent: Node3D, pm: ParticleProcessMaterial, mesh: Mesh, amount: int, life: float, power: float) -> void:
	var p := GPUParticles3D.new()
	p.process_material = pm
	p.draw_pass_1 = mesh
	p.amount = maxi(amount, 4)
	p.lifetime = life
	p.one_shot = true
	p.explosiveness = 0.92
	p.speed_scale = lerpf(1.0, 1.25, power - 1.0)
	p.local_coords = false
	p.visibility_aabb = AABB(Vector3(-8, -4, -8), Vector3(16, 12, 16))
	parent.add_child(p)
	p.scale = Vector3.ONE * sqrt(power)
	p.emitting = true


func _flash_light(parent: Node3D, power: float) -> void:
	var light := OmniLight3D.new()
	light.light_color = Color(1.0, 0.55, 0.2)
	light.omni_range = 7.0 + 3.0 * power
	light.light_energy = 14.0 * power
	light.shadow_enabled = true
	parent.add_child(light)
	var tw := light.create_tween()
	tw.tween_property(light, "light_energy", 2.5 * power, 0.12)
	tw.tween_property(light, "light_energy", 0.0, 0.8).set_ease(Tween.EASE_OUT)


func _shockwave(power: float) -> void:
	var ring := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(1, 1)
	ring.mesh = plane
	var mat := _ring_mat.duplicate() as StandardMaterial3D
	ring.material_override = mat
	ring.position = Vector3(MAIN_BLAST.x, 0.04, MAIN_BLAST.z)
	ring.scale = Vector3.ONE * 0.4
	add_child(ring)
	var tw := ring.create_tween().set_parallel()
	tw.tween_property(ring, "scale", Vector3.ONE * 9.0 * power, 0.55).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tw.tween_property(mat, "albedo_color:a", 0.0, 0.55).set_ease(Tween.EASE_IN)
	tw.chain().tween_callback(ring.queue_free)


func _kick_pump(power: float) -> void:
	var pump := get_parent().get_node_or_null("FuelPump") as Node3D
	if pump == null:
		return
	var rest := pump.rotation.x
	var tw := pump.create_tween()
	tw.tween_property(pump, "rotation:x", rest + 0.1 * power, 0.07).set_ease(Tween.EASE_OUT)
	tw.tween_property(pump, "rotation:x", rest, 0.9).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)


func _shake(amount: float) -> void:
	var cam := get_viewport().get_camera_3d()
	if cam and cam.has_method("add_trauma"):
		cam.call("add_trauma", amount)


func _build_materials() -> void:
	_fire_pm = _burst_pm(Vector2(1.2, 3.6), Vector3(0, 2.2, 0), 4.0)
	_fire_pm.scale_curve = _curve([Vector2(0, 0.5), Vector2(0.25, 1.5), Vector2(1, 1.9)])
	_fire_pm.color_ramp = _ramp([
		Color(1.6, 1.15, 0.45, 1), Color(1.4, 0.5, 0.08, 1), Color(0.9, 0.18, 0.03, 0.95),
		Color(0.22, 0.06, 0.03, 0.8), Color(0.04, 0.03, 0.03, 0.0),
	])
	_fire_mesh = _soft_quad(0.7, false)

	_smoke_pm = _burst_pm(Vector2(0.6, 2.0), Vector3(0, 1.6, 0), 1.5)
	_smoke_pm.scale_curve = _curve([Vector2(0, 0.6), Vector2(1, 2.0)])
	_smoke_pm.color_ramp = _ramp([
		Color(0.12, 0.08, 0.07, 0.0), Color(0.07, 0.06, 0.06, 0.85), Color(0.05, 0.05, 0.06, 0.0),
	])
	_smoke_mesh = _soft_quad(1.4, false)

	_spark_pm = _burst_pm(Vector2(5.0, 12.0), Vector3(0, -9.8, 0), 0.8)
	_spark_pm.particle_flag_align_y = true
	_spark_pm.color_ramp = _ramp([Color(3.0, 1.8, 0.6, 1), Color(2.4, 0.7, 0.1, 1), Color(0.8, 0.1, 0.0, 0.0)])
	_spark_mesh = BoxMesh.new()
	_spark_mesh.size = Vector3(0.015, 0.16, 0.015)
	_spark_mesh.material = _glow_mat()

	_debris_pm = _burst_pm(Vector2(3.0, 7.0), Vector3(0, -9.8, 0), 0.3)
	_debris_pm.angular_velocity_min = -720.0
	_debris_pm.angular_velocity_max = 720.0
	_debris_pm.scale_min = 0.5
	_debris_pm.scale_max = 1.6
	_debris_mesh = BoxMesh.new()
	_debris_mesh.size = Vector3(0.09, 0.05, 0.12)
	var debris_mat := StandardMaterial3D.new()
	debris_mat.albedo_color = Color(0.12, 0.1, 0.09)
	debris_mat.roughness = 0.7
	debris_mat.emission_enabled = true
	debris_mat.emission = Color(1, 0.35, 0.05)
	debris_mat.emission_energy_multiplier = 0.6
	_debris_mesh.material = debris_mat

	_ring_mat = StandardMaterial3D.new()
	_ring_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_ring_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_ring_mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	_ring_mat.albedo_color = Color(1, 0.6, 0.25, 1)
	_ring_mat.albedo_texture = _radial([
		[0.0, Color(1, 1, 1, 0)], [0.72, Color(1, 1, 1, 0)], [0.88, Color(1, 1, 1, 1)], [1.0, Color(1, 1, 1, 0)],
	])


func _burst_pm(speed: Vector2, gravity: Vector3, damping: float) -> ParticleProcessMaterial:
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	pm.emission_sphere_radius = 0.25
	pm.direction = Vector3(0, 1, 0)
	pm.spread = 180.0
	pm.initial_velocity_min = speed.x
	pm.initial_velocity_max = speed.y
	pm.gravity = gravity
	pm.damping_min = damping * 0.6
	pm.damping_max = damping
	pm.angle_min = -180.0
	pm.angle_max = 180.0
	return pm


func _make_scorch() -> Decal:
	var d := Decal.new()
	d.texture_albedo = _radial([[0.0, Color(0.02, 0.015, 0.01, 0.9)], [1.0, Color(0.02, 0.015, 0.01, 0.0)]])
	d.position = Vector3(MAIN_BLAST.x, 0.0, MAIN_BLAST.z)
	d.visible = false
	add_child(d)
	return d


func _soft_quad(size: float, additive: bool) -> QuadMesh:
	var mat := StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	mat.vertex_color_use_as_albedo = true
	mat.albedo_texture = _radial([[0.0, Color(1, 1, 1, 1)], [0.45, Color(1, 1, 1, 0.7)], [1.0, Color(1, 1, 1, 0)]])
	if additive:
		mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	var q := QuadMesh.new()
	q.size = Vector2(size, size)
	q.material = mat
	return q


func _glow_mat() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.vertex_color_use_as_albedo = true
	return m


func _radial(stops: Array) -> GradientTexture2D:
	var g := Gradient.new()
	g.offsets = PackedFloat32Array(stops.map(func(s: Array) -> float: return s[0]))
	g.colors = PackedColorArray(stops.map(func(s: Array) -> Color: return s[1]))
	var tex := GradientTexture2D.new()
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	tex.gradient = g
	return tex


func _curve(points: Array) -> CurveTexture:
	var c := Curve.new()
	c.max_value = 2.5
	for pt in points:
		c.add_point(pt)
	var t := CurveTexture.new()
	t.curve = c
	return t


func _ramp(colors: Array) -> GradientTexture1D:
	var offsets := PackedFloat32Array()
	for i in colors.size():
		offsets.append(float(i) / float(colors.size() - 1))
	var g := Gradient.new()
	g.offsets = offsets
	g.colors = PackedColorArray(colors)
	var t := GradientTexture1D.new()
	t.use_hdr = true
	t.gradient = g
	return t
