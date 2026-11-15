shader_type canvas_item;

uniform vec4 tint : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float intensity : hint_range(0.0, 1.0) = 0.25;
uniform float pulse : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	vec2 d = UV - vec2(0.5);
	d.x *= 1.35;
	float r = length(d);
	float inner = mix(0.62, 0.32, intensity) - pulse * 0.06;
	float v = smoothstep(inner, inner + 0.42, r);
	COLOR = vec4(tint.rgb, v * clamp(intensity + pulse * 0.25, 0.0, 1.0));
}