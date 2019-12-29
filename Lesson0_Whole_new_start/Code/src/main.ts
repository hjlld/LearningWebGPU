import { App } from './app';

let main = async () => {

    let app = new App();

    app.CreateCanvas( document.body )

    app.InitWebGPU();

}

window.addEventListener( 'DOMContentLoaded', main );