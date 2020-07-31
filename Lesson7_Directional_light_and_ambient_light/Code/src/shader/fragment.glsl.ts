export default `
#version 450

layout(set = 0, binding = 2) uniform sampler uSampler;
layout(set = 0, binding = 3) uniform texture2D cubeTexture;

layout(location = 0) in vec2 vUV;
layout(location = 1) in vec3 vLightWeighting;
layout(location = 0) out vec4 outColor;

void main(void) {
  vec4 textureColor = texture(sampler2D(cubeTexture, uSampler), vec2(vUV.s, 1 - vUV.t) );
  outColor = vec4(textureColor.rgb * vLightWeighting, textureColor.a);
}
`;