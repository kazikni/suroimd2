import { ABParticle2D, type Camera2D, type Renderer } from "../engine/mod.ts";
import { Hitbox2D, NetStream, Numeric, random, Vec2 } from "common/scripts/engine/mod.ts";
import { Sound } from "../engine/resources.ts";
import { Angle, Orientation, v2 } from "common/scripts/engine/geometry.ts";
import { GameObject } from "../others/gameObject.ts";
import { BuildingDef, Buildings } from "common/scripts/definitions/objects/buildings_base.ts";
import { Container2DObject, Sprite2D } from "../engine/container_2d.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { ColorM } from "../engine/renderer.ts";
import { GraphicsDConfig } from "../others/config.ts";
export class Building extends GameObject{
    stringType:string="building"
    numberType: number=11
    def!:BuildingDef

    side:Orientation=0

    objects:Container2DObject[]=[]

    ceilings:{
        collided:boolean
        opacity:number
        hitbox:Hitbox2D
        container:Container2DObject
    }[]=[]
    assets={
        particle:"",
        particle_tint:ColorM.number(0xffffff),
        sounds:{
            hit:undefined as (Sound|undefined)
        }
    }
    _add_own_particle(position:Vec2,force:number=1,small:boolean=false){
        const p=new ABParticle2D({
            frame:{
                image:this.def.assets?.particles_variation?`${this.assets.particle}_${random.int(1,this.def.assets?.particles_variation)}`:this.assets.particle
            },
            position,
            speed:random.float(1,2)*force,
            angle:random.rad(),
            direction:random.rad(),
            life_time:random.float(1,2),
            zIndex:zIndexes.Particles,
            scale:small?random.float(0.2,0.5):random.float(0.5,1),
            tint:this.assets.particle_tint,
            to:{
                speed:random.float(0.1,1),
                angle:random.rad(),
            }
        })
        this.game.particles.add_particle(p)
    }

    // deno-lint-ignore no-explicit-any
    create(_args: Record<string,any>): void {
        this.updatable=false
    }

    sounds?:{
        hit?:Sound[]
    }
    override on_destroy(): void {
        for(const o of this.objects){
            o.destroy()
        }
    }
    update(dt:number): void {
        for(const c of this.ceilings){
            if(!c.collided){
                c.container.tint.a=Numeric.lerp(c.container.tint.a,1,1/(1+dt*1000))
            }
            c.collided=false
        }
    }
    override render(camera: Camera2D, renderer: Renderer, _dt: number): void {
        
    }
    constructor(){
        super()
    }
    on_hitted(position:Vec2){
        if(this.game.save.get_variable("cv_graphics_particles")>=GraphicsDConfig.Normal&&this.assets.particle)this._add_own_particle(position,undefined,true)
        if(this.sounds&&this.sounds.hit&&this.sounds.hit.length>0){
            this.game.sounds.play(this.sounds.hit[random.int(0,this.sounds.hit.length)],{
                volume:1,
                position:this.position,
                max_distance:40,
            },"obstacles")
        }
    }
    set_definition(def:BuildingDef){
        if(this.def)return
        if(def.hitbox)this.base_hitbox=def.hitbox
        this.def=def
        const rot=Angle.side_rad(this.side)
        for(const f of def.floor_image??[]){
            const sprite=new Sprite2D()
            sprite.set_frame({
                image:f.image,
                position:f.position?v2.add(this.position,f.position):undefined,
                hotspot:f.hotspot,
                rotation:rot+(f.rotation??0),
                scale:f.scale,
                zIndex:f.zIndex??zIndexes.BuildingsFloor,
                tint:f.tint
            },this.game.resources)
            this.game.camera.addObject(sprite)
            this.objects.push(sprite)
        }
        for(const c of def.ceiling??[]){
            const sprite=new Sprite2D()
            sprite.set_frame({
                image:c.frame.image,
                position:c.frame.position?v2.add(this.position,c.frame.position):undefined,
                hotspot:c.frame.hotspot,
                rotation:rot+(c.frame.rotation??0),
                scale:c.frame.scale,
                zIndex:c.frame.zIndex??zIndexes.BuildingsCeiling,
                tint:c.frame.tint
            },this.game.resources)
            this.game.camera.addObject(sprite)
            this.objects.push(sprite)

            this.ceilings.push({
                container:sprite,
                hitbox:c.hitbox.transform(this.position),
                opacity:c.visible_opacity??0.5,
                collided:false
            })
        }
        if(def.assets){
            if(def.assets.particles){
                this.assets.particle=def.assets.particles
            }
            if(def.assets.particles_tint){
                this.assets.particle_tint=ColorM.number(def.assets.particles_tint)
            }
        }
        this.manager.cells.updateObject(this)
    }
    scale=0
    override decode(stream: NetStream, full: boolean): void {
        if(full){
            this.position=stream.readPosition()
            this.side=stream.readUint8() as Orientation
            this.set_definition(Buildings.getFromNumber(stream.readID()))
            this.manager.cells.updateObject(this)
        }
    }
}