shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx;

uniform vec3 albedo_tint : source_color = vec3(0.22, 0.21, 0.2);
uniform float roughness_value : hint_range(0.0, 1.0) = 0.92;
uniform float uv_scale : hint_range(0.1, 8.0) = 3.5;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void fragment() {
	vec2 uv = UV * uv_scale;
	float n = noise(uv * 6.0) * 0.55 + noise(uv * 24.0) * 0.25 + noise(uv * 80.0) * 0.2;
	vec3 col = albedo_tint * (0.85 + n * 0.3);
	ALBEDO = col;
	ROUGHNESS = roughness_value;
	METALLIC = 0.0;
	SPECULAR = 0.25;
}