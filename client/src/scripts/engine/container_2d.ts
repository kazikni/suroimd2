import { SmoothShape2D, v2, Vec2, Vec2M, Vec4M } from "common/scripts/engine/geometry.ts";
import { Batcher, Color, ColorM, GLMaterial, Material, Renderer, WebglRenderer } from "./renderer.ts";
import { type ResourcesManager, type Frame, DefaultTexCoords } from "./resources.ts";
import { AKeyFrame, FrameDef, FrameTransform, KeyFrameSpriteDef } from "common/scripts/engine/definitions.ts";
import { Numeric, v2m } from "common/scripts/engine/mod.ts";
import { Hitbox2D, HitboxType2D } from "common/scripts/engine/hitbox.ts";
import { ClientGame2D } from "./game.ts";
import { type Tween } from "./utils.ts";
import { ImageModel2D, Matrix, matrix4, Model2D, model2d, triangulateConvex } from "common/scripts/engine/models.ts";
import { GL2D_LightMatArgs, GL2D_LightMatAttr } from "./materials.ts";
export interface CamA{
    matrix:Matrix
    position:Vec2
    size:Vec2
    meter_size:number
    center_pos:boolean
    batcher:Batcher
}
export abstract class Container2DObject {
    abstract object_type: string;

    parent?: Container2D;
    _zIndex: number = 0;

    has_update:boolean=false
    get zIndex():number{
        return this._zIndex
    }
    set zIndex(val:number){
        this._zIndex=val
        if(this.parent){
            this.parent.updateZIndex()
        }
    }

    id_on_parent:number=0

    _position: Vec2M
    get position(): Vec2 {
        return this._position as Vec2
    }
    set position(val: Vec2) {
        this._position.set(val.x,val.y)
    }
    _scale: Vec2M
    get scale(): Vec2 {
        return this._scale as Vec2
    }
    set scale(val: Vec2) {
        this._scale.set(val.x,val.y)
    }

    _rotation: number = 0
    get rotation():number{
        return this._rotation
    }
    set rotation(val:number){
        this._rotation=val
        this.update_real()
    }

    _tint: Vec4M
    get tint(): Color {
        return this._tint as Color
    }
    set tint(val: Color) {
        this._tint.set(val.r,val.g,val.b,val.a)
    }

    _real_position: Vec2 = v2.new(0, 0);
    _real_scale: Vec2 = v2.new(1, 1);
    _real_rotation: number = 0;
    _real_tint: Color = ColorM.rgba(255,255,255)

    sync_rotation:boolean=true

    _visible:boolean=true
    get visible():boolean{
        return this._visible
    }
    set visible(val:boolean){
        this._visible=val
        if(this.parent)this.parent.update_visibility()
    }

    destroyed:boolean=false
    destroy(){
        this.destroyed=true
        if(this.parent){
            let i=this.parent.children.indexOf(this)
            if(i!==-1)this.parent.children.splice(i,1)
            i=this.parent.update_children.indexOf(this)
            if(i!==-1)this.parent.update_children.splice(i,1)
            i=this.parent.visible_children.indexOf(this)
            if(i!==-1)this.parent.visible_children.splice(i,1)
        }
    }

    constructor(){
        const bid=this.update_real.bind(this)
        this._position=new Vec2M(0,0,bid)
        this._scale=new Vec2M(1,1,bid)
        this._tint=new Vec4M(1,1,1,1,bid)
    }

    update_v=true
    update_real(){
        this.update_v=true
    }
    update_visual(){
        if (this.parent&&!this.parent.object_group) {
            this._real_scale = v2.mult(this.parent._real_scale, this._scale);
            if(this.sync_rotation){
                this._real_rotation = this.parent._real_rotation + this._rotation
                v2m.mul(this._real_position,this._position,this.parent._real_scale)
                v2m.rotate_RadAngle(this._real_position,this.parent._real_rotation)
                v2m.add(this._real_position,this._real_position,this.parent._real_position)
            }else{
                this._real_rotation=this._rotation
                v2m.mul(this._real_position,this.parent._real_scale, this._position)
                v2m.add(this._real_position,this._real_position,this.parent._real_position)
            }

            ColorM.mult(this._real_tint,this._tint,this.parent._tint)
        } else {
            v2m.set(this._real_position,this._position._x,this._position._y)
            v2m.set(this._real_scale,this._scale._x,this._scale._y)
            this._real_rotation = this._rotation

            if (this.parent)
                ColorM.mult(this._real_tint,this._tint,this.parent._tint)
            else
                ColorM.set1(this._real_tint,this._tint)
        }
    }

