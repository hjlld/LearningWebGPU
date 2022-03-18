import { TypedArray, ImageUtils } from 'three';

export class App {

    public canvas: HTMLCanvasElement;

    public adapter: GPUAdapter;

    public device: GPUDevice;

    public context: GPUCanvasContext;

    public format: GPUTextureFormat = 'bgra8unorm';

    public commandEncoder: GPUCommandEncoder;

    public renderPassEncoder: GPURenderPassEncoder;

    public uniformGroupLayout: GPUBindGroupLayout;

    public renderPipeline: GPURenderPipeline;

    public devicePixelWidth: number;

    public devicePixelHeight: number;

    private _clearColor: GPUColorDict;

    public async CreateCanvas( rootElement: HTMLElement ) {

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

        return Promise.resolve( { 
            
            width: this.devicePixelWidth, 
            height: this.devicePixelHeight
        
        } );

    }

    public async InitWebGPU( width: number, height: number ) {

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

        let colorTexture = this.device.createTexture( {

            size: {
    
                width,
    
                height,
    
                depthOrArrayLayers: 1
    
            },
    
            sampleCount: 4,
    
            format: this.format,
    
            usage: GPUTextureUsage.RENDER_ATTACHMENT
    
        } );
    
        let colorAttachmentView = colorTexture.createView();

        let depthStencilTexture = this.device.createTexture( {

            size: {
    
                width,
    
                height,
    
                depthOrArrayLayers: 1
    
            },
    
            sampleCount: 4,
    
            format: 'depth24plus-stencil8',
    
            usage: GPUTextureUsage.RENDER_ATTACHMENT
    
        } );
    
        let depthStencilAttachmentView = depthStencilTexture.createView();

        return Promise.resolve( { colorAttachmentView, depthStencilAttachmentView } );

    }

    public InitRenderPass( clearColor: GPUColorDict, colorAttachmentView: GPUTextureView, depthStencilAttachmentView: GPUTextureView ) {

        this.commandEncoder = this.device.createCommandEncoder();

        let renderPassDescriptor: GPURenderPassDescriptor = {

            colorAttachments: [ {

                view: colorAttachmentView,

                resolveTarget: this.context.getCurrentTexture().createView(),
    
                loadValue: clearColor,

                storeOp: 'store'

            } ],

            depthStencilAttachment: {

                view: depthStencilAttachmentView,

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

        this.renderPassEncoder.setViewport( 0, 0, this.devicePixelWidth, this.devicePixelHeight, 0, 1 );

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

                    depthOrArrayLayers: 1

                },

                format: 'rgba8unorm',

                usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT

            } );

            let source: GPUImageCopyExternalImage = {

                source: bitmap

            };

            let destination: GPUImageCopyTexture = {

                texture: texture

            };

            let copySize: GPUExtent3D = {

                width: image.naturalWidth,

                height: image.naturalHeight,

                depthOrArrayLayers: 1

            };

            this.device.queue.copyExternalImageToTexture( source, destination, copySize );

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

                    buffer: {

                        type: 'uniform'

                    }

                },

                {

                    binding: 1,

                    visibility: GPUShaderStage.FRAGMENT,

                    sampler: {

                        type: 'filtering'

                    }

                },

                {

                    binding: 2,

                    visibility: GPUShaderStage.FRAGMENT,

                    texture: {

                        sampleType: 'float'

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

            code:fxCode

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

                        arrayStride: 4 * 2,

                        attributes: [

                            // uv

                            {

                                shaderLocation: 1,

                                offset: 0,

                                format: 'float32x2'

                            }

                        ],

                        stepMode: 'vertex'

                    }

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

            },

            depthStencil: {

                depthWriteEnabled: true,
    
                depthCompare: 'less',
    
                format: 'depth24plus-stencil8'
    
            },

            multisample: {

                count: 4

            }

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

        this.device.queue.submit( [ this.commandEncoder.finish() ] );

    }

    public RunRenderLoop( fn: Function ) {

        fn();

        requestAnimationFrame( () => this.RunRenderLoop( fn ) );

    }

}