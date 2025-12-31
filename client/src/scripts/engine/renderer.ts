import { Vec2 } from "common/scripts/engine/mod.ts"
import { type Frame } from "./resources.ts";
import { Numeric } from "common/scripts/engine/utils.ts";
import { Matrix, Model2D} from "common/scripts/engine/models.ts";
import { GL2D_GridMatArgs, GL2D_GridMatAttr, GL2D_LightMatArgs, GL2D_LightMatAttr, GL2D_SimpleMatArgs, GL2D_SimpleMatAttr, GL2D_TexMatArgs, GL2D_TexMatAttr, GL3D_SimpleMatArgs, GL3D_SimpleMatAttr, GLF_Grid, GLF_Light, GLF_Simple, GLF_Simple3, GLF_Texture } from "./materials.ts";
export interface Color {
    r: number; // Red
    g: number; // Green
    b: number; // Blue
    a: number; // Alpha
}
export const ColorM={
    /**
     * Create The Color RGBA, limit=`(0 To 255)`
     * @param r Red
     * @param g Green
     * @param b Blue
     * @param a Alpha
     * @returns A New Color
     */
    rgba(r: number, g: number, b: number, a: number = 255): Color {
        return { r: r / 255, g: g / 255, b: b / 255, a: a / 255 };
    },
    hex(hex: string): Color {
        hex = hex.replace("#", "");
        if ([3, 4, 6, 8].indexOf(hex.length) === -1) throw new Error("Invalid Hex")

        const toFloat = (v: string) => parseInt(v.repeat(2 / v.length), 16) / 255

        const r = toFloat(hex[0])
        const g = toFloat(hex[1])
        const b = toFloat(hex[2])
        const a = hex.length > 3 ? toFloat(hex[3]) : 1

        return { r, g, b, a };
    },
    number(color:number):Color{
        color=Math.min(0xffffff,color)
        const r = (color >> 16) & 0xFF
        const g = (color >> 8) & 0xFF
        const b = color & 0xFF
        return { r:r/255, g:g/255, b:b/255, a: 1 }
    },
    rgba2hex(color:Color):string{
        const red = (color.r*255).toString(16).padStart(2, '0')
        const green = (color.g*255).toString(16).padStart(2, '0')
        const blue = (color.b*255).toString(16).padStart(2, '0')

        const alpha = (color.a*255).toString(16).padStart(2, '0')

        if (alpha === 'ff') {
            return `#${red}${green}${blue}`
        }

        return `#${red}${green}${blue}${alpha}`
    },
    number2hex(color:number):string{
        return `0x${color.toString(16).padStart(6, '0')}`
    },
    hex2number(color: string): number {
        return parseInt(color.replace(/^0x/, ''), 16)
    },
    mult(dst:Color,x:Color,y:Color){
        dst.r=x.r*y.r
        dst.g=x.g*y.g
        dst.b=x.b*y.b
        dst.a=x.a*y.a
    },
    set1(dst:Color,val:Color){
        dst.r=val.r
        dst.g=val.g
        dst.b=val.b
        dst.a=val.a
    },
    default:{
        black:{
            r:0,
            g:0,
            b:0,
            a:1
        },
        white:{
            r:1,
            g:1,
            b:1,
            a:1
        },
        transparent:{
            r:0,
            g:0,
            b:0,
            a:0,
        },
        red:{
            r:1,
            g:0,
            b:0,
            a:1
        },
        green:{
            r:0,
            g:1,
            b:0,
            a:1
        },
        blue:{
            r:0,
            g:0,
            b:1,
            a:1
        },
        yellow:{
            r:1,
            g:1,
            b:0,
            a:1
        }
    },
    lerp(a:Color, b: Color,i:number): Color {
        return { r: Numeric.lerp(a.r,b.r,i), g: Numeric.lerp(a.g,b.g,i), b: Numeric.lerp(a.b,b.b,i), a: Numeric.lerp(a.a,b.a,i) };
    },
    clone(a:Color): Color {
        return { r: a.r,g: a.g,b: a.b,a: a.a};
    },
}
export type RGBAT={r: number, g: number, b: number, a?: number}
export type Material=GLMaterial

export type SingleBatchingCommand2D=({
    model:Model2D
    position:Vec2
    scale:Vec2
    // deno-lint-ignore no-explicit-any
    args:any
})
export abstract class SingleMatBatching2D<
    Command extends SingleBatchingCommand2D = SingleBatchingCommand2D
> {
    mat: Material
    renderer: Renderer
    draws: Command[] = []
    constructor(renderer: Renderer, mat: Material) {
        this.renderer = renderer
        this.mat = mat
    }
    draw(
        model: Model2D,
        position: Vec2,
        scale: Vec2,
        args: any
    ) {
        this.draws.push({
            model,
            position,
            scale,
            args
        } as Command)
    }
    clear() {
        this.draws.length = 0
    }
    render(matrix: Matrix) {
        if (this.draws.length === 0) return

        const mat = this.mat

        for (const cmd of this.draws) {
            mat.draw(
                { ...mat, ...cmd.args },
                matrix,
                cmd.model,
                cmd.position,
                cmd.scale
            )
        }

        this.clear()
    }
}

export abstract class Renderer {
    canvas: HTMLCanvasElement
    background: Color = ColorM.default.white;
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
    }
    abstract draw_image2D(image: Frame,position: Vec2,model:Float32Array,matrix:Matrix,tint?:Color): void
    abstract draw(material:Material,matrix:Matrix,attr:any):void
    abstract draw_single_mat_batcher2d(matrix:Matrix,batcher:SingleMatBatching2D):void
    abstract clear(): void

    fullCanvas(){
        fullCanvas(this.canvas)
    }
}

const texVertexShaderSource = `
attribute vec2 a_Position;
attribute vec2 a_TexCoord;
    
uniform mat4 u_ProjectionMatrix;
uniform vec2 u_Translation;

varying highp vec2 vTextureCoord;

void main(void) {
    gl_Position = u_ProjectionMatrix*vec4(a_Position+u_Translation.xy,0.0,1.0);
    vTextureCoord = a_TexCoord;
}`;

const texFragmentShaderSource = `
precision mediump float;

varying highp vec2 vTextureCoord;
uniform sampler2D u_Texture;
uniform vec4 u_Tint;

void main(void) {
    vec2 flippedCoord = vec2(vTextureCoord.x, 1.0 - vTextureCoord.y);
    gl_FragColor = texture2D(u_Texture, flippedCoord)*u_Tint;
}`;
// deno-lint-ignore no-explicit-any
export type GLMaterial<Args=any,Attr=any>={
    group:string
    factory:GLMaterialFactory<Args,Attr>
    draw:(mat:GLMaterial<Args,Attr>,matrix:Matrix,attr:Attr)=>void
}&Args
export interface GLMaterialFactory<Args,Attr>{
    create:(arg:Args)=>GLMaterial<Args,Attr>
    program:WebGLProgram
}
export type GLMaterialFactoryCall<Args,Attr>={vertex:string,frag:string,create:(gl:WebglRenderer,fac:GLMaterialFactory<Args,Attr>)=>(arg:Args)=>GLMaterial<Args,Attr>}

export class SingleMatBatching2DGL<Command extends SingleBatchingCommand2D=SingleBatchingCommand2D> extends SingleMatBatching2D<Command>{
    declare renderer:WebglRenderer
    declare mat:Material
    constructor(renderer:WebglRenderer,mat:Material){
        super(renderer,mat)
        this.mat=mat
    }
}
export class WebglRenderer extends Renderer {
    readonly gl: WebGLRenderingContext
    readonly tex_program:WebGLProgram
    readonly factorys2D:{
        simple:GLMaterialFactory<GL2D_SimpleMatArgs,GL2D_SimpleMatAttr>,
        grid:GLMaterialFactory<GL2D_GridMatArgs,GL2D_GridMatAttr>,
        texture:GLMaterialFactory<GL2D_TexMatArgs,GL2D_TexMatAttr>,
        light:GLMaterialFactory<GL2D_LightMatArgs,GL2D_LightMatAttr>
    }
    readonly factorys3D:{
        simple:GLMaterialFactory<GL3D_SimpleMatArgs,GL3D_SimpleMatAttr>,
    }

    readonly isWebGL2: boolean;
    proccess_factory<A,B>(fac_def:GLMaterialFactoryCall<A,B>):GLMaterialFactory<A,B>{
        const prog=this.createProgram(fac_def.vertex,fac_def.frag)
        const fac={
            program:prog
        }
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        fac.create=fac_def.create(this,fac)
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        return fac
    }
    factorys2D_consts:Record<string,Record<string,WebGLUniformLocation|number>>={}
    constructor(canvas: HTMLCanvasElement, background: Color = ColorM.default.white, version: 1 | 2 = 2) {
        super(canvas);
        const gl =
            version === 2
                ? canvas.getContext("webgl2", { antialias: true })
                : canvas.getContext("webgl", { antialias: true })
        
        if (!gl) throw new Error(`Failed to initialize WebGL${version}`)
        // deno-lint-ignore no-explicit-any
        this.gl = gl as any
        this.isWebGL2 = version === 2

        this.background = background;
        //Tex Program
        const tex_program = gl!.createProgram();
        gl!.attachShader(tex_program!, this.createShader(texVertexShaderSource, gl!.VERTEX_SHADER))
        gl!.attachShader(tex_program!, this.createShader(texFragmentShaderSource, gl!.FRAGMENT_SHADER))
        this.tex_program = tex_program!
        gl!.linkProgram(this.tex_program)

        this.factorys2D={
            simple:this.proccess_factory(GLF_Simple),
            grid:this.proccess_factory(GLF_Grid),
            texture:this.proccess_factory(GLF_Texture),
            light:this.proccess_factory(GLF_Light)
        }

        this.factorys3D={
            simple:this.proccess_factory(GLF_Simple3)
        }
        
        this.factorys2D_consts["texture_ADV"]={
            "position":this.gl.getAttribLocation(this.tex_program, "a_Position"),
            "coord":this.gl.getAttribLocation(this.tex_program, "a_TexCoord"),
            "color":this.gl.getUniformLocation(this.tex_program, "u_Color")!,
            "translation":this.gl.getUniformLocation(this.tex_program, "u_Translation")!,
            "scale":this.gl.getUniformLocation(this.tex_program, "u_Scale")!,
            "proj":this.gl.getUniformLocation(this.tex_program, "u_ProjectionMatrix")!,
            "texture":this.gl.getUniformLocation(this.tex_program, "u_Texture")!,
            "tint":this.gl.getUniformLocation(this.tex_program, "u_Tint")!,
        }

        document.body.addEventListener("pointerdown", e => {
            canvas.dispatchEvent(new PointerEvent("pointerdown", {
                pointerId: e.pointerId,
                button: e.button,
                clientX: e.clientX,
                clientY: e.clientY,
                screenY: e.screenY,
                screenX: e.screenX
            }));
        });
        document.body.addEventListener("mousemove", e => {
            canvas.dispatchEvent(new PointerEvent("mousemove", {
                button: e.button,
                clientX: e.clientX,
                clientY: e.clientY,
                screenY: e.screenY,
                screenX: e.screenX
            }))
        })

        canvas.tabIndex = 0
    }
    createShader(src: string, type: number): WebGLShader {
        const shader = this.gl.createShader(type);
        if (shader) {
            this.gl.shaderSource(shader, src);
            this.gl.compileShader(shader);
            if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
                throw Error("" + this.gl.getShaderInfoLog(shader));
            }
            return shader;
        }
        throw Error("Can't create shader");
    }
    createProgram(vertex:string,frag:string):WebGLProgram{
        const p = this.gl.createProgram();
        this.gl.attachShader(p!, this.createShader(vertex, this.gl.VERTEX_SHADER))
        this.gl.attachShader(p!, this.createShader(frag, this.gl.FRAGMENT_SHADER))
        this.gl.linkProgram(p!)
        return p!
    }
    override draw(material:Material,matrix:Matrix,attr:any):void{
        material.draw(material,matrix,attr)
    }
    create_single_mat_batcher(mat:Material):SingleMatBatching2DGL{
        return new SingleMatBatching2DGL(this,mat)
    }
    override draw_single_mat_batcher2d(matrix:Matrix,batcher:SingleMatBatching2D):void{
        batcher.render(matrix)
    }
    draw_image2D(image: Frame, position: Vec2, model: Float32Array, matrix: Matrix, tint: Color = ColorM.default.white) {
        const gl = this.gl
        const program = this.tex_program
    
        // Position buffer
        const vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW)
    
        // UV buffer
        const tbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, tbo)
        gl.bufferData(gl.ARRAY_BUFFER, image.texture_coordinates, gl.STATIC_DRAW)
    
        gl.useProgram(program)
    
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.enableVertexAttribArray(this.factorys2D_consts["texture_ADV"]["position"] as number)
        gl.vertexAttribPointer(this.factorys2D_consts["texture_ADV"]["position"] as number, 2, gl.FLOAT, false, 0, 0)
    
        gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
        gl.enableVertexAttribArray(this.factorys2D_consts["texture_ADV"]["coord"] as number)
        gl.vertexAttribPointer(this.factorys2D_consts["texture_ADV"]["coord"]as number, 2, gl.FLOAT, false, 0, 0);
    
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, image.texture)
        gl.uniform1i(this.factorys2D_consts.texture_ADV.texture, 0);
    
        gl.uniformMatrix4fv(this.factorys2D_consts.texture_ADV.proj, false, matrix);
        gl.uniform2f(this.factorys2D_consts.texture_ADV.translation, position.x, position.y);
        gl.uniform4f(this.factorys2D_consts.texture_ADV.tint, tint.r, tint.g, tint.b, tint.a);
    
        // DRAW
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }    

    clear() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        this.gl.clearColor(this.background.r, this.background.g, this.background.b, 1)
        this.canvas.style.backgroundColor=`rgb(${0},${0},${0})`
        this.gl.clear(this.gl.COLOR_BUFFER_BIT |this.gl.DEPTH_BUFFER_BIT);
        
        this.gl.depthMask(true)
        this.gl.depthFunc(this.gl.LEQUAL)
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    }
}
export function createCanvas(size: Vec2, pixelated: boolean = true, center: boolean = true): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = size.x;
    canvas.height = size.y;

    canvas.tabIndex = 0
    canvas.focus()
    if (pixelated) {
        canvas.style.imageRendering = "pixelated"
        canvas.style.imageRendering = "crisp-edges"
        canvas.style.imageRendering = "-moz-crisp-edges"
    }
    if (center) {
        canvas.style.position = "absolute"
        canvas.style.left = "0px"
        canvas.style.right = "0px"
        canvas.style.top = "0px"
        canvas.style.bottom = "0px"
        canvas.style.margin = "auto"
    }
    return canvas;
}

export function applyBorder(elem: HTMLElement) {
    elem.style.border = "1px solid #000";
}

export function applyShadow(elem: HTMLElement) {
    elem.style.boxShadow = "0px 4px 17px 0px rgba(0,0,0,0.19)";
    elem.style.webkitBoxShadow = "0px 4px 17px 0px rgba(0,0,0,0.19)";
}

export function fullCanvas(elem: HTMLCanvasElement) {
    const ratio = self.devicePixelRatio || 1;

    elem.width  = self.innerWidth  * ratio;
    elem.height = self.innerHeight * ratio;

    elem.style.width  = `${self.innerWidth}px`;
    elem.style.height = `${self.innerHeight}px`;

    const ctx = elem.getContext("2d");
    if (ctx) {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
}