    update(_dt:number,_resources:ResourcesManager): void {
    }
    draw_super(){
        if(this.update_v){
            this.update_visual()
            this.update_v=false
        }
    }
    abstract draw(cam:CamA,renderer: Renderer): Promise<void>;
}
type Graphics2DCommand =
  | { type: 'fillMaterial'; mat:Material }
  | { type: 'fillColor'; color:Color }
  | { type: 'fill' }
  | { type: 'path'; path:Model2D }
  | { type: 'model'; model:Model2D }

export class Graphics2D extends Container2DObject {
    object_type = "graphics2d"

    current_path:Vec2[]=[]
    current_position:Vec2=v2.new(0,0)

    repeat_size:number=1

    command: Graphics2DCommand[] = [];
    paths:number[][]=[]

    batcher?:Batcher

    beginPath(): this {
        this.current_path.length=0
        return this
    }
    lineTo(x:number,y:number):this{
        this.current_path.push(v2.new(x,y))
        this.current_position=v2.new(x,y)
        return this
    }
    smooth_shape(subdivisions=8) {
        this.current_path=SmoothShape2D(this.current_path,subdivisions)
    }

    endPath():this{
        this.command.push({type:"path",path:triangulateConvex(this.current_path,this.repeat_size)})
        this.current_path.length=0
        return this
    }
    fill():this{
        this.command.push({type:"fill"})
        return this
    }
    fill_material(mat:Material):this{
        this.command.push({type:"fillMaterial",mat:mat})
        return this
    }
    fill_color(color:Color):this{
        this.command.push({type:"fillColor",color})
        return this
    }
    clear(){
        this.command.length=0
    }
    drawGrid(begin:Vec2,size:Vec2,space:number,width:number){
        const minx=begin.x*space
        const miny=begin.y*space
        const maxx = (begin.x + size.x)*space
        const maxy = (begin.y + size.y)*space
        for (let x = minx; x <= maxx; x += space) {
            const p1 = v2.new(x, miny)
            const p2 = v2.new(x, maxy)
            this.drawLine(p1,p2,width)
        }
        for (let y = miny; y <= maxy; y += space) {
            const p1 = v2.new(minx, y)
            const p2 = v2.new(maxx, y)
            this.drawLine(p1,p2,width)
        }
    }
    drawLine(a:Vec2,b:Vec2,width:number){
        this.command.push({type:"model",model:model2d.line(a,b,width)})
    }
    drawModel(model:Model2D):Graphics2DCommand{
        const c:Graphics2DCommand={type:"model",model:model}
        this.command.push(c)
        return c
    }
    set_hitbox(hb:Hitbox2D){
        switch(hb.type){
            case HitboxType2D.rect:
                this.lineTo(hb.min.x,hb.min.y)
                this.lineTo(hb.max.x,hb.min.y)
                this.lineTo(hb.max.x,hb.max.y)
                this.lineTo(hb.min.x,hb.max.y)
                break
            case HitboxType2D.null:
            case HitboxType2D.circle:
            case HitboxType2D.group:
                break
            case HitboxType2D.polygon:
                for(const p of hb.points){
                    this.lineTo(p.x+hb.position.x,p.y+hb.position.y)
                }
                break
        }
    }
    color_material?:Material
    override draw(cam:CamA,renderer: Renderer): Promise<void> {
        return new Promise<void>((resolve) => {
            this.draw_super()
            const gl = renderer as WebglRenderer;
            if(!this.color_material)this.color_material=gl.factorys2D.simple_batch.create({})
            let currentMat: Material=this.color_material
            let current_color: Color={r:0,g:0,b:0,a:1}
            let currentModel:Model2D=model2d.zero()
            if(!this.batcher){
                this.batcher=new Batcher(renderer)
            }

            for (const cmd of this.command) {
                switch (cmd.type) {
                    case "fillMaterial":
                        currentMat=cmd.mat
                        break
                    case "fillColor":
                        current_color=cmd.color
                        currentMat=this.color_material
                        break
                    case "fill":
                        this.batcher.draw_model2d(currentMat,currentModel,this._real_position,this._real_scale,{
                            color:{
                                value:[current_color.r,current_color.g,current_color.b,current_color.a]
                            }
                        })
                        break
                    case "model": {
                        this.batcher.draw_model2d(currentMat,cmd.model,this._real_position,this._real_scale,{
                            color:{
                                value:[current_color.r,current_color.g,current_color.b,current_color.a]
                            }
                        })
                        break;
                    }
                    case "path":
                        currentModel=cmd.path
                        break
                }
            }
            this.batcher.render(cam.matrix)
            resolve()
        })
    }
}
export class Sprite2D extends Container2DObject{
    object_type:string="sprite2d"
    _frame?:Frame
    hotspot:Vec2=v2.new(0,0)
    _size?:Vec2M

