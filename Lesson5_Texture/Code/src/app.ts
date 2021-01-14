import glslangModule from '@webgpu/glslang/dist/web-devel/glslang.onefile';
import { TypedArray, ImageUtils } from 'three';

export class App {

    public canvas: HTMLCanvasElement;

    public adapter: GPUAdapter;

    public glslang: any;

    public device: GPUDevice;

    public context: GPUCanvasContext;

    public swapChain: GPUSwapChain;

    public format: GPUTextureFormat = 'bgra8unorm';

    public commandEncoder: GPUCommandEncoder;

    public renderPassEncoder: GPURenderPassEncoder;

    public uniformGroupLayout: GPUBindGroupLayout;

    public renderPipeline: GPURenderPipeline;

    private _clearColor: GPUColorDict;

    public async CreateCanvas( rootElement: HTMLElement ) {

        let width = rootElement.clientWidth;

        let height = rootElement.clientHeight;

        this.canvas = document.createElement( 'canvas' );

        this.canvas.width = width;

        this.canvas.height = height;

        this.canvas.style.width = '100%';

        this.canvas.style.height = '100%';

        rootElement.appendChild( this.canvas );

        return Promise.resolve( { width, height } );

    }

    public async InitWebGPU( width: number, height: number ) {

        this.adapter = await navigator.gpu.requestAdapter( {

            powerPreference: 'high-performance'

        } );

        this.glslang = await glslangModule();

        this.device = await this.adapter.requestDevice();

        this.context = <unknown>this.canvas.getContext( 'gpupresent' ) as GPUCanvasContext;
        
        // Passing a GPUDevice to getSwapChainPreferredFormat is deprecated. 
        // Pass a GPUAdapter instead, and update the calling code to 
        // expect a GPUTextureFormat to be retured instead of a Promise.
        // @ts-ignore
        this.format = this.context.getSwapChainPreferredFormat( this.adapter );
        
        this.swapChain = this.context.configureSwapChain( {

            device: this.device,

            format: this.format,

            usage: GPUTextureUsage.OUTPUT_ATTACHMENT

        } );

        let colorTexture = this.device.createTexture( {

            size: {
    
                width: width * window.devicePixelRatio,
    
                height: height * window.devicePixelRatio,
    
                depth: 1
    
            },
    
            sampleCount: 4,
    
            format: this.format,
    
            usage: GPUTextureUsage.OUTPUT_ATTACHMENT
    
        } );
    
        let colorAttachment = colorTexture.createView();

        let depthStencilTexture = this.device.createTexture( {

            size: {
    
                width: width * window.devicePixelRatio,
    
                height: height * window.devicePixelRatio,
    
                depth: 1
    
            },
    
            sampleCount: 4,
    
            format: 'depth24plus-stencil8',
    
            usage: GPUTextureUsage.OUTPUT_ATTACHMENT
    
        } );
    
        let depthStencilAttachment = depthStencilTexture.createView();

        return Promise.resolve( { colorAttachment, depthStencilAttachment } );

    }

    public InitRenderPass( clearColor: GPUColorDict, colorAttachment: GPUTextureView, depthStencilAttachment: GPUTextureView ) {

        this.commandEncoder = this.device.createCommandEncoder();

        let renderPassDescriptor: GPURenderPassDescriptor = {

            colorAttachments: [ {

                attachment: colorAttachment,

                resolveTarget: this.swapChain.getCurrentTexture().createView(),
    
                loadValue: clearColor

            } ],

            depthStencilAttachment: {

                attachment: depthStencilAttachment,
    
                depthLoadValue: 1.0,
    
                depthStoreOp: 'store',
    
                stencilLoadValue: 0,
    
                stencilStoreOp: 'store'
    
            }

        }

        this.renderPassEncoder = this.commandEncoder.beginRenderPass( renderPassDescriptor );

        if ( !this._clearColor ) {

            this._clearColor = clearColor;

        }

        // this.renderPassEncoder.setViewport( 0, 0, this.canvas.clientWidth, this.canvas.clientHeight, 0, 1 );

    }

    public LoadTexture( url: string ) {

        let image = new Image();

        image.src = url;

        return image.decode()

        .then( () => {

            return createImageBitmap( image );

        })

        .then( ( bitmap: ImageBitmap ) => {

            let texture = this.device.createTexture( {

                size: {

                    width: image.naturalWidth,

                    height: image.naturalHeight,

                    depth: 1

                },

                format: 'rgba8unorm',

                usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.SAMPLED

            } );

            let source: GPUImageBitmapCopyView = {

                imageBitmap: bitmap

            };

            let destination: GPUTextureCopyView = {

                texture: texture

            };

            let copySize: GPUExtent3D = {

                width: image.naturalWidth,

                height: image.naturalHeight,

                depth: 1

            };

            this.device.defaultQueue.copyImageBitmapToTexture( source, destination, copySize );

            bitmap.close();

            let sampler = this.device.createSampler( {

                magFilter: 'linear',

                minFilter: 'linear',

                mipmapFilter: 'linear',

                maxAnisotropy: 4

            } );

            return { texture, sampler };

        } );

    }

