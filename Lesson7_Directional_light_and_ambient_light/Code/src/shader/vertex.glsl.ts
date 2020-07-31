export default `
#version 450

layout(binding = 0) uniform Position {

  mat4 uPMatrix;
  mat4 uMVMatrix;

};

layout(binding = 1) uniform Light {

  bool useLight;
  mat4 uNMatrix;

  vec3 uAmbientColor;
  vec3 uLightingDirection;
  vec3 uDirectionalColor;

};

layout(location = 0) in vec3 aVertexPosition;
layout(location = 1) in vec2 aVertexUV;
layout(location = 2) in vec3 aVertexNormal;
layout(location = 0) out vec2 vUV;
layout(location = 1) out vec3 vLightWeighting;

void main() {


  vUV = aVertexUV;

  if (!useLight) {
    vLightWeighting = vec3(1.0, 1.0, 1.0);
  } else {
    vec3 transformedNormal = ( uNMatrix * vec4(aVertexNormal, 1.0)).xyz;
    float directionalLightWeighting = max(dot(transformedNormal, uLightingDirection), 0.0);
    vLightWeighting = uAmbientColor + uDirectionalColor * directionalLightWeighting;
  }
  gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);

}
`;