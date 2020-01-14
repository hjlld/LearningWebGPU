import { App } from './app';
import vxCode from './shader/vertex.glsl';
import fxCode from './shader/fragment.glsl'
import { PerspectiveCamera, Matrix4, Vector3 } from 'three';

const triangleVertex = new Float32Array( [

    // position         // color
    0.0,  1.0,  0.0,    1.0, 0.0, 0.0, 1.0,
   -1.0, -1.0,  0.0,    0.0, 1.0, 0.0, 1.0,
    1.0, -1.0,  0.0,    0.0, 0.0, 1.0, 1.0

] );

const triangleVertexPositon = new Float32Array( [
  
    0.0,  1.0,  0.0, 
   -1.0, -1.0,  0.0, 
    1.0, -1.0,  0.0, 

] );

const triangleVertexColor = new Float32Array( [

    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0

] );

const triangleIndex = new Uint32Array( [ 0, 1, 2 ] );

const triangleMVMatrix = new Matrix4().makeTranslation( -1.5, 0.0, -7.0 );

const squareVertex = new Float32Array( [

    // position         // color
     1.0,  1.0,  0.0,   0.5, 0.5, 1.0, 1.0,
    -1.0,  1.0,  0.0,   0.5, 0.5, 1.0, 1.0,
     1.0, -1.0,  0.0,   0.5, 0.5, 1.0, 1.0,
    -1.0, -1.0,  0.0,   0.5, 0.5, 1.0, 1.0

] );

const squareVertexPosition = new Float32Array( [

     1.0,  1.0,  0.0,
    -1.0,  1.0,  0.0,
     1.0, -1.0,  0.0,
    -1.0, -1.0,  0.0

] );

const squareVertexColor = new Float32Array( [

    0.5, 0.5, 1.0, 1.0

] );

const squareIndex = new Uint32Array( [ 0, 1, 2, 1, 2, 3 ] );

const squareMVMatrix = new Matrix4().makeTranslation( 1.5, 0.0, -7.0 );

let main = async () => {

    let camera = new PerspectiveCamera( 45, document.body.clientWidth / document.body.clientHeight, 0.1, 100 );

    let pMatrix = camera.projectionMatrix;

    let triangleUniformBufferView = new Float32Array( pMatrix.toArray().concat( triangleMVMatrix.toArray() ) );

    let squareUniformBufferView = new Float32Array( pMatrix.toArray().concat( squareMVMatrix.toArray() ) );

    let backgroundColor = { r: 0, g: 0, b: 0, a: 1.0 };

    let app = new App();

    app.CreateCanvas( document.body );

    await app.InitWebGPU();

    app.InitRenderPass( backgroundColor );

    app.InitPipeline( vxCode, fxCode );

    app.InitGPUBuffer( triangleVertex, triangleIndex, triangleUniformBufferView );

    app.Draw( triangleIndex.length );

    app.InitPipelineWitMultiBuffers( vxCode, fxCode );

    app.InitGPUBufferWithMultiBuffers( squareVertexPosition, squareVertexColor, squareIndex, squareUniformBufferView );

    app.Draw( squareIndex.length );

    app.Present();

}

window.addEventListener( 'DOMContentLoaded', main );