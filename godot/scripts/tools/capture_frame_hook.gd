extends Node
## Saves one viewport PNG when launched with: `godot --path . -- --capture-frame [/path/out.png]`
## Optional: `--pump-to <dollars>` holds the pump until the sale reaches it, `--release` stops it
## (capturing ~0.8s later, mid result FX), `--target <dollars>` forces the target,
## `--with-ui` keeps HUD/overlay visible, `--eye x,y,z --look x,y,z` overrides the camera,
## `--view pump|chase` picks the camera view without saving it, `--open-settings` shows the menu.

const DEFAULT_OUT := "res://.capture/frame.png"


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	if args.has("--playtest"):
		var bot := Node.new()
		bot.set_script(load("res://scripts/tools/playtest_bot.gd"))
		get_parent().add_child.call_deferred(bot)
		return
	if not args.has("--capture-frame"):
		return
	var out_path := DEFAULT_OUT
	var idx := args.find("--capture-frame")
	if idx >= 0 and idx + 1 < args.size() and not str(args[idx + 1]).begins_with("--"):
		out_path = str(args[idx + 1])
	call_deferred("_capture", out_path, args)


func _capture(out_path: String, args: PackedStringArray) -> void:
	var root := get_parent()
	if not args.has("--with-ui"):
		for path in ["UI/GameHud", "ResultOverlay", "ScreenFx", "SettingsLayer/SettingsMenu"]:
			var node := root.get_node_or_null(path)
			if node:
				node.set("visible", false)
	if args.has("--target"):
		GameState.target_dollars = float(args[args.find("--target") + 1])
		GameState.reset_round()
		GameState.round_reset.emit()
	if args.has("--eye") and args.has("--look"):
		var cam := root.get_node("CameraRig/Camera3D")
		cam.call("apply_driver_preset", _vec(args[args.find("--eye") + 1]), _vec(args[args.find("--look") + 1]))
	if args.has("--view"):
		Settings.camera_view = StringName(args[args.find("--view") + 1])
		Settings.camera_view_changed.emit(Settings.camera_view)
	if args.has("--open-settings"):
		root.get_node("SettingsLayer/SettingsMenu").call("_set_open", true)
	await get_tree().create_timer(1.2 if args.has("--view") else 0.3).timeout
	if args.has("--pump-to"):
		var stop_at := float(args[args.find("--pump-to") + 1])
		GameState.start_pump()
		while GameState.dollars < stop_at:
			await get_tree().process_frame
		if args.has("--release"):
			GameState.request_stop()
			await get_tree().create_timer(0.8, true, false, true).timeout
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var global_out := ProjectSettings.globalize_path(out_path)
	DirAccess.make_dir_recursive_absolute(global_out.get_base_dir())
	var err := img.save_png(global_out)
	if err != OK:
		push_error("Capture failed: %s (%s)" % [global_out, err])
	get_tree().quit()


func _vec(csv: String) -> Vector3:
	var p := csv.split(",")
	return Vector3(float(p[0]), float(p[1]), float(p[2]))