import { TypedArray } from 'three';

export class App {

    public canvas: HTMLCanvasElement;

    public adapter: GPUAdapter;

    public device: GPUDevice;

    public context: GPUPresentationContext;

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

            // maxAnisotropy: 4,

        },

        {

            magFilter: 'linear',

            minFilter: 'linear',
            
            // maxAnisotropy: 4,

        },

        {

            magFilter: 'linear',

            minFilter: 'linear',

            mipmapFilter: 'linear',

            maxAnisotropy: 4,

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

        this.device = await this.adapter.requestDevice();

        this.context = <unknown>this.canvas.getContext( 'gpupresent' ) as GPUPresentationContext;
        
        this.format = this.context.getPreferredFormat( this.adapter );
        
        this.context.configure( {

            device: this.device,

            format: this.format,

            usage: GPUTextureUsage.RENDER_ATTACHMENT

        } );

        let colorTexture = this.device.createTexture( {

            size: {
    
                width: width * window.devicePixelRatio,
    
                height: height * window.devicePixelRatio,
    
                depthOrArrayLayers: 1
    
            },
    
            sampleCount: 4,
    
            format: this.format,
    
            usage: GPUTextureUsage.RENDER_ATTACHMENT
    
        } );
    
        let colorAttachmentView = colorTexture.createView();

        let depthStencilTexture = this.device.createTexture( {

            size: {
    
                width: width * window.devicePixelRatio,
    
                height: height * window.devicePixelRatio,
    
                depthOrArrayLayers: 1
    
            },
    
            sampleCount: 4,
    
            format: 'depth24plus-stencil8',
    
            usage: GPUTextureUsage.RENDER_ATTACHMENT
    
        } );
    
        let depthStencilAttachmentView = depthStencilTexture.createView();

        this.samplers = this._samplerDescriptors.map( samplerDescriptor => {

            return this.device.createSampler( samplerDescriptor );

        });

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

        // this.renderPassEncoder.setViewport( 0, 0, this.canvas.clientWidth, this.canvas.clientHeight, 0, 1 );

    }

    public LoadTexture( url: string ) {

        let image = new Image();

        image.src = url;

        return image.decode()

        .then( () => {

            let width = image.naturalWidth;

            let height = image.naturalHeight;

            let levels = Math.floor( Math.log2( Math.max( width, height ) ) );

            let texture = this.device.createTexture( {

                size: { width, height, depthOrArrayLayers: 1 },

                format: 'rgba8unorm',

                usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.SAMPLED,

                mipLevelCount: levels + 1

            } );

            let canvas = document.createElementNS( 'http://www.w3.org/1999/xhtml', 'canvas' ) as HTMLCanvasElement;

            canvas.width = width;

            canvas.height = height;

            let gl = canvas.getContext( 'webgl2' ) as WebGL2RenderingContext;

            let glTexture = gl.createTexture();

            gl.bindTexture( gl.TEXTURE_2D, glTexture );

            gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );

            gl.generateMipmap( gl.TEXTURE_2D );

            let frameBuffer = gl.createFramebuffer();

            gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer );

            for ( let i = 0; i <= levels; i ++ ) {

                if ( i > 0 ) {

                    width = Math.max( Math.floor( width / 2 ), 1 );

                    height = Math.max( Math.floor( height / 2 ), 1);
    
                }

                gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glTexture, i );

                let buffer = new Uint8Array( 4 * width * height );

                gl.readPixels( 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer );

                let bytesPerRow = Math.ceil( width * 4 / 256 ) * 256;

                let destination: GPUImageCopyTexture = {
        
                    texture: texture,

                    mipLevel: i,
    
                };

                let copySize: GPUExtent3D = {

                    width: width,
    
                    height: height,
    
                    depthOrArrayLayers: 1
    
                };

                let commandEncoder = this.device.createCommandEncoder();

                if ( bytesPerRow === width * 4 ) {

                    let textureBuffer = this._CreateGPUBuffer( buffer, GPUBufferUsage.COPY_SRC );

                    let source: GPUImageCopyBuffer = {
    
                        buffer: textureBuffer,
        
                        bytesPerRow: bytesPerRow,
        
                        rowsPerImage: height,
    
                        offset: 0
        
                    };
        
                    commandEncoder.copyBufferToTexture( source, destination, copySize );
                    
                } else {

                    let aligned = new Uint8Array( bytesPerRow * height );

                    let index = 0;

                    for ( let y = 0; y < height; ++ y ) {

                        for ( let x = 0; x < width; ++ x ) {

                            let i = x * 4 + y * bytesPerRow;

                            aligned[ i ] = buffer[ index ];
                            aligned[ i + 1 ] = buffer[ index + 1 ];
                            aligned[ i + 2 ] = buffer[ index + 2 ];
                            aligned[ i + 3 ] = buffer[ index + 3 ];
                            
                            index += 4;

                        }

                    }

                    let textureBuffer = this._CreateGPUBuffer( aligned, GPUBufferUsage.COPY_SRC );

                    let source: GPUImageCopyBuffer = {
    
                        buffer: textureBuffer,
        
                        bytesPerRow: bytesPerRow,
        
                        rowsPerImage: height,
    
                        offset: 0
        
                    };
        
                    commandEncoder.copyBufferToTexture( source, destination, copySize );

                }

                this.device.queue.submit( [ commandEncoder.finish() ] );

            }

            return texture;

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

    public AddKeyboardEventListener<K extends keyof WindowEventMap>( type: K, key: string, handler: Function ) {

        window.addEventListener( type, ( event: WindowEventMap[ K ] ) => {

            if ( ( event as KeyboardEvent ).key === key ) {

                handler();

            }

        }, false );

    }

}