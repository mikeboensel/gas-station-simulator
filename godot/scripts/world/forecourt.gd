extends Node3D

## Off by default: main.tscn ships a dusk procedural sky that suits the neon dressing.
@export var use_hdri := false
@export var hdri_path := "res://assets/hdri/kloofendal_partly_cloudy_2k.hdr"


func _ready() -> void:
	if use_hdri:
		call_deferred("_apply_hdri_if_present")


func _apply_hdri_if_present() -> void:
	if not ResourceLoader.exists(hdri_path):
		return
	var env_node := get_parent().get_node_or_null("WorldEnvironment") as WorldEnvironment
	if env_node == null:
		env_node = get_tree().root.get_node_or_null("Main/WorldEnvironment") as WorldEnvironment
	if env_node == null:
		push_warning("WorldEnvironment not found for HDRI apply")
		return
	var tex := load(hdri_path) as Texture2D
	if tex == null:
		push_warning("HDRI failed to load: %s" % hdri_path)
		return
	var sky := PanoramaSkyMaterial.new()
	sky.panorama = tex
	sky.energy_multiplier = 0.78
	var sky_res := Sky.new()
	sky_res.sky_material = sky
	var env := env_node.environment
	if env == null:
		return
	env = env.duplicate() as Environment
	env.background_mode = Environment.BG_SKY
	env.sky = sky_res
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.32
	# Keep the saturated look from main.tscn (glow, filmic exposure, color grading).
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.05
	env.glow_enabled = true
	env.glow_intensity = 0.58
	env.glow_bloom = 0.18
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.12
	env.adjustment_brightness = 1.03
	env.ssao_enabled = true
	env.ssil_enabled = true
	env.fog_enabled = true
	env.fog_light_color = Color(0.93, 0.79, 0.63)
	env.fog_density = 0.002
	env.fog_aerial_perspective = 0.32
	env_node.environment = env