    public InitPipelineWitMultiBuffers( vxCode: string, fxCode: string ) {

        this.uniformGroupLayout = this.device.createBindGroupLayout( {

            entries: [

                {

                    binding: 0,

                    visibility: GPUShaderStage.VERTEX,

                    type: 'uniform-buffer'

                },

                {

                    binding: 1,

                    visibility: GPUShaderStage.FRAGMENT,

                    type: 'sampler'

                },

                {

                    binding: 2,

                    visibility: GPUShaderStage.FRAGMENT,

                    type: 'sampled-texture'

                }

            ]

        } );

        let layout: GPUPipelineLayout = this.device.createPipelineLayout( {

            bindGroupLayouts: [ this.uniformGroupLayout ]

        } );

        let vxModule: GPUShaderModule = this.device.createShaderModule( {

            code: this.glslang.compileGLSL( vxCode, 'vertex' )

        } );

        let fxModule: GPUShaderModule = this.device.createShaderModule( {

            code: this.glslang.compileGLSL( fxCode, 'fragment' )

        } );

        this.renderPipeline = this.device.createRenderPipeline( {

            layout: layout,

            vertexStage: {

                module: vxModule,

                entryPoint: 'main'

            },

            fragmentStage: {

                module: fxModule,

                entryPoint: 'main'

            },

            primitiveTopology: 'triangle-list',

            vertexState: {

                // indexFormat must be undefined when using non-strip primitive topologies
                indexFormat: undefined,
                
                vertexBuffers: [ 
                    
                    {

                        arrayStride: 4 * 3,

                        attributes: [

                            // position

                            {

                                shaderLocation: 0,

                                offset: 0,

                                format: 'float3'

                            }

                        ],

                        stepMode: 'vertex'

                    },

                    {

                        arrayStride: 4 * 2,

                        attributes: [

                            // uv

                            {

                                shaderLocation: 1,

                                offset: 0,

                                format: 'float2'

                            }

                        ],

                        stepMode: 'vertex'

                    },

                ]

            },

            colorStates: [

                {

                    format: this.format

                }

            ],

            depthStencilState: {

                depthWriteEnabled: true,
    
                depthCompare: 'less',
    
                format: 'depth24plus-stencil8'
    
            },

            sampleCount: 4

        } );

        this.renderPassEncoder.setPipeline( this.renderPipeline );

    }

    private _CreateGPUBuffer( typedArray: TypedArray, usage: GPUBufferUsageFlags ) {

        let gpuBuffer= this.device.createBuffer( {

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

    public InitGPUBufferWithMultiBuffers( vxArray: Float32Array, uvArray: Float32Array, mxArray: Float32Array, idxArray: Uint32Array, texture: GPUTexture, sampler: GPUSampler ) {

        let vertexBuffer = this._CreateGPUBuffer( vxArray, GPUBufferUsage.VERTEX );

        this.renderPassEncoder.setVertexBuffer( 0, vertexBuffer );

        let uvBuffer = this._CreateGPUBuffer( uvArray, GPUBufferUsage.VERTEX );

        this.renderPassEncoder.setVertexBuffer( 1, uvBuffer, 0 );

        let indexBuffer = this._CreateGPUBuffer( idxArray, GPUBufferUsage.INDEX );
    
        this.renderPassEncoder.setIndexBuffer( indexBuffer, "uint32" );

        let uniformBuffer = this._CreateGPUBuffer( mxArray, GPUBufferUsage.UNIFORM );

        let uniformBindGroup = this.device.createBindGroup( {

            layout: this.uniformGroupLayout,

            entries: [ 
                
                {

                    binding: 0,

                    resource: { buffer: uniformBuffer }

                },

                {

                    binding: 1,

                    resource: sampler

                },

                {

                    binding: 2,

                    resource: texture.createView()

                }
            ]

        } );

        this.renderPassEncoder.setBindGroup( 0, uniformBindGroup );

        return { uniformBuffer };

    }

    public DrawIndexed( indexCount: number ) {

        this.renderPassEncoder.drawIndexed( indexCount, 1, 0, 0, 0 );

    }

    public Draw( vertexCount: number ) {

        this.renderPassEncoder.draw( vertexCount, 1, 0, 0 );

    }

    public Present() {

        this.renderPassEncoder.endPass();

        this.device.defaultQueue.submit( [ this.commandEncoder.finish() ] );

    }

    public RunRenderLoop( fn: Function ) {

        fn();

        requestAnimationFrame( () => this.RunRenderLoop( fn ) );

    }

}