    get size():Vec2|undefined{
        return this._size as Vec2|undefined
    }
    set size(val:Vec2|undefined){
        if(val){
            if(!this._size)this._size=new Vec2M(0,0,this.update_real.bind(this))
            this._size.set(val.x,val.y)
        }else{
            this._size=undefined
        }
    }

    _real_size:Vec2=v2.new(0,0)

    get frame():Frame|undefined{
        return this._frame
    }
    set frame(f:Frame|undefined){
        this._frame=f
        this.update_real()
    }

    frames?:KeyFrameSpriteDef[]
    current_delay:number=0
    current_frame:number=0

    old_ms=1

    cam?:CamA

    override update_visual(): void {
        super.update_visual()
        this.update_model()
    }

    update_model(){
        if(!this.frame||!this.frame.source||!this.cam)return
        this._real_size=this.size??this.frame.frame_size??v2.new(this.frame.source.width,this.frame.source.height)
        this.model=ImageModel2D(this._real_scale,this._real_rotation,this.hotspot,this._real_size,100,this._real_position)
        this.old_ms=this.cam.meter_size
    }

    model:Float32Array

    constructor(){
        super()
        this.model=ImageModel2D(this._real_scale,this.rotation,this.hotspot,v2.new(0,0),100)
    }
    
    set_frame(frame:FrameDef,resources:ResourcesManager){
        if(frame.scale)this.scale=v2.new(frame.scale,frame.scale)
        if(frame.hotspot)this.hotspot=v2.duplicate(frame.hotspot)
        if(frame.rotation)this.rotation=frame.rotation
        if(frame.visible)this.visible=frame.visible
        if(frame.zIndex)this.zIndex=frame.zIndex
        if(frame.position)this.position=v2.duplicate(frame.position)
        if(frame.image)this.frame=resources.get_sprite(frame.image)
        this.update_real()
    }
    
    transform_frame(frame:FrameTransform){
        if(frame.scale)this.scale=v2.new(frame.scale,frame.scale)
        if(frame.hotspot)this.hotspot=v2.duplicate(frame.hotspot)
        if(frame.rotation)this.rotation=frame.rotation
        if(frame.visible)this.visible=frame.visible
        if(frame.zIndex)this.zIndex=frame.zIndex
        if(frame.position)this.position=v2.duplicate(frame.position)
        this.update_real()
    }
    override draw(cam:CamA,_renderer: Renderer): Promise<void> {
        return new Promise<void>((resolve) => {
            this.draw_super()
            this.cam=cam
            //if(this.frame)renderer.draw_image2D(this.frame,this._real_position,this.model,cam.matrix,this._real_tint)
            cam.batcher.draw_frame2d(this.frame,this.model,this._real_tint)
            resolve()
        })
    }
}
export class AnimatedSprite2D extends Sprite2D{
    override object_type:string="animated_sprite2d"
    override has_update: boolean=true
    override update(dt:number,resources:ResourcesManager){
        super.update(dt,resources)
        if(this.frames){
            if(this.current_delay<this.frames[this.current_frame].delay){
                this.current_delay+=dt
            }else{
                this.current_delay=0
                this.current_frame=Numeric.loop(this.current_frame+1,0,this.frames.length)
                this.set_frame(this.frames[this.current_frame],resources)
            }
        }
    }
}
export class Container2D extends Container2DObject{
    object_type:string="container2d"
    children:Container2DObject[]=[]

    update_children:Container2DObject[]=[]
    visible_children:Container2DObject[]=[]
    override has_update: boolean=true

    object_group:boolean=false

