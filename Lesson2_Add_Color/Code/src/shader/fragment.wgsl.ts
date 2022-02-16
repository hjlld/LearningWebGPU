export default 
`@stage(fragment)
fn main(
  @location(0) vColor: vec4<f32>
) -> @location(0) vec4<f32> {
  return vColor;
}`;