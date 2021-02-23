export default 
`[[location(0)]]
var<out> outColor: vec4<f32>;
      
[[stage(fragment)]]
fn main() -> void {
    outColor = vec4<f32>(1.0, 1.0, 1.0, 1.0);
    return;
}`;