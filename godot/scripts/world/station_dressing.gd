extends Node3D

## Dusk set dressing: canopy light panels, neon strips, price pylon, and a lit store.
## Neon reacts to game events (green on perfect, red strobe when over).

const NEON_IDLE := Color(1.0, 0.18, 0.42)
const NEON_PERFECT := Color(0.2, 1.0, 0.62)
const NEON_OVER := Color(1.0, 0.08, 0.04)
const NEON_ENERGY := 4.0

var _neon_mat: StandardMaterial3D
var _panel_mat: StandardMaterial3D
var _flicker_panel: MeshInstance3D
var _canopy_lights: Array[OmniLight3D] = []
var _neon_tween: Tween
var _t := 0.0
var _next_flicker := 3.0


func _ready() -> void:
	_neon_mat = _emissive(NEON_IDLE, NEON_ENERGY)
	_panel_mat = _emissive(Color(1.0, 0.97, 0.9), 6.0)
	_build_canopy_panels()
	_build_neon()
	_build_price_pylon()
	_build_store()
	for name in ["CanopyLightL", "CanopyLightR"]:
		var light := get_parent().get_node_or_null(name) as OmniLight3D
		if light:
			light.set_meta("base_energy", light.light_energy)
			_canopy_lights.append(light)
	GameState.went_over_target.connect(_on_went_over)
	GameState.round_finished.connect(_on_round_finished)


func _process(delta: float) -> void:
	_t += delta
	if _neon_tween == null or not _neon_tween.is_running():
		_neon_mat.emission_energy_multiplier = NEON_ENERGY * (0.88 + 0.12 * sin(_t * 2.2))
	_next_flicker -= delta
	if _next_flicker <= 0.0:
		_next_flicker = randf_range(2.5, 6.0)
		_flicker()


func _build_canopy_panels() -> void:
	var panel := BoxMesh.new()
	panel.size = Vector3(2.2, 0.04, 1.0)
	for z in [-1.6, 3.2]:
		for x in [-4.2, 0.0, 4.2]:
			var m := _box(panel, Vector3(x, 4.21, z), _panel_mat)
			if is_equal_approx(x, 4.2) and is_equal_approx(z, 3.2):
				_flicker_panel = m


func _build_neon() -> void:
	var strip := BoxMesh.new()
	strip.size = Vector3(13.6, 0.07, 0.07)
	_box(strip, Vector3(0, 4.19, 4.45), _neon_mat)
	_box(strip, Vector3(0, 4.19, -4.85), _neon_mat)
	var pillar_strip := BoxMesh.new()
	pillar_strip.size = Vector3(0.06, 3.3, 0.04)
	for x in [-6.4, 6.4]:
		_box(pillar_strip, Vector3(x, 1.8, 4.0), _neon_mat)


func _build_price_pylon() -> void:
	var root := Node3D.new()
	root.position = Vector3(-8.2, 0, 9.5)
	root.rotation.y = 0.35
	add_child(root)
	var pole := BoxMesh.new()
	pole.size = Vector3(0.3, 3.2, 0.3)
	_box(pole, Vector3(0, 1.6, 0), _flat(Color(0.18, 0.18, 0.2)), root)
	var board := BoxMesh.new()
	board.size = Vector3(2.4, 2.4, 0.3)
	_box(board, Vector3(0, 4.3, 0), _flat(Color(0.06, 0.06, 0.08)), root)
	var header := BoxMesh.new()
	header.size = Vector3(2.4, 0.6, 0.32)
	_box(header, Vector3(0, 5.2, 0), _emissive(Color(0.95, 0.12, 0.14), 2.5), root)
	_label(root, "FUEL", Vector3(0, 5.2, -0.24), 120, Color(1, 1, 1))
	_label(root, "REGULAR", Vector3(0, 4.62, -0.24), 70, Color(1, 0.85, 0.5))
	var price := "%.2f" % GameState.PRICE_PER_GALLON
	_label(root, price, Vector3(0, 4.0, -0.24), 210, Color(0.35, 1.0, 0.55) * 2.2)
	var glow := OmniLight3D.new()
	glow.position = Vector3(0, 4.3, -0.8)
	glow.light_color = Color(0.4, 1.0, 0.6)
	glow.light_energy = 1.2
	glow.omni_range = 4.5
	root.add_child(glow)


