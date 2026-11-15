extends Node
## Player preferences, persisted to user://settings.cfg.

signal camera_view_changed(view: StringName)

const PATH := "user://settings.cfg"
const VIEWS := {
	&"pump": {
		"label": "Pump close-up",
		"eye": Vector3(0.3, 1.62, -1.4),
		"look": Vector3(0.0, 1.42, 1.85),
		"fov": 46.0,
		"car": false,
	},
	&"chase": {
		"label": "Chase cam",
		"eye": Vector3(1.6, 2.7, -9.2),
		"look": Vector3(0.0, 1.2, 1.6),
		"fov": 40.0,
		"car": true,
	},
}
const DEFAULT_VIEW := &"pump"

var camera_view: StringName = DEFAULT_VIEW
var menu_open := false


func _ready() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) == OK:
		var saved := StringName(str(cfg.get_value("camera", "view", DEFAULT_VIEW)))
		if VIEWS.has(saved):
			camera_view = saved


func set_camera_view(view: StringName) -> void:
	if not VIEWS.has(view) or view == camera_view:
		return
	camera_view = view
	var cfg := ConfigFile.new()
	cfg.load(PATH)
	cfg.set_value("camera", "view", String(view))
	cfg.save(PATH)
	camera_view_changed.emit(view)


func view_preset(view: StringName = camera_view) -> Dictionary:
	return VIEWS.get(view, VIEWS[DEFAULT_VIEW])
