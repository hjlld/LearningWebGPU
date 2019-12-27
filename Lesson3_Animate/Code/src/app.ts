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

    private _clearColor: GPUColorDict;

    public CreateCanvas( rootElement: HTMLElement ) {

        let width = rootElement.clientWidth;

        let height = rootElement.clientHeight;

        this.canvas = document.createElement( 'canvas' );

        this.canvas.width = width;

        this.canvas.height = height;

        this.canvas.style.width = '100%';

        this.canvas.style.height = '100%';

        rootElement.appendChild( this.canvas );

    }

    public async InitWebGPU() {

        this.adapter = await navigator.gpu.requestAdapter( {

            powerPreference: 'high-performance'

        } );

        this.glslang = await glslangModule();

        this.device = await this.adapter.requestDevice();

        this.context = <unknown>this.canvas.getContext( 'gpupresent' ) as GPUCanvasContext;

        this.swapChain = this.context.configureSwapChain( {

            device: this.device,

            format: this.format,

            usage: GPUTextureUsage.OUTPUT_ATTACHMENT | GPUTextureUsage.COPY_SRC

        } );

    }

    public InitRenderPass( clearColor: GPUColorDict ) {

        this.commandEncoder = this.device.createCommandEncoder();

        let renderPassDescriptor: GPURenderPassDescriptor = {

            colorAttachments: [ {

                attachment: this.swapChain.getCurrentTexture().createView(),

                loadValue: clearColor

            } ]

        }

        this.renderPassEncoder = this.commandEncoder.beginRenderPass( renderPassDescriptor );

        if ( !this._clearColor ) {

            this._clearColor = clearColor;

        }

        // this.renderPassEncoder.setViewport( 0, 0, this.canvas.clientWidth, this.canvas.clientHeight, 0, 1 );

    }

    public InitPipelineWitMultiBuffers( vxCode: string, fxCode: string ) {

        this.uniformGroupLayout = this.device.createBindGroupLayout( {

            bindings: [

                {

                    binding: 0,

                    visibility: GPUShaderStage.VERTEX,

                    type: 'uniform-buffer'

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

                        arrayStride: 4 * 4,

                        attributes: [

                            // color

                            {

                                shaderLocation: 1,

                                offset: 0,

                                format: 'float4'

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

            ]

        } );

        this.renderPassEncoder.setPipeline( this.renderPipeline );

    }

    public InitPipeline( vxCode: string, fxCode: string ) {

        this.uniformGroupLayout = this.device.createBindGroupLayout( {

            bindings: [

                {

                    binding: 0,

                    visibility: GPUShaderStage.VERTEX,

                    type: 'uniform-buffer'

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

                vertexBuffers: [ {

                    arrayStride: 4 * ( 3 + 4 ),

                    attributes: [

                        // position

                        {

                            shaderLocation: 0,

                            offset: 0,

                            format: 'float3'

                        },

                        // color

                        {

                            shaderLocation: 1,

                            offset: 4 * 3,

                            format: 'float4'

                        }

                    ]

                } ]

            },

            colorStates: [

                {

                    format: this.format

                }

            ]

        } );

        this.renderPassEncoder.setPipeline( this.renderPipeline );

    }
    public InitGPUBufferWithMultiBuffers( vxArray: Float32Array, colorArray: Float32Array, idxArray: Uint32Array, mxArray: Float32Array ) {

        let vertexBuffer: GPUBuffer = this.device.createBuffer( {

            size: vxArray.length * 4,

            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST

        } );

        vertexBuffer.setSubData( 0, vxArray );

        this.renderPassEncoder.setVertexBuffer( 0, vertexBuffer );

        let colorBuffer: GPUBuffer = this.device.createBuffer( {

            size: colorArray.length * 4,

            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST

        } );

        colorBuffer.setSubData( 0, colorArray );

        this.renderPassEncoder.setVertexBuffer( 1, colorBuffer, 0 );

        let indexBuffer: GPUBuffer = this.device.createBuffer( {

            size: idxArray.length * 4,

            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST

        } );
    
        indexBuffer.setSubData( 0, idxArray );
    
        this.renderPassEncoder.setIndexBuffer( indexBuffer );

        let uniformBuffer: GPUBuffer = this.device.createBuffer( {

            size: mxArray.length * 4,

            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST

        } );

        uniformBuffer.setSubData( 0, mxArray );

        let uniformBindGroup = this.device.createBindGroup( {

            layout: this.uniformGroupLayout,

            bindings: [ {

                binding: 0,

                resource: { buffer: uniformBuffer }

            } ]

        } );

        this.renderPassEncoder.setBindGroup( 0, uniformBindGroup );

        return { uniformBuffer };

    }

    public InitGPUBuffer( vxArray: Float32Array, idxArray: Uint32Array, mxArray: Float32Array ) {

        let vertexBuffer: GPUBuffer = this.device.createBuffer( {

            size: vxArray.length * 4,

            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST

        } );

        vertexBuffer.setSubData( 0, vxArray );

        this.renderPassEncoder.setVertexBuffer( 0, vertexBuffer );

        let indexBuffer: GPUBuffer = this.device.createBuffer( {

            size: idxArray.length * 4,

            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST

        } );
    
        indexBuffer.setSubData( 0, idxArray );
    
        this.renderPassEncoder.setIndexBuffer( indexBuffer );

        let uniformBuffer = this.device.createBuffer( {

            size: mxArray.length * 4,

            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST

        } );

        uniformBuffer.setSubData( 0, mxArray );

        let uniformBindGroup = this.device.createBindGroup( {

            layout: this.uniformGroupLayout,

            bindings: [ {

                binding: 0,

                resource: { buffer: uniformBuffer }

            } ]

        } );

        this.renderPassEncoder.setBindGroup( 0, uniformBindGroup );

        return { uniformBuffer };

    }

    public UpdateUniformBuffer( buffer: GPUBuffer, value: Float32Array ) {

        buffer.setSubData( 0, value );

    }

    public Draw( indexCount: number ) {

        this.renderPassEncoder.drawIndexed( indexCount, 1, 0, 0, 0 );

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