func _build_store() -> void:
	var root := Node3D.new()
	root.position = Vector3(1.5, 0, 15.0)
	add_child(root)
	var shell := BoxMesh.new()
	shell.size = Vector3(18, 4.4, 6)
	_box(shell, Vector3(0, 2.2, 3.0), _flat(Color(0.22, 0.19, 0.2)), root)
	var window_mat := _emissive(Color(1.0, 0.82, 0.55), 2.2)
	var window := BoxMesh.new()
	window.size = Vector3(3.4, 2.1, 0.05)
	for x in [-6.0, -2.0, 4.5]:
		_box(window, Vector3(x, 1.45, -0.02), window_mat, root)
	var door := BoxMesh.new()
	door.size = Vector3(1.6, 2.5, 0.05)
	_box(door, Vector3(1.4, 1.25, -0.02), _emissive(Color(0.75, 0.9, 1.0), 1.6), root)
	var sign_box := BoxMesh.new()
	sign_box.size = Vector3(7.0, 0.9, 0.2)
	_box(sign_box, Vector3(0, 3.55, -0.1), _flat(Color(0.05, 0.05, 0.07)), root)
	_label(root, "INK  MART  24/7", Vector3(0, 3.55, -0.3), 190, Color(1.0, 0.3, 0.5) * 2.4)
	var spill := OmniLight3D.new()
	spill.position = Vector3(0, 2.0, -2.0)
	spill.light_color = Color(1.0, 0.78, 0.5)
	spill.light_energy = 2.2
	spill.omni_range = 9.0
	root.add_child(spill)


func _on_went_over() -> void:
	_flash_neon(NEON_OVER, 4)
	for light in _canopy_lights:
		var tw := create_tween()
		var base: float = light.get_meta("base_energy", 3.0)
		tw.tween_property(light, "light_energy", base * 0.25, 0.05)
		tw.tween_property(light, "light_energy", base, 0.08)
		tw.tween_property(light, "light_energy", base * 0.4, 0.05)
		tw.tween_property(light, "light_energy", base, 0.15)


func _on_round_finished(grade: Dictionary) -> void:
	if grade.get("perfect", false):
		_flash_neon(NEON_PERFECT, 5)
	elif not grade.get("over", false) and int(grade.get("score", 0)) >= 900:
		_flash_neon(Color(1.0, 0.85, 0.25), 2)


func _flash_neon(color: Color, flashes: int) -> void:
	if _neon_tween:
		_neon_tween.kill()
	_neon_tween = create_tween()
	for i in flashes:
		_neon_tween.tween_property(_neon_mat, "emission", color, 0.04)
		_neon_tween.parallel().tween_property(_neon_mat, "emission_energy_multiplier", NEON_ENERGY * 2.2, 0.04)
		_neon_tween.tween_property(_neon_mat, "emission_energy_multiplier", NEON_ENERGY * 0.4, 0.09)
	_neon_tween.tween_property(_neon_mat, "emission_energy_multiplier", NEON_ENERGY, 0.2)
	_neon_tween.tween_property(_neon_mat, "emission", NEON_IDLE, 0.6)


func _flicker() -> void:
	if _flicker_panel == null:
		return
	var mat := _panel_mat.duplicate() as StandardMaterial3D
	_flicker_panel.material_override = mat
	var tw := create_tween()
	for i in randi_range(2, 4):
		tw.tween_property(mat, "emission_energy_multiplier", 0.3, 0.03)
		tw.tween_property(mat, "emission_energy_multiplier", 6.0, randf_range(0.03, 0.09))
	tw.tween_callback(func() -> void: _flicker_panel.material_override = _panel_mat)


func _box(mesh: Mesh, pos: Vector3, mat: Material, parent: Node3D = self) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.position = pos
	mi.material_override = mat
	parent.add_child(mi)
	return mi


func _label(parent: Node3D, text: String, pos: Vector3, size: int, color: Color) -> void:
	var l := Label3D.new()
	l.text = text
	l.position = pos
	l.rotation.y = PI
	l.font_size = size
	l.pixel_size = 0.004
	l.modulate = color
	l.outline_size = 0
	l.shaded = false
	l.double_sided = false
	l.alpha_cut = Label3D.ALPHA_CUT_OPAQUE_PREPASS
	parent.add_child(l)


func _emissive(color: Color, energy: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.emission_enabled = true
	m.emission = color
	m.emission_energy_multiplier = energy
	return m


func _flat(color: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 0.8
	return m