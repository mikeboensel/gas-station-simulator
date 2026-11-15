extends Node3D

## Primitive-built sedan that replaces the greybox SimpleCar sibling.
## Local +Z is the car's front (toward the pump). Only shown by camera views that frame the car.

@export var paint := Color(0.62, 0.05, 0.08)


func _ready() -> void:
	var old := get_parent().get_node_or_null("SimpleCar") as Node3D
	if old:
		old.visible = false
	Settings.camera_view_changed.connect(_on_view_changed)
	_on_view_changed(Settings.camera_view)
	var body := _paint_mat()
	var glass := _glass_mat()
	var trim := _flat(Color(0.05, 0.05, 0.06), 0.6)
	_box(Vector3(1.86, 0.5, 4.5), Vector3(0, 0.62, 0), body)
	_box(Vector3(1.8, 0.16, 1.3), Vector3(0, 0.92, 1.5), body, Vector3(-0.09, 0, 0))
	_box(Vector3(1.8, 0.16, 0.9), Vector3(0, 0.92, -1.75), body, Vector3(0.06, 0, 0))
	_box(Vector3(1.62, 0.44, 2.05), Vector3(0, 1.1, -0.2), glass)
	_box(Vector3(1.5, 0.06, 1.55), Vector3(0, 1.34, -0.25), body)
	_box(Vector3(1.6, 0.5, 0.06), Vector3(0, 1.08, 0.82), glass, Vector3(-0.85, 0, 0))
	_box(Vector3(1.6, 0.45, 0.06), Vector3(0, 1.08, -1.22), glass, Vector3(0.95, 0, 0))
	_box(Vector3(1.9, 0.16, 0.12), Vector3(0, 0.42, 2.26), trim)
	_box(Vector3(1.9, 0.16, 0.12), Vector3(0, 0.42, -2.26), trim)
	for side in [-1.0, 1.0]:
		_box(Vector3(0.18, 0.1, 0.12), Vector3(side * 1.0, 1.0, 0.7), body)
		_box(Vector3(0.42, 0.12, 0.04), Vector3(side * 0.62, 0.72, 2.25), _glow(Color(1, 0.97, 0.88), 3.0))
		_box(Vector3(0.46, 0.12, 0.04), Vector3(side * 0.6, 0.76, -2.25), _glow(Color(1, 0.05, 0.03), 2.5))
		for z in [1.42, -1.42]:
			_wheel(Vector3(side * 0.86, 0.36, z))


func _on_view_changed(_view: StringName) -> void:
	visible = bool(Settings.view_preset().get("car", false))


func _wheel(pos: Vector3) -> void:
	var tire := CylinderMesh.new()
	tire.top_radius = 0.36
	tire.bottom_radius = 0.36
	tire.height = 0.26
	var rim := CylinderMesh.new()
	rim.top_radius = 0.22
	rim.bottom_radius = 0.22
	rim.height = 0.27
	_mesh(tire, pos, _flat(Color(0.04, 0.04, 0.04), 0.9), Vector3(0, 0, PI / 2.0))
	var rim_mat := StandardMaterial3D.new()
	rim_mat.albedo_color = Color(0.75, 0.76, 0.78)
	rim_mat.metallic = 1.0
	rim_mat.roughness = 0.3
	_mesh(rim, pos, rim_mat, Vector3(0, 0, PI / 2.0))


func _box(size: Vector3, pos: Vector3, mat: Material, rot := Vector3.ZERO) -> void:
	var m := BoxMesh.new()
	m.size = size
	_mesh(m, pos, mat, rot)


func _mesh(mesh: Mesh, pos: Vector3, mat: Material, rot: Vector3) -> void:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.position = pos
	mi.rotation = rot
	mi.material_override = mat
	add_child(mi)


func _paint_mat() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = paint
	m.metallic = 0.55
	m.roughness = 0.28
	m.clearcoat_enabled = true
	m.clearcoat = 1.0
	m.clearcoat_roughness = 0.08
	return m


func _glass_mat() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.03, 0.04, 0.06)
	m.metallic = 0.9
	m.roughness = 0.05
	return m


func _glow(color: Color, energy: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.emission_enabled = true
	m.emission = color
	m.emission_energy_multiplier = energy
	return m


func _flat(color: Color, roughness: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = roughness
	return m