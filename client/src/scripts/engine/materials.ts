import { Matrix, Model2D } from "common/scripts/engine/models.ts";
import { type Color, type GLMaterial2D, type GLMaterial2DFactory, type GLMaterial2DFactoryCall, type WebglRenderer } from "./renderer.ts";
import { Vec2 } from "common/scripts/engine/geometry.ts";

export type GL2D_GridMatArgs={
    color:Color
    width:number
    gridSize:number
}
export const GLF_Grid:GLMaterial2DFactoryCall<GL2D_GridMatArgs>={
    vertex:`
attribute vec2 a_Position;
uniform mat4 u_ProjectionMatrix;
uniform vec3 u_Translation;
varying vec2 v_WorldPosition;

void main() {
    v_WorldPosition = a_Position+u_Translation.xy;
    gl_Position = u_ProjectionMatrix * vec4(a_Position,u_Translation.z, 1.0);
}`,
    frag:`
precision mediump float;
varying vec2 v_WorldPosition;

uniform float u_GridSize;
uniform vec4 u_Color;
uniform float u_LineWidth;

void main() {
    vec2 grid = abs(mod(v_WorldPosition, u_GridSize) - (u_GridSize * 0.5));

    float line = 1.0-step(u_LineWidth, min(grid.x, grid.y));
    gl_FragColor = vec4(u_Color.rgb, line * u_Color.a);
}`,
create(gl:WebglRenderer,fac:GLMaterial2DFactory<GL2D_GridMatArgs>){
    const aPositionLoc=gl.gl.getAttribLocation(fac.program, "a_Position")
    const uColorLoc=gl.gl.getUniformLocation(fac.program, "u_Color")!
    const uGridSize=gl.gl.getUniformLocation(fac.program, "u_GridSize")!
    const uLineWidth=gl.gl.getUniformLocation(fac.program, "u_LineWidth")!
    const uTranslationLoc=gl.gl.getUniformLocation(fac.program, "u_Translation")!
    const uProjectionMatrixLoc=gl.gl.getUniformLocation(fac.program, "u_ProjectionMatrix")!

    const vertexBuffer = gl.gl.createBuffer();
    const draw=(mat:GLMaterial2D<GL2D_GridMatArgs>,matrix:Matrix,model:Model2D,position:Vec2,scale:Vec2)=>{
        gl.gl.useProgram(fac.program)

        gl.gl.bindBuffer(gl.gl.ARRAY_BUFFER, vertexBuffer);
        gl.gl.bufferData(gl.gl.ARRAY_BUFFER, model.vertices, gl.gl.STATIC_DRAW)

        gl.gl.enableVertexAttribArray(aPositionLoc)
        gl.gl.vertexAttribPointer(aPositionLoc, 2, gl.gl.FLOAT, false, 0, 0)

        gl.gl.uniform4f(uColorLoc, mat.color.r, mat.color.g, mat.color.b, mat.color.a)
        gl.gl.uniform2f(uTranslationLoc, position.x, position.y)
        gl.gl.uniform1f(uLineWidth, mat.width)
        gl.gl.uniform1f(uGridSize, mat.gridSize)
        gl.gl.uniformMatrix4fv(uProjectionMatrixLoc, false, matrix)
        gl.gl.drawArrays(gl.gl.TRIANGLES, 0, model.vertices.length / 2)
    }
    return (arg:GL2D_GridMatArgs)=>{
        return {
            ...arg,
            factory:fac,
            group:"",
            draw:draw
        }
    }
}
}
export type GL2D_TexMatArgs={
    texture:WebGLTexture
    tint:Color
}
export const GLF_Texture:GLMaterial2DFactoryCall<GL2D_TexMatArgs>={
    vertex:`
attribute vec2 a_Position;
attribute vec2 a_TexCoord;
    
uniform mat4 u_ProjectionMatrix;
uniform vec2 u_Translation;
uniform vec2 u_Scale;

varying highp vec2 vTextureCoord;

void main(void) {
    gl_Position = u_ProjectionMatrix*vec4((a_Position*u_Scale)+u_Translation,0.0,1.0);
    vTextureCoord = a_TexCoord;
}`,
    frag:`
precision mediump float;

varying highp vec2 vTextureCoord;
uniform sampler2D u_Texture;
uniform vec4 u_Tint;

void main(void) {
    vec2 flippedCoord = vec2(vTextureCoord.x, 1.0 - vTextureCoord.y);
    gl_FragColor = texture2D(u_Texture, flippedCoord)*u_Tint;
}`,
create(glr: WebglRenderer, fac: GLMaterial2DFactory<GL2D_TexMatArgs>) {
    const gl = glr.gl
    const aPositionLoc = gl.getAttribLocation(fac.program, "a_Position")
    const aTexCoordLoc = gl.getAttribLocation(fac.program, "a_TexCoord")
    const uTintLoc = gl.getUniformLocation(fac.program, "u_Tint")!
    const uTranslationLoc = gl.getUniformLocation(fac.program, "u_Translation")!
    const uScaleLoc = gl.getUniformLocation(fac.program, "u_Scale")!
    const uProjectionMatrixLoc = gl.getUniformLocation(fac.program, "u_ProjectionMatrix")!
    const uTextureLoc = gl.getUniformLocation(fac.program, "u_Texture")!

    const vertexBuffer = gl.createBuffer()!
    const textureCoordBuffer = gl.createBuffer()!

    const draw = (mat: GLMaterial2D<GL2D_TexMatArgs>, matrix: Matrix, model: Model2D, position: Vec2, scale: Vec2) => {
        gl.useProgram(fac.program)

        // Vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(aPositionLoc)
        gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0)

        // TexCoord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, model.tex_coords, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(aTexCoordLoc)
        gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, 0)

        // Texture
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, mat.texture)
        gl.uniform1i(uTextureLoc, 0)

        // Uniforms
        gl.uniform4f(uTintLoc, mat.tint.r, mat.tint.g, mat.tint.b, mat.tint.a)
        gl.uniform2f(uTranslationLoc, position.x, position.y)
        gl.uniform2f(uScaleLoc, scale.x, scale.y)
        gl.uniformMatrix4fv(uProjectionMatrixLoc, false, matrix)

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, model.vertices.length / 2)
    }


    return (arg: GL2D_TexMatArgs) => ({
        ...arg,
        factory: fac,
        draw
    })
}
}
export type GL2D_LightMatArgs = {
    color: Color
}

