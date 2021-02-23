export default 
`[[location(0)]]
var<in> vColor: vec4<f32>;

[[location(0)]]
var<out> outColor: vec4<f32>;

[[stage(fragment)]]
fn main() -> void {
  outColor = vColor;
}`;