    update_visibility(){
        this.visible_children = this.children.filter(c => c._visible)
    }
    override update(dt:number,resources:ResourcesManager){
        super.update(dt,resources);
        for (const c of this.update_children) c.update(dt,resources);
    }
    override update_real(): void {
        super.update_real()
        for (const c of this.children) c.update_real()
    }
    updateZIndex(){
        this.children.sort((a, b) => a.zIndex - b.zIndex || a.id_on_parent - b.id_on_parent);
    }
    async draw(cam:CamA,renderer:Renderer,objects?:Container2DObject[]):Promise<void>{
        this.draw_super()
        if(!objects)objects=this.visible_children
        for(let o =0;o<objects.length;o++){
            const c=objects[o]
            if(c.visible)await c.draw(cam,renderer)
        }
    }
    add_child(c:Container2DObject){
        c.id_on_parent=this.children.length+1
        c.parent=this
        this.children.push(c)
        if(c.has_update){
            this.update_children.push(c)
        }
        if(c._visible){
            this.visible_children.push(c)
        }
        c.update_real()
    }
    constructor(){
        super()
    }
}
export class AnimatedContainer2D extends Container2D{
    objects=new Map<string,Sprite2D>()
    override has_update: boolean=true

    current_animations:{
        current_kf:number
        current_delay:number
        keyframes:AKeyFrame[]
        on_complete?:()=>void
        tweens:Tween<any>[]
    }[]=[]
    game:ClientGame2D
    constructor(game:ClientGame2D){
        super()
        this.game=game
    }
    stop_all_animations(){
        for(const a of this.current_animations){
            for(const t of a.tweens){
                t.kill()
            }
        }
        this.current_animations=[]
    }
    play_animation(anim:AKeyFrame[],on_complete?:()=>void){
        const a={
            current_kf:-1,
            current_delay:0,
            keyframes:anim,
            on_complete:on_complete,
            tweens:[]
        }
        this.current_animations.push(a)
    }
    override update(dt: number, resources: ResourcesManager): void {
      super.update(dt,resources)
      for(let i=0;i<this.current_animations.length;i++){
        const a=this.current_animations[i]
        a.current_delay-=dt
        if(a.current_delay<=0){
            a.current_kf++
            if(a.current_kf>=a.keyframes.length){
                if(a.on_complete)a.on_complete()
                this.current_animations.splice(i,1)
                i--
                continue
            }else{
                a.tweens.length=0
                const nd=a.keyframes[a.current_kf].time
                a.current_delay=nd
                for(const action of a.keyframes[a.current_kf].actions){
                    switch(action.type){
                        case "sprite":
                            this.get_spr(action.fuser).set_frame(action,this.game.resources)
                            this.updateZIndex()
                            break
                        case "tween":{
                            const fuser=this.get_spr(action.fuser)
                            if(nd>0){
                                if(action.to.position){
                                    this.current_animations[i].tweens.push(this.game.addTween({
                                        duration:nd,
                                        target:fuser.position,
                                        yoyo:action.yoyo,
                                        ease:action.ease,
                                        to:action.to.position
                                    }))
                                }
                                if(action.to.hotspot){
                                    this.current_animations[i].tweens.push(this.game.addTween({
                                        duration:nd,
                                        target:fuser.hotspot,
                                        yoyo:action.yoyo,
                                        ease:action.ease,
                                        to:action.to.hotspot
                                    }))
                                }
                                if(action.to.rotation){
                                    this.current_animations[i].tweens.push(this.game.addTween({
                                        duration:nd,
                                        target:fuser,
                                        yoyo:action.yoyo,
                                        ease:action.ease,
                                        to:{rotation:action.to.rotation}
                                    }))
                                }
                            }else{
                                fuser.transform_frame(action.to)
                            }
                            break
                        }
                    }
                }
            }
        }
      }
    }
    add_animated_sprite(id:string,def?:FrameTransform):Sprite2D{
        const spr=new AnimatedSprite2D()
        this.objects.set(id,spr)
        if(def)spr.transform_frame(def)
        this.add_child(spr)
        return spr
    }
    add_sprite(id:string,def?:FrameTransform):Sprite2D{
        const spr=new Sprite2D()
        this.objects.set(id,spr)
        if(def)spr.transform_frame(def)
        this.add_child(spr)
        return spr
    }
    get_spr(id:string):Sprite2D{
        return this.objects.get(id)!
    }
}

