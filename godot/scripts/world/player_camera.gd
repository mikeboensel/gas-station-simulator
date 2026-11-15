extends Camera3D

enum RigMode { DRIVER, ORBIT }

@export var rig_mode: RigMode = RigMode.DRIVER
@export var orbit_target: Node3D
@export var driver_eye := Vector3(0.2, 1.78, -4.35)
@export var driver_look := Vector3(0.0, 1.38, 1.1)
@export var distance := 5.5
@export var look_height := 1.45
@export var min_pitch := -0.18
@export var max_pitch := 0.32
@export var trauma_decay := 1.35
@export var max_shake_offset := Vector2(0.09, 0.06)
@export var max_shake_roll := 0.018
@export var base_fov := 46.0
## FOV narrows by this much as the sale approaches the target (slow dolly-in).
@export var tension_fov_drop := 8.0
@export var idle_sway := Vector2(0.012, 0.008)

var _yaw := 0.0
var _pitch := 0.08
var _drag := false
var _trauma := 0.0
var _shake_t := 0.0
var _base_transform: Transform3D
var _t := 0.0
var _smooth_fov := 46.0
var _fov_kick := 0.0
var _glide_from: Transform3D
var _glide_to: Transform3D
var _glide := 1.0
const GLIDE_SEC := 0.9


func _ready() -> void:
	GameState.round_finished.connect(_on_round_finished)
	GameState.went_over_target.connect(_on_went_over)
	Settings.camera_view_changed.connect(_on_view_changed)
	var preset := Settings.view_preset()
	driver_eye = preset.eye
	driver_look = preset.look
	base_fov = preset.fov
	_smooth_fov = base_fov
	_apply_rig()
	_base_transform = global_transform


func _unhandled_input(event: InputEvent) -> void:
	if rig_mode == RigMode.DRIVER and event is InputEventKey and event.pressed and event.keycode == KEY_TAB:
		rig_mode = RigMode.ORBIT
		_sync_orbit_from_current()
		_apply_rig()
		return
	if rig_mode != RigMode.ORBIT:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT:
		_drag = event.pressed
	if event is InputEventMouseMotion and _drag:
		_yaw -= event.relative.x * 0.004
		_pitch = clampf(_pitch - event.relative.y * 0.003, min_pitch, max_pitch)
		_apply_rig()
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_UP:
		distance = maxf(4.0, distance - 0.25)
		_apply_rig()
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
		distance = minf(9.0, distance + 0.25)
		_apply_rig()


func _process(delta: float) -> void:
	_t += delta
	if _glide < 1.0:
		_glide = minf(_glide + delta / GLIDE_SEC, 1.0)
		_base_transform = _glide_from.interpolate_with(_glide_to, smoothstep(0.0, 1.0, _glide))
	_update_fov(delta)
	_trauma = maxf(_trauma - trauma_decay * delta, 0.0)
	var amount := _trauma * _trauma
	_shake_t += delta * 28.0
	var rumble := 0.0035 * GameState.tension() if GameState.phase == &"pumping" else 0.0
	var sway := idle_sway if rig_mode == RigMode.DRIVER else Vector2.ZERO
	var off := Vector3(
		max_shake_offset.x * amount * sin(_shake_t * 1.7) + sway.x * sin(_t * 0.55) + rumble * sin(_t * 61.0),
		max_shake_offset.y * amount * sin(_shake_t * 2.3) + sway.y * sin(_t * 0.83) + rumble * sin(_t * 53.0),
		0.0
	)
	var roll := max_shake_roll * amount * sin(_shake_t * 1.1)
	var shaken := _base_transform
	shaken.origin += shaken.basis.x * off.x + shaken.basis.y * off.y
	global_transform = shaken
	rotation.z = roll


func _update_fov(delta: float) -> void:
	var target := base_fov
	match GameState.phase:
		&"pumping":
			target -= tension_fov_drop * GameState.tension()
		&"result":
			target -= tension_fov_drop * 0.6
	_smooth_fov = lerpf(_smooth_fov, target, 1.0 - exp(-delta * 4.0))
	_fov_kick = lerpf(_fov_kick, 0.0, 1.0 - exp(-delta * 6.0))
	fov = _smooth_fov + _fov_kick


func add_trauma(amount: float) -> void:
	_trauma = clampf(_trauma + amount, 0.0, 1.0)


func _on_round_finished(grade: Dictionary) -> void:
	if grade.get("over", false):
		add_trauma(0.85)
		_fov_kick += 5.0
	elif grade.get("perfect", false):
		add_trauma(0.3)
		_fov_kick -= 6.0
	elif int(grade.get("score", 0)) > 0:
		_fov_kick -= 2.0


func _on_went_over() -> void:
	add_trauma(0.45)
	_fov_kick += 3.0


func apply_driver_preset(eye: Vector3, look: Vector3) -> void:
	driver_eye = eye
	driver_look = look
	rig_mode = RigMode.DRIVER
	_apply_rig()


func _on_view_changed(_view: StringName) -> void:
	var preset := Settings.view_preset()
	driver_eye = preset.eye
	driver_look = preset.look
	base_fov = preset.fov
	rig_mode = RigMode.DRIVER
	_glide_from = _base_transform
	_glide_to = Transform3D(Basis.IDENTITY, driver_eye).looking_at(driver_look, Vector3.UP)
	_glide = 0.0


func _apply_rig() -> void:
	match rig_mode:
		RigMode.DRIVER:
			global_position = driver_eye
			look_at(driver_look, Vector3.UP)
		RigMode.ORBIT:
			if orbit_target == null:
				return
			var offset := Vector3(
				sin(_yaw) * cos(_pitch),
				sin(_pitch),
				cos(_yaw) * cos(_pitch)
			) * distance
			global_position = orbit_target.global_position + offset
			look_at(
				orbit_target.global_position + Vector3(0, look_height, 0),
				Vector3.UP
			)
	_base_transform = global_transform
	_glide = 1.0
	rotation.z = 0.0


func _sync_orbit_from_current() -> void:
	if orbit_target == null:
		return
	var to_cam := global_position - orbit_target.global_position
	distance = to_cam.length()
	_yaw = atan2(to_cam.x, to_cam.z)
	_pitch = asin(clampf(to_cam.y / maxf(distance, 0.001), -1.0, 1.0))