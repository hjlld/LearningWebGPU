import { App } from './app';
import vxCode from './shader/vertex.wgsl';
import fxCode from './shader/fragment.wgsl'
import { PerspectiveCamera, Matrix4, Vector3 } from 'three';

const pyramidVertexPositon = new Float32Array( [
  
    // Front face
     0.0,  1.0,  0.0,
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,

    // Right face
    0.0,  1.0,  0.0,
    1.0, -1.0,  1.0,
    1.0, -1.0, -1.0,

    // Back face
     0.0,  1.0,  0.0,
     1.0, -1.0, -1.0,
    -1.0, -1.0, -1.0,

    // Left face
     0.0,  1.0,  0.0,
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0

] );

const pyramidVertexColor = new Float32Array( [

    // Front face
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,

    // Right face
    1.0, 0.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 1.0, 0.0, 1.0,

    // Back face
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,

    // Left face
    1.0, 0.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 1.0, 0.0, 1.0

] );

const pyramidMVMatrix = new Matrix4();

const cubeVertexPosition = new Float32Array( [

    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
    1.0, -1.0, -1.0,
    1.0,  1.0, -1.0,
    1.0,  1.0,  1.0,
    1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0

] );

const cubeVertexColor = new Float32Array( [

    1.0, 0.0, 0.0, 1.0, // Front face
    1.0, 0.0, 0.0, 1.0, // Front face
    1.0, 0.0, 0.0, 1.0, // Front face
    1.0, 0.0, 0.0, 1.0, // Front face
    1.0, 1.0, 0.0, 1.0, // Back face
    1.0, 1.0, 0.0, 1.0, // Back face
    1.0, 1.0, 0.0, 1.0, // Back face
    1.0, 1.0, 0.0, 1.0, // Back face
    0.0, 1.0, 0.0, 1.0, // Top face
    0.0, 1.0, 0.0, 1.0, // Top face
    0.0, 1.0, 0.0, 1.0, // Top face
    0.0, 1.0, 0.0, 1.0, // Top face
    1.0, 0.5, 0.5, 1.0, // Bottom face
    1.0, 0.5, 0.5, 1.0, // Bottom face
    1.0, 0.5, 0.5, 1.0, // Bottom face
    1.0, 0.5, 0.5, 1.0, // Bottom face
    1.0, 0.0, 1.0, 1.0, // Right face
    1.0, 0.0, 1.0, 1.0, // Right face
    1.0, 0.0, 1.0, 1.0, // Right face
    1.0, 0.0, 1.0, 1.0, // Right face
    0.0, 0.0, 1.0, 1.0,  // Left face
    0.0, 0.0, 1.0, 1.0, // Left face
    0.0, 0.0, 1.0, 1.0,  // Left face
    0.0, 0.0, 1.0, 1.0  // Left face

] );

const cubeIndex = new Uint32Array( [
    
    0, 1, 2,      0, 2, 3,    // Front face
    4, 5, 6,      4, 6, 7,    // Back face
    8, 9, 10,     8, 10, 11,  // Top face
    12, 13, 14,   12, 14, 15, // Bottom face
    16, 17, 18,   16, 18, 19, // Right face
    20, 21, 22,   20, 22, 23  // Left face

 ] );

const cubeMVMatrix = new Matrix4();

let main = async () => {

    let camera = new PerspectiveCamera( 45, document.body.clientWidth / document.body.clientHeight, 0.1, 100 );

    let pMatrix = camera.projectionMatrix;

    let backgroundColor = { r: 0, g: 0, b: 0, a: 1.0 };

    let app = new App();

    app.CreateCanvas( document.body )

    .then( ( { width, height } ) => {

        return app.InitWebGPU( width, height );

    })

    .then( ( { colorAttachmentView, depthStencilAttachmentView } ) => {

        app.InitRenderPass( backgroundColor, colorAttachmentView, depthStencilAttachmentView )

        app.InitPipelineWitMultiBuffers( vxCode, fxCode );

        let lastTime = 0, rPyramid = 0, rCube = 0;
     
        let animate = () => {
    
            let timeNow = new Date().getTime();
    
            if ( lastTime != 0 ) {
    
                let elapsed = timeNow - lastTime;
     
                rPyramid += ( Math.PI / 180 * 90 * elapsed ) / 1000.0;
    
                rCube -= ( Math.PI / 180 * 75 * elapsed ) / 1000.0;
    
            }
    
            lastTime = timeNow;
        }
    
        app.RunRenderLoop( () => {
    
            animate();
    
            app.InitRenderPass( backgroundColor, colorAttachmentView, depthStencilAttachmentView );
    
            app.renderPassEncoder.setPipeline( app.renderPipeline );
            
            pyramidMVMatrix.makeTranslation( -1.5, 0.0, -8.0 ).multiply( new Matrix4().makeRotationY( rPyramid ) );
    
            cubeMVMatrix.makeTranslation( 1.5, 0.0, -8.0 ).multiply( new Matrix4().makeRotationAxis( new Vector3( 1.0, 1.0, 1.0 ).normalize(), rCube ) );
    
            let pyramidUniformBufferView = new Float32Array( pMatrix.toArray().concat( pyramidMVMatrix.toArray() ) );
    
            let cubeUniformBufferView = new Float32Array( pMatrix.toArray().concat( cubeMVMatrix.toArray() ) );
        
            app.InitGPUBufferWithMultiBuffers( pyramidVertexPositon, pyramidVertexColor, pyramidUniformBufferView );
    
            app.Draw( pyramidVertexPositon.length / 3 );
            
            app.InitGPUBufferWithMultiBuffers( cubeVertexPosition, cubeVertexColor, cubeUniformBufferView, cubeIndex );
    
            app.DrawIndexed( cubeIndex.length );
    
            app.Present();
        
        } );
    
    } );

}

window.addEventListener( 'DOMContentLoaded', main );