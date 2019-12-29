export class App {

    public canvas: HTMLCanvasElement;

    public context: GPUCanvasContext;

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

    public InitWebGPU() {

        this.context = <unknown>this.canvas.getContext( 'gpupresent' ) as GPUCanvasContext;

        if ( this.context ) {

            console.info( `Congratulations! You've got a WebGPU context!` );

        } else {

            throw new Error( 'Your browser seems not support WebGPU!' );

        }

    }

}