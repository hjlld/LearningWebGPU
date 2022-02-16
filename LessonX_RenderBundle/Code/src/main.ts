import { App } from './app';
import vxCode from './shader/vertex.wgsl';
import fxCode from './shader/fragment.wgsl'
import { PerspectiveCamera, Matrix4, Vector3 } from 'three';

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

const triangleMVMatrix = new Matrix4();

let main = async () => {

    let camera = new PerspectiveCamera( 45, document.body.clientWidth / document.body.clientHeight, 0.1, 100 );

    let pMatrix = camera.projectionMatrix;

    let backgroundColor = { r: 0, g: 0, b: 0, a: 1.0 };

    let app = new App();

    app.CreateCanvas( document.body )

    await app.InitWebGPU();

    app.InitRenderPass();

    app.InitPipelineWitMultiBuffers( vxCode, fxCode );

    let lastTime = 0, rTri = 0;
 
    let animate = () => {

        let timeNow = performance.now();

        if ( lastTime != 0 ) {

            let elapsed = timeNow - lastTime;
 
            rTri += ( Math.PI / 180 * 90 * elapsed ) / 1000.0;

        }

        lastTime = timeNow;
    }

    app.renderBundleEncoder.setPipeline( app.renderPipeline );

    triangleMVMatrix.makeTranslation( -2, 0, -4 ).multiply( new Matrix4().makeRotationX( rTri ) );

    let triangleUniformBufferView = new Float32Array( pMatrix.toArray().concat( triangleMVMatrix.toArray() ) );

    let { uniformBuffer } = app.InitGPUBufferWithMultiBuffers( triangleVertexPositon, triangleVertexColor, triangleIndex, triangleUniformBufferView );

    app.Draw( triangleIndex.length, 3 );
    
    let renderBundle: GPURenderBundle = app.renderBundleEncoder.finish();

    app.RunRenderLoop( () => {

        animate();

        triangleMVMatrix.makeTranslation( -2, 0, -4 ).multiply( new Matrix4().makeRotationX( rTri ) );

        let triangleUniformBufferView = new Float32Array( pMatrix.toArray().concat( triangleMVMatrix.toArray() ) );

        app.device.queue.writeBuffer( uniformBuffer, 0, triangleUniformBufferView );

        app.Present( renderBundle, backgroundColor );
    
    })


}

window.addEventListener( 'DOMContentLoaded', main );