export type Light2D = {
    mat: GLMaterial<GL2D_LightMatArgs,GL2D_LightMatAttr>
    pos: Vec2
    model: Model2D
    destroyed: boolean
}

export class Lights2D extends Container2DObject {
    override object_type = "lights"

    private renderer!: WebglRenderer
    private lightFBO!: WebGLFramebuffer
    private lightTexture!: WebGLTexture
    private lights: Light2D[] = []
    downscale = 1.0
    ambientColor: Color = { r: 1, g: 1, b: 1, a: 1 }

    quality:number=2 // 0 = None, 1=Just Global Light, 2 All Lights

    ambient_light?:GLMaterial<GL2D_LightMatArgs,GL2D_LightMatAttr>
    get ambient() {
        return 1-this.ambientColor.a
    }
    set ambient(v: number) {
        this.ambientColor.a=1-v
    }

    private initFramebuffer(w: number, h: number) {
        const gl = this.renderer.gl;
        if (this.lightTexture) gl.deleteTexture(this.lightTexture);
        if (this.lightFBO) gl.deleteFramebuffer(this.lightFBO);

        this.lightTexture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.lightTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.floor(w), Math.floor(h), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.lightFBO = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightFBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.lightTexture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /*addRadialLight(pos: Vec2, radius: number, intensity = 1.0, color: Color = { r: 1, g: 1, b: 1, a: 1 }) {
        const mat = this.renderer.factorys2D.light.create({ color, radius, intensity});
        const inst: LightInstance = { mat, pos: v2.duplicate(pos), radius, model:model2d.rect(v2.new(-radius,-radius),v2.new(radius,radius)), destroyed: false };
        this.lights.push(inst);
        return inst;
    }*/
    addLight(pos: Vec2, model:Model2D, color: Color = { r: 1, g: 1, b: 1, a: 1 }) {
        const mat = this.renderer.factorys2D.light.create({ color});
        const inst: Light2D = { mat, pos: v2.duplicate(pos), model, destroyed: false };
        this.lights.push(inst);
        return inst;
    }

    private _lastW:number=0
    private _lastH:number=0
    render(renderer: WebglRenderer, camera: Camera2D) {
        this.renderer = renderer;
        const gl = renderer.gl;
        if(this.quality==0){
            if (this.lightTexture) gl.deleteTexture(this.lightTexture);
            if (this.lightFBO) gl.deleteFramebuffer(this.lightFBO);
            return
        }

        const w = Math.max(1, camera.width*camera.meter_size*this.downscale);
        const h = Math.max(1, camera.height*camera.meter_size*this.downscale);

        if (!this.lightFBO || !this.lightTexture || this._lastW !== w || this._lastH !== h) {
            this.initFramebuffer(w, h);
            this._lastW = w;
            this._lastH = h;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightFBO);

        gl.viewport(0, 0, w, h);
        gl.disable(gl.BLEND);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);

        if(!this.ambient_light)this.ambient_light=renderer.factorys2D.light.create({color:this.ambientColor})
        this.ambient_light!.color=this.ambientColor
        renderer.draw(this.ambient_light,camera.projectionMatrix,{
            model:this.screenModel,
            position:camera.visual_position,
            scale:v2.new(1,1)
        })
        if(this.quality>=2){
            for (let i = 0; i < this.lights.length; i++) {
                const L = this.lights[i];
                if (L.destroyed) { this.lights.splice(i, 1); i--; continue; }
                renderer.draw(L.mat,camera.projectionMatrix,{
                    model:L.model,
                    position:L.pos,
                    scale:v2.new(1,1)
                })
            }
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        this.updateScreenModel(v2.new(camera.width,camera.height), camera.meter_size)
        gl.viewport(0, 0, renderer.canvas.width, renderer.canvas.height)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        //this.logLightTextureBase64()
    }

    screenModel:Model2D=model2d.rect()
    private updateScreenModel(pixelSize: Vec2, meterSize: number) {
        const s=v2.scale(pixelSize,meterSize)
        this.screenModel=model2d.rect(v2.scale(s,0),v2.scale(s,1))
    }
    logLightTextureBase64() {
        if (!this.lightTexture || !this.lightFBO) return;
        const gl = this.renderer.gl;

        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightFBO);

        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        const imgData = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const srcIndex = ((h - y - 1) * w + x) * 4;
                const dstIndex = (y * w + x) * 4;
                imgData.data[dstIndex + 0] = pixels[srcIndex + 0];
                imgData.data[dstIndex + 1] = pixels[srcIndex + 1];
                imgData.data[dstIndex + 2] = pixels[srcIndex + 2];
                imgData.data[dstIndex + 3] = pixels[srcIndex + 3];
            }
        }

        ctx.putImageData(imgData, 0, 0);

        const dataURL = canvas.toDataURL("image/png")
        console.log("Light Texture Base64:", dataURL)
    }

    dd(cam:CamA,renderer: Renderer){
        this.draw_super()
        if (!this.lightTexture||this.quality===0){}
        const mat = (renderer as WebglRenderer).factorys2D.texture.create({
            texture: this.lightTexture,
            tint: { r: 1, g: 1, b: 1, a: 1 }
        });
        const gl=(renderer as WebglRenderer).gl
        gl.blendFunc(gl.DST_COLOR, gl.ZERO);
        renderer.draw(mat,cam.matrix,{
            model:this.screenModel,
            position:cam.position,
            scale:v2.new(0.01,0.01)
        })
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    }
    override draw(cam: CamA, renderer: Renderer): Promise<void> {
        return new Promise<void>((resolve) => {
            resolve()
        })
    }
}
export class SubCanvas2D extends Container2DObject {
    override object_type = "sub_canvas";

