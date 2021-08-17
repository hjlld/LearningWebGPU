export class App {

    public canvas: HTMLCanvasElement;

    public context: GPUCanvasContext;

    public devicePixelWidth: number;

    public devicePixelHeight: number;

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

    public InitWebGPU() {

        this.context = <unknown>this.canvas.getContext( 'webgpu' ) as GPUCanvasContext;

        if ( this.context ) {

            console.info( `Congratulations! You've got a WebGPU context!` );

        } else {

            throw new Error( 'Your browser seems not support WebGPU!' );

        }

    }

}