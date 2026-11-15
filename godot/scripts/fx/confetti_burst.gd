extends GPUParticles3D

## Multicolor burst over the pump: big on a perfect stop, smaller for strong stops.


func _ready() -> void:
	visible = false
	one_shot = true
	emitting = false
	GameState.round_finished.connect(_on_round_finished)


func _on_round_finished(grade: Dictionary) -> void:
	if grade.get("over", false):
		return
	var perfect := bool(grade.get("perfect", false))
	if not perfect and int(grade.get("score", 0)) < 350:
		return
	global_position = get_parent().global_position + Vector3(0, 2.4, -0.4)
	amount_ratio = 1.0 if perfect else 0.35
	visible = true
	restart()
	emitting = true