    private renderer!: WebglRenderer;
    private FBO!: WebGLFramebuffer;
    private Texture!: WebGLTexture;

    container:Container2D=new Container2D()

    downscale = 1.0
    width:number
    height:number
    add_child(c:Container2DObject){
        this.container.add_child(c)
    }

    size?:Vec2

    _zoom:number=1
    constructor(width:number,height:number){
        super()
        this.width=width
        this.height=height
    }
    size_matrix:Matrix=matrix4.identity()
    resize(){
        const scale=this.camera.meter_size*this._zoom

        const scaleX = this.width / (this.camera.meter_size*this._zoom)
        const scaleY = this.height / (this.camera.meter_size*this._zoom)

        this.size_matrix = matrix4.projection(v2.new(scaleX,scaleY),500)

        this.camera.size=v2.new(this.width/scale,this.height/scale)  
    }

    private initFramebuffer(w: number, h: number) {
        const gl = this.renderer.gl;
        this.resize()
        if (this.Texture) gl.deleteTexture(this.Texture);
        if (this.FBO) gl.deleteFramebuffer(this.FBO);

        this.Texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.Texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.floor(w), Math.floor(h), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.FBO = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.Texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    private _lastW:number=0
    private _lastH:number=0

    camera:CamA={
        matrix:matrix4.identity(),
        meter_size:5,
        position:this.position,
        size:v2.new(5,5),
        center_pos:false,
        batcher:undefined
    }
    render(renderer: WebglRenderer, camera: Camera2D,objects?:Container2DObject[]) {
        this.renderer = renderer;
        const gl = renderer.gl;

        const w = Math.max(1, this.width*this.downscale);
        const h = Math.max(1, this.height*this.downscale);

        if (!this.FBO || !this.Texture || this._lastW !== w || this._lastH !== h) {
            this.initFramebuffer(w, h);
            this._lastW = w;
            this._lastH = h;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO);

        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)

        if(this.camera.center_pos){
            const halfViewSize = v2.new(this.camera.size.x / 2, this.camera.size.y / 2)
            const cameraPos = v2.sub(this.camera.position, halfViewSize)
            this.camera.matrix=matrix4.mult(this.size_matrix,matrix4.translation_2d(v2.neg(cameraPos)))
        }else{
            this.camera.matrix=matrix4.mult(this.size_matrix,matrix4.translation_2d(v2.neg(this.camera.position)))
        }
        this.container.draw(this.camera,renderer,objects)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        this.updateScreenModel(v2.new(w,h), camera.meter_size)
        gl.viewport(0, 0, renderer.canvas.width, renderer.canvas.height)
    }

