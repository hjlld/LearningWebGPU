export default
`[[block]]struct Uniforms {
  [[offset(0)]]uPMatrix: mat4x4<f32>;
  [[offset(64)]]uMVMatrix: mat4x4<f32>;
};

[[group(0), binding(0)]]
var<uniform> uniforms: Uniforms;

[[location(0)]]
var<in> aVertexPosition: vec3<f32>;

[[location(1)]]
var<in> aVertexColor: vec4<f32>;

[[location(0)]]
var<out> vColor: vec4<f32>;

[[builtin(position)]] 
var<out> Position: vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
  Position = uniforms.uPMatrix * uniforms.uMVMatrix * vec4<f32>(aVertexPosition, 1.0);
  vColor = aVertexColor;
}`;