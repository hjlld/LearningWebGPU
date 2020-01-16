export default `
#version 450

layout(set = 0, binding = 1) uniform sampler uSampler;
layout(set = 0, binding = 2) uniform texture2D cubeTexture;

layout(location = 0) in vec2 vUV;
layout(location = 0) out vec4 outColor;

void main(void) {
  outColor = texture(sampler2D(cubeTexture, uSampler), vec2(vUV.s, 1 - vUV.t) );
}
`;