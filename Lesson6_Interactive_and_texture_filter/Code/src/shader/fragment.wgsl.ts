export default
`@group(0) @binding(1)
var uSampler: sampler;

@group(0) @binding(2)
var cubeTexture: texture_2d<f32>;

@stage(fragment)
fn main(
  @location(0) vUV: vec2<f32>
) -> @location(0) vec4<f32> {
  return textureSample(cubeTexture, uSampler, vec2<f32>(vUV.x, 1.0 - vUV.y));
}
`