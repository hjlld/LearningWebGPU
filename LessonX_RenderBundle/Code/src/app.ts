import { TypedArray } from 'three';

export class App {

    public canvas: HTMLCanvasElement;

    public adapter: GPUAdapter;

    public device: GPUDevice;

    public context: GPUCanvasContext;

    public format: GPUTextureFormat = 'bgra8unorm';

    public commandEncoder: GPUCommandEncoder;

    public renderBundleEncoder: GPURenderBundleEncoder;

    public renderPassEncoder: GPURenderPassEncoder;

    public uniformGroupLayout: GPUBindGroupLayout;

    public renderPipeline: GPURenderPipeline;

    public devicePixelWidth: number;

    public devicePixelHeight: number;

    private _clearColor: GPUColorDict;

    public CreateCanvas( rootElement: HTMLElement ) {

        let width = rootElement.clientWidth;

        let height = rootElement.clientHeight;

        this.devicePixelWidth = width * window.devicePixelRatio;

        this.devicePixelHeight = height * window.devicePixelRatio;

        this.canvas = document.createElement( 'canvas' );

        this.canvas.width = this.devicePixelWidth;

        this.canvas.height = this.devicePixelHeight;

        this.canvas.style.width = '100%';

        this.canvas.style.height = '100%';

        rootElement.appendChild( this.canvas );

    }

    public async InitWebGPU() {

        this.adapter = await navigator.gpu.requestAdapter( {

            powerPreference: 'high-performance'

        } );

        this.device = await this.adapter.requestDevice();

        this.context = <unknown>this.canvas.getContext( 'webgpu' ) as GPUCanvasContext;
        
        this.format = this.context.getPreferredFormat( this.adapter );
        
        this.context.configure( {

            device: this.device,

            format: this.format,

            usage: GPUTextureUsage.RENDER_ATTACHMENT

        } );

    }

    public InitRenderPass() {


        let renderBundleEncoderDescriptor: GPURenderBundleEncoderDescriptor = {

            colorFormats: [ this.format ]

        };

        this.renderBundleEncoder = this.device.createRenderBundleEncoder( renderBundleEncoderDescriptor );

    }

    public InitPipelineWitMultiBuffers( vxCode: string, fxCode: string ) {

        this.uniformGroupLayout = this.device.createBindGroupLayout( {

            entries: [

                {

                    binding: 0,

                    visibility: GPUShaderStage.VERTEX,

                    buffer: {

                        type: 'uniform'

                    }

                }

            ]

        } );

        let layout: GPUPipelineLayout = this.device.createPipelineLayout( {

            bindGroupLayouts: [ this.uniformGroupLayout ]

        } );

        let vxModule: GPUShaderModule = this.device.createShaderModule( {

            code: vxCode

        } );

        let fxModule: GPUShaderModule = this.device.createShaderModule( {

            code: fxCode

        } );

        this.renderPipeline = this.device.createRenderPipeline( {

            layout: layout,

            vertex: {

                buffers: [

                    {

                        arrayStride: 4 * 3,

                        attributes: [

                            // position

                            {

                                shaderLocation: 0,

                                offset: 0,

                                format: 'float32x3'

                            }

                        ],

                        stepMode: 'vertex'

                    },

                    {

                        arrayStride: 4 * 4,

                        attributes: [

                            // color

                            {

                                shaderLocation: 1,

                                offset: 0,

                                format: 'float32x4'

                            }

                        ],

                        stepMode: 'vertex'

                    },

                ],

                module: vxModule,

                entryPoint: 'main'

            },

            fragment: {

                module: fxModule,

                entryPoint: 'main',

                targets: [

                    {

                        format: this.format

                    }

                ]

            },

            primitive: {

                topology: 'triangle-list'

            }

        } );

        this.renderBundleEncoder.setPipeline( this.renderPipeline );

    }

    private _CreateGPUBuffer( typedArray: TypedArray, usage: GPUBufferUsageFlags ) {

        let gpuBuffer = this.device.createBuffer( {

            size: typedArray.byteLength,

            usage: usage | GPUBufferUsage.COPY_DST,

            mappedAtCreation: true

        } );

        let constructor = typedArray.constructor as new ( buffer: ArrayBuffer ) => TypedArray;

        let view = new constructor( gpuBuffer.getMappedRange() );

        view.set( typedArray, 0 );

        gpuBuffer.unmap();

        return gpuBuffer;

    }

    public InitGPUBufferWithMultiBuffers( vxArray: Float32Array, colorArray: Float32Array, idxArray: Uint32Array, mxArray: Float32Array ) {

        let vertexBuffer = this._CreateGPUBuffer( vxArray, GPUBufferUsage.VERTEX );

        this.renderBundleEncoder.setVertexBuffer( 0, vertexBuffer );

        let colorBuffer = this._CreateGPUBuffer( colorArray, GPUBufferUsage.VERTEX );

        this.renderBundleEncoder.setVertexBuffer( 1, colorBuffer, 0 );

        let indexBuffer = this._CreateGPUBuffer( idxArray, GPUBufferUsage.INDEX );
    
        this.renderBundleEncoder.setIndexBuffer( indexBuffer, 'uint32' );

        let uniformBuffer = this._CreateGPUBuffer( mxArray, GPUBufferUsage.UNIFORM );

        let uniformBindGroup = this.device.createBindGroup( {

            layout: this.uniformGroupLayout,

            entries: [ {

                binding: 0,

                resource: { buffer: uniformBuffer }

            } ]

        } );

        this.renderBundleEncoder.setBindGroup( 0, uniformBindGroup );

        return { uniformBuffer };

    }

    public Draw( indexCount: number, instanceCount: number = 3 ) {

        this.renderBundleEncoder.drawIndexed( indexCount, instanceCount, 0, 0, 0 );

    }

    public Present( renderBundle: GPURenderBundle, clearColor: GPUColorDict ) {

        this.commandEncoder = this.device.createCommandEncoder();

        let renderPassDescriptor: GPURenderPassDescriptor = {

            colorAttachments: [ {

                view: this.context.getCurrentTexture().createView(),

                loadValue: clearColor,

                storeOp: 'store'

            } ]

        }

        this.renderPassEncoder = this.commandEncoder.beginRenderPass( renderPassDescriptor );

        this.renderPassEncoder.executeBundles( [ renderBundle ] );

        this.renderPassEncoder.endPass();

        this.device.queue.submit( [ this.commandEncoder.finish() ] );

    }

    public RunRenderLoop( fn: Function ) {

        fn();

        requestAnimationFrame( () => this.RunRenderLoop( fn ) );

    }

}