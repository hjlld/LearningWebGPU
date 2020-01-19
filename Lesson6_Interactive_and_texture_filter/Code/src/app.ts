import glslangModule from '@webgpu/glslang/dist/web-devel/glslang.onefile';

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

    public samplers: GPUSampler[] = [];

    private _clearColor: GPUColorDict;
    
    private _samplerDescriptors: GPUSamplerDescriptor[] = [

        {

            magFilter: 'nearest',

            minFilter: 'nearest',

        },

        {

            magFilter: 'linear',

            minFilter: 'linear',

        },

        {

            magFilter: 'linear',

            minFilter: 'linear',

            mipmapFilter: 'linear'

        },

    ];

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
        
        this.format = await this.context.getSwapChainPreferredFormat( this.device );

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

        this.samplers = this._samplerDescriptors.map( samplerDescriptor => {

            return this.device.createSampler( samplerDescriptor );

        });

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

            let canvas = document.createElement( 'canvas' );

            canvas.width = image.width;

            canvas.height = image.width;

            let context2D = canvas.getContext( '2d' );

            context2D.drawImage( image, 0, 0, image.width, image.height );

            let imageData = context2D.getImageData( 0, 0, image.width, image.height );

            let dataView = new Uint8Array( imageData.data.buffer );

            let texture = this.device.createTexture( {

                size: {

                    width: image.width,

                    height: image.height,

                    depth: 1

                },

                format: 'rgba8unorm',

                usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.SAMPLED,

            } );

            let textureBuffer = this.device.createBuffer( {

                size: dataView.byteLength,

                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC

            } );

            textureBuffer.setSubData( 0, dataView );

            let source: GPUBufferCopyView = {

                buffer: textureBuffer,

                rowPitch: image.width * 4,

                imageHeight: 0

            };

            let destination: GPUTextureCopyView = {

                texture: texture

            };

            let copySize: GPUExtent3D = {

                width: image.width,

                height: image.height,

                depth: 1

            };

            let commandEncoder = this.device.createCommandEncoder();

            commandEncoder.copyBufferToTexture( source, destination, copySize );

            this.device.defaultQueue.submit( [ commandEncoder.finish() ] );

            return texture;

        } );

    }

    public InitPipelineWitMultiBuffers( vxCode: string, fxCode: string ) {

        this.uniformGroupLayout = this.device.createBindGroupLayout( {

            bindings: [

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

                indexFormat: 'uint32',

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

    public InitGPUBufferWithMultiBuffers( vxArray: Float32Array, uvArray: Float32Array, mxArray: Float32Array, idxArray: Uint32Array, texture: GPUTexture, sampler: GPUSampler ) {

        let vertexBuffer: GPUBuffer = this.device.createBuffer( {

            size: vxArray.length * 4,

            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST

        } );

        vertexBuffer.setSubData( 0, vxArray );

        this.renderPassEncoder.setVertexBuffer( 0, vertexBuffer );

        let uvBuffer: GPUBuffer = this.device.createBuffer( {

            size: uvArray.length * 4,

            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST

        } );

        uvBuffer.setSubData( 0, uvArray );

        this.renderPassEncoder.setVertexBuffer( 1, uvBuffer, 0 );

        if ( idxArray ) {

            let indexBuffer: GPUBuffer = this.device.createBuffer( {

                size: idxArray.length * 4,
    
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    
            } );
        
            indexBuffer.setSubData( 0, idxArray );
        
            this.renderPassEncoder.setIndexBuffer( indexBuffer )
        }

        let uniformBuffer: GPUBuffer = this.device.createBuffer( {

            size: mxArray.length * 4,

            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST

        } );

        uniformBuffer.setSubData( 0, mxArray );

        let uniformBindGroup = this.device.createBindGroup( {

            layout: this.uniformGroupLayout,

            bindings: [ 
                
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

    public AddKeyboardEventListener<K extends keyof WindowEventMap>( type: K, key: string, handler: Function ) {

        window.addEventListener( type, ( event: WindowEventMap[ K ] ) => {

            if ( ( event as KeyboardEvent ).key === key ) {

                handler();

            }

        }, false );

    }

}