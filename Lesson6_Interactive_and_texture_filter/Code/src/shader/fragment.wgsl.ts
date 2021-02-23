export default
`[[group(0), binding(1)]]
var<uniform> uSampler: sampler;

[[group(0), binding(2)]]
var<uniform> cubeTexture: texture_2d<f32>;

[[location(0)]]
var<in> vUV: vec2<f32>;

[[location(0)]]
var<out> outColor: vec4<f32>;

[[stage(fragment)]]
fn main() -> void {
  outColor = textureSample(cubeTexture, uSampler, vec2<f32>(vUV.x, 1.0 - vUV.y));
}
`