    screenModel:Model2D=model2d.rect()
    hotspot:Vec2=v2.new(0.5,0.5)
    override update(dt: number, resources: ResourcesManager): void {
        super.update(dt,resources)
        this.container.update(dt,resources)
    }
    private updateScreenModel(pixelSize: Vec2, meterSize: number) {
        this.screenModel={
            tex_coords:new Float32Array(DefaultTexCoords),
            vertices:ImageModel2D(this._real_scale,this._real_rotation,this.hotspot,this.size??pixelSize,meterSize)
        }
    }
    toBase64(resources:ResourcesManager):string{
        if (!this.Texture || !this.FBO) return "";
        const gl = this.renderer.gl;

        const w = Math.floor(this.width*this.downscale)
        const h = Math.floor(this.height*this.downscale)

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO)

        const pixels = new Uint8Array(w * h * 4)
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        const canvas=resources.canvas
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!
        const imgData = ctx.createImageData(w, h)
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const srcIndex = ((h - y - 1) * w + x) * 4
                const dstIndex = (y * w + x) * 4
                imgData.data[dstIndex + 0] = pixels[srcIndex + 0]
                imgData.data[dstIndex + 1] = pixels[srcIndex + 1]
                imgData.data[dstIndex + 2] = pixels[srcIndex + 2]
                imgData.data[dstIndex + 3] = pixels[srcIndex + 3]
            }
        }

        ctx.putImageData(imgData, 0, 0);

        const dataURL = canvas.toDataURL("image/png")
        return dataURL
    }

    override draw(cam:CamA,renderer: WebglRenderer) {
        return new Promise<void>((resolve) => {
            this.draw_super()
            if (!this.Texture) {resolve();return;}
            const mat = renderer.factorys2D.texture.create({
                texture: this.Texture,
                tint: { r: 1, g: 1, b: 1, a: 1 }
            });
            
            renderer.draw(mat,cam.matrix,{
                model:this.screenModel,
                position:this._real_position,
                scale:v2.new(1,-1)
            })
            resolve()
        })
    }
}
export class Camera2D{
    renderer:Renderer
    container:Container2D=new Container2D()
    private _zoom = 1;
    projectionMatrix!: Matrix;
    SubMatrix!: Matrix;
    get zoom(): number { return this._zoom; }
    set zoom(zoom: number) {
        this._zoom = zoom
        this.resize()
    }

    width = 1;
    height = 1;
    meter_size: number = 100

    position = v2.new(0, 0)
    visual_position=v2.new(0,0)

    center_pos:boolean=true
    batcher:Batcher

    after_draw:((cam:CamA,renderer:Renderer)=>void)[]=[]
    constructor(renderer:Renderer){
        this.renderer=renderer
        this.zoom=1
        this.container.object_group=true
        this.batcher=new Batcher(renderer)
    }

    addObject(...objects: Container2DObject[]): void {
        for(const o of objects){
            this.container.add_child(o);
        }
        this.container.updateZIndex()
        this.container.update_real()
    }

    resize(): void {
        const scale=this.meter_size*this._zoom

        const scaleX = this.renderer.canvas.width / (this.meter_size*this.zoom)
        const scaleY = this.renderer.canvas.height / (this.meter_size*this.zoom)
        this.SubMatrix = matrix4.projection(v2.new(scaleX,scaleY),500)

        this.width = this.renderer.canvas.width/scale;
        this.height = this.renderer.canvas.height/scale;
    }

    update(dt:number,resources:ResourcesManager): void {
        this.projectionMatrix=this.SubMatrix
        if(this.center_pos){
            const halfViewSize = v2.new(this.width / 2, this.height / 2);
            const cameraPos = v2.sub(this.position, halfViewSize);

            this.visual_position=cameraPos
            this.projectionMatrix=this.SubMatrix

            this.projectionMatrix = matrix4.mult(this.SubMatrix,matrix4.translation_2d(v2.neg(cameraPos)))
        }else{
            this.visual_position=this.position
            this.projectionMatrix=this.SubMatrix

            this.projectionMatrix = matrix4.mult(this.SubMatrix,matrix4.translation_2d(v2.neg(this.position)))
        }
        this.container.update(dt,resources)
    }

    async draw(dt:number,resources:ResourcesManager,renderer:Renderer){
        this.update(dt,resources)
        const cam={
            matrix:this.projectionMatrix,
            position:this.visual_position,
            meter_size:this.meter_size,
            size:v2.new(this.width,this.height),
            center_pos:this.center_pos,
            batcher:this.batcher
        }
        await this.container.draw(cam,renderer)
        this.batcher.render(this.projectionMatrix)
        for(const a of this.after_draw){
            a(cam,renderer)
        }
    }
}