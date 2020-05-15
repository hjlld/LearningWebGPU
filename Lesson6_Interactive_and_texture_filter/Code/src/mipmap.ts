export function GenerateMipmap( path: string ) {

    // only support PO2 sized texture now

    let image = new Image();

    image.src = path;

    return image.decode()

    .then( () => {

        let width = image.naturalWidth;

        let height = image.naturalHeight;

        let canvas = document.createElement( 'canvas' );

        let gl = canvas.getContext( 'webgl' ) as WebGLRenderingContext;

        let texture = gl.createTexture();

        gl.bindTexture( gl.TEXTURE_2D, texture );

        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );

        gl.generateMipmap( gl.TEXTURE_2D );

        let frameBuffer = gl.createFramebuffer();

        gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer );

        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE, texture, 0 );

        let buffer = new Uint8Array( 4 * width * height );

        gl.readPixels( 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

        return buffer;

    } );

    


}