export const GLF_Light: GLMaterial2DFactoryCall<GL2D_LightMatArgs> = {
    vertex: `
attribute vec2 a_Position;
uniform mat4 u_ProjectionMatrix;
uniform vec2 u_Translation;
uniform vec2 u_Scale;
void main() {
    gl_Position = u_ProjectionMatrix * vec4((a_Position * u_Scale) + u_Translation, 0.0, 1.0);
}`,
    frag: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec4 u_Color;

void main() {
    //gl_FragColor = u_Color;
    gl_FragColor = vec4(u_Color.rgb*u_Color.a,u_Color.a);
}`,

    create(gl, fac) {
        const aPositionLoc = gl.gl.getAttribLocation(fac.program, "a_Position");
        const uColorLoc     = gl.gl.getUniformLocation(fac.program, "u_Color")!;
        const uTranslationLoc = gl.gl.getUniformLocation(fac.program, "u_Translation")!;
        const uScaleLoc = gl.gl.getUniformLocation(fac.program, "u_Scale")!;
        const uProjectionMatrixLoc = gl.gl.getUniformLocation(fac.program, "u_ProjectionMatrix")!;

        const vertexBuffer = gl.gl.createBuffer();

        const draw = (
            mat: GLMaterial2D<GL2D_LightMatArgs>,
            matrix: Matrix,
            model: Model2D,
            position: Vec2,
            scale: Vec2
        ) => {
            gl.gl.useProgram(fac.program)

            gl.gl.bindBuffer(gl.gl.ARRAY_BUFFER, vertexBuffer)
            gl.gl.bufferData(gl.gl.ARRAY_BUFFER, model.vertices, gl.gl.STATIC_DRAW)

            gl.gl.enableVertexAttribArray(aPositionLoc)
            gl.gl.vertexAttribPointer(aPositionLoc, 2, gl.gl.FLOAT, false, 0, 0)

            gl.gl.uniform4f(uColorLoc, mat.color.r, mat.color.g, mat.color.b, mat.color.a)

            gl.gl.uniform2f(uTranslationLoc, position.x, position.y)
            gl.gl.uniform2f(uScaleLoc, scale.x, scale.y)
            gl.gl.uniformMatrix4fv(uProjectionMatrixLoc, false, matrix)

            gl.gl.drawArrays(gl.gl.TRIANGLES, 0, model.vertices.length / 2)
        };

        return (arg: GL2D_LightMatArgs) => ({
            ...arg,
            factory: fac,
            draw
        });
    }
};