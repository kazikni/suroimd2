import { ABParticle2D, type Camera2D, type Renderer } from "../engine/mod.ts";
import { NetStream, random, Vec2 } from "common/scripts/engine/mod.ts";
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

    m_position:Vec2=v2.new(0,0)
    side:Orientation=0

    objects:Container2DObject[]=[]
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
    update(_dt:number): void {
        
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
        this.def=def
        const rot=Angle.side_rad(this.side)
        for(const f of def.floor_image??[]){
            const sprite=new Sprite2D()
            sprite.set_frame({
                image:f.image,
                position:v2.add_with_orientation(this.m_position,f.position,this.side),
                hotspot:f.hotspot,
                rotation:rot+(f.rotation??0),
                scale:f.scale,
                zIndex:f.zIndex??zIndexes.BuildingsFloor,
            },this.game.resources)
            if(f.tint!==undefined)sprite.tint=ColorM.number(f.tint)
            this.game.camera.addObject(sprite)
            this.objects.push(sprite)
        }
        if(def.hitbox){
            this.hb=def.hitbox.transform(this.m_position,undefined,this.side)
        }else{
            this.hb.translate(this.m_position)
        }

        if(def.assets){
            if(def.assets.particles){
                this.assets.particle=def.assets.particles
            }
            if(def.assets.particles_tint){
                this.assets.particle_tint=ColorM.number(def.assets.particles_tint)
            }
        }
    }
    scale=0
    override decode(stream: NetStream, full: boolean): void {
        if(full){
            this.m_position=stream.readPosition()
            this.side=stream.readUint8() as Orientation
            this.set_definition(Buildings.getFromNumber(stream.readID()))
            this.manager.cells.updateObject(this)
        }
    }
}