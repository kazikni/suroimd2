import { EaseFunction, ease, v2 } from "common/scripts/engine/mod.ts";
import { Material2D } from "./renderer.ts";
import { type SoundManager } from "./sounds.ts";
import { Vec2 } from "common/scripts/engine/geometry.ts";
interface FrameData {
    x: number
    y: number
    w: number
    h: number
    file?:string
}
export const DefaultTexCoords = [
    0.0, 1.0,
    1.0, 1.0,
    0.0, 0.0,
    1.0, 0.0
];

export interface SpritesheetJSON {
    meta: { image: string,scale:number,size:{w:number,h:number} }
    frames: Record<string, FrameData>
}
export interface SoundDef{
    volume:number
    src:string
}

export class Frame{
    source:HTMLImageElement
    texture!:WebGLTexture
    src:string
    group:string
    frame_rect?:{
        x1:number
        y1:number
        x2:number
        y2:number
    }
    texture_coordinates:Float32Array
    frame_size?:Vec2
    living_texture:boolean=true
    readonly resourceType:SourceType.Frame=SourceType.Frame
    gl:WebGLRenderingContext
    constructor(source:HTMLImageElement,gl:WebGLRenderingContext,src:string,tc:number[]){
        this.source=source
        this.src=src
        this.gl=gl
        this.texture_coordinates=new Float32Array(tc)
        this.group=""
    }
    free(){
        if(!this.living_texture)return
        this.living_texture=false
        this.gl.deleteTexture(this.texture)
    }
}
export interface KeyFrame{
    ease:EaseFunction
    // deno-lint-ignore no-explicit-any
    value:any
    dest:string
    delay:number
}
export type Animation={
    resourceType:SourceType.Animation
    group:string
    keys:Record<string,KeyFrame[]>
}
export interface Sound extends SoundDef{
    volume:number
    buffer:AudioBuffer
    group:string
    resourceType:SourceType.Sound
}
export enum SourceType{
    Frame,
    Animation,
    Sound,
    Material
}
export type Source=Frame|Animation|Sound|Material2D
function loadTexture(gl:WebGLRenderingContext, source:HTMLImageElement) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source
    );
    //gl.generateMipmap(gl.TEXTURE_2D);
  
    return texture;
}
const default_sprite_src=
`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAFACAYAAADNkKWqAAAACXBIWXMAAD5/AAA+fwFuH9ocAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAABEZJREFUeJzt1jERhFAUBMEPdSnSSBBKctIQADJeMN0KNpraba31LhhyHvf0BML26QEAUwQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIOt3Hvf0BsL+zzU9gTAPEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIGsD29rB4lxkNocAAAAAElFTkSuQmCC`
export class ResourcesManager{
    sources:Record<string,Source>
    canvas:HTMLCanvasElement
    ctx:CanvasRenderingContext2D
    domp=new DOMParser()
    dome=new XMLSerializer()
    gl:WebGLRenderingContext
    audioCtx:AudioContext
    soundsManager:SoundManager
    default_sprite:Frame
    constructor(gl:WebGLRenderingContext,soundsManager:SoundManager){ 
        this.sources={}
        this.canvas=document.createElement("canvas")
        this.ctx=this.canvas.getContext("2d")!
        this.gl=gl
        this.audioCtx=soundsManager.ctx
        this.soundsManager=soundsManager

        const img=new Image()
        img.src=default_sprite_src
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        this.default_sprite=new Frame(img,null,default_sprite_src,default_sprite_src);
        this.default_sprite.source.addEventListener("load",()=>{
            this.default_sprite.texture=loadTexture(this.gl,this.default_sprite.source)!
        })
    }
    async load_source(id:string,src:string,volume:number=1,group:string=""):Promise<Source|undefined>{
        if(src.endsWith(".svg")||src.endsWith(".png")){
            return await this.load_sprite(id,src,group)
        }else if(src.endsWith(".mp3")){
            return await this.load_audio(id,{src:src,volume:volume},group)
        }
        return undefined
    }
    clear(blacklist:string[]=[]){
        for(const r of Object.keys(this.sources)){
            if(blacklist.includes(r)||blacklist.includes(this.sources[r].group))continue
            console.log("Unloading: ",r)
            this.unload(r)
        }
    }
    render_text(text:string, fontSize = 32,color="white",font:string="Arial"):Promise<Frame>{
        return new Promise<Frame>((resolve, _reject) => {
            this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height)
            this.ctx.save()
            this.ctx.font = `${fontSize}px ${font}`
            const textMetrics = this.ctx.measureText(text)
            this.canvas.width = textMetrics.width
            this.canvas.height = fontSize * 1.5


            this.ctx.font=`${fontSize}px ${font}`
            this.ctx.font = `${fontSize}px ${font}`
            this.ctx.fillStyle = color
            this.ctx.fillText(text, 0, fontSize)

            const src=this.canvas.toDataURL()

            this.ctx.restore()
            const ret=new Frame(new Image(),this.gl,src,[
                0.0, 1.0, // top-left
                1.0, 1.0, // top-right
                0.0, 0.0, // bottom-left
                1.0, 0.0  // bottom-right
            ]);
            ret.source.addEventListener("load",()=>{
                const sp=ret as Frame
                sp.texture=loadTexture(this.gl,sp.source)!
                ret.frame_size=v2.new(sp.source.width,sp.source.height)
                resolve(ret)
            });
            ret.source.src=src
        })
    }
    get_frame_from_canvas(canvas:HTMLCanvasElement,gl?:WebGLRenderingContext):Promise<Frame>{
        return new Promise<Frame>((resolve) => {  
            const src=canvas.toDataURL()
            const ret=new Frame(new Image(),gl??this.gl,src,[
                0.0, 1.0,
                1.0, 1.0,
                0.0, 0.0,
                0.0, 0.0,
                1.0, 1.0,
                1.0, 0.0
            ])
            ret.source.addEventListener("load",()=>{
                const sp=ret as Frame
                sp.texture=loadTexture(this.gl,sp.source)!
                resolve(ret)
            });
            ret.source.src=src
        })
    }
    get_sprite(id:string):Frame{
        if(!this.sources[id]){
            return this.default_sprite
        }
        return this.sources[id] as Frame
    }
    async load_spritesheet(idPrefix: string, json: SpritesheetJSON, imagePathOverride?: string, group:string="") {
        const image = await this.load_image(imagePathOverride ?? json.meta.image);
        const tex = loadTexture(this.gl, image);

        for (const [id, frame] of Object.entries(json.frames)) {
            const iw = image.width;
            const ih = image.height;
            const rect = {
                x1: frame.x / iw,
                y1: 1.0 - (frame.y + frame.h) / ih,
                x2: (frame.x + frame.w) / iw,
                y2: 1.0 - frame.y / ih
            };
            const sprite = new Frame(image, this.gl, frame.file??"",
                [
                    rect.x1, rect.y2, // top-left
                    rect.x2, rect.y2, // top-right
                    rect.x1, rect.y1, // bottom-left
                    rect.x2, rect.y1  // bottom-right
                ]                
            );
            sprite.texture = tex;
            sprite.group=group

            sprite.frame_size=v2.new(frame.w/json.meta.scale,frame.h/json.meta.scale)
            this.sources[`${idPrefix}${id}`] = sprite;
        }
    }

    private load_image(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    load_sprite(id:string,src:string,group:string=""):Promise<Frame>{
        return new Promise<Frame>((resolve, _reject) => {
            if(this.sources[id])resolve(this.sources[id] as Frame)
            this.sources[id]=new Frame(new Image(),this.gl,src,[
                0.0, 1.0,
                1.0, 1.0,
                0.0, 0.0,
                0.0, 0.0,
                1.0, 1.0,
                1.0, 0.0
            ]);
            (this.sources[id] as Frame).group=group;
            (this.sources[id] as Frame).source.addEventListener("load",()=>{
                const sp=this.sources[id] as Frame
                sp.texture=loadTexture(this.gl,sp.source)!
                resolve(sp)
            });
            (this.sources[id] as Frame).source.src=src;
            
        })
    }
    load_material2D(id:string,mat:Material2D){
        this.sources[id]=mat
    }
    get_material2D(id:string):Material2D{
        return this.sources[id] as Material2D
    }
    get_audio(id:string):Sound{
        return this.sources[id] as Sound
    }
    load_audio(id:string,def:SoundDef,group:string=""):Promise<Sound|undefined>{
        return new Promise<Sound|undefined>((resolve, reject) => {
            if (this.sources[id] != undefined) {
                resolve(this.sources[id] as Sound)
            }
    
            const xhr = new XMLHttpRequest()
            xhr.open("GET", def.src);
            xhr.responseType = "arraybuffer";
            const onfailure = function onfailure(_event:ProgressEvent<XMLHttpRequestEventTarget>) {
                reject(`Failed loading sound file: ${id}`)
            };
            xhr.addEventListener("load", (event) => {
                const arrayBuffer = xhr.response;
                if (!arrayBuffer) {
                    onfailure(event);
                    return;
                }
                this.audioCtx.decodeAudioData(arrayBuffer, (audioBuffer) => {
                    (this.sources[id] as Sound)={buffer:audioBuffer,src:def.src,volume:def.volume??1,resourceType:SourceType.Sound,group:group}
                    resolve(this.sources[id] as Sound)
                    
                }, () => {
                    reject(`Failed decoding sound: ${id}`);
                    resolve(undefined)
                });
            });
            xhr.addEventListener("abort", onfailure);
            xhr.addEventListener("error", onfailure);
            xhr.addEventListener("timeout", onfailure);
            xhr.send();
        })
    }
    get_animation(id:string):Animation{
        return this.sources[id] as Animation
    }
    async load_animation(id:string,path:string,group:string=""):Promise<Animation>{
        const json=await(await fetch(path)).json()
        let anim!:Animation
        for(const k of Object.keys(json["keys"])){
            anim={resourceType:SourceType.Animation,keys:{},group:group}
            anim.keys[k]=[]
            for(const f of json.keys){
                anim.keys[k].push({ease:ease[f.ease as (keyof typeof ease)],delay:f.delay,value:f.value,dest:f.dest})
            }
        }
        this.sources[id]=anim
        return this.sources[id] as Animation
    }
    unload(id:string){
        if(this.sources[id]){
            switch(this.sources[id].resourceType){
                case SourceType.Frame:
                    (this.sources[id] as Frame).free();
                    break
                default:
                    break
            }
            delete this.sources[id]
        }
    }
    async load_group(path:string,name:string=""){
        const files=await(await fetch(path)).json()
        for(const f of Object.keys(files.files)){
            await this.load_source(f,files.files[f],undefined,name)
        }
    }
}
export enum AudioState{
    finished,
    playing,
    succeeded,
    failed,
    inited,
    interrupt
}