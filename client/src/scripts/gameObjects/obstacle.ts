import { type Camera2D, ColorM, Container2D, type Renderer, Sprite2D } from "../engine/mod.ts";
import { Materials, ObstacleBehaviorDoor, ObstacleDef, ObstacleDoorStatus, Obstacles } from "common/scripts/definitions/objects/obstacles.ts";
import { random } from "common/scripts/engine/random.ts";
import { NetStream, ParticlesEmitter2D, RectHitbox2D, Vec2 } from "common/scripts/engine/mod.ts";
import { Sound } from "../engine/resources.ts";
import { Orientation, v2 } from "common/scripts/engine/geometry.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { Debug, GraphicsDConfig } from "../others/config.ts";
import { GameObject } from "../others/gameObject.ts";
import { model2d } from "common/scripts/engine/models.ts";
import { ABParticle2D, ClientParticle2D } from "../engine/particles.ts";
import { Color } from "../engine/renderer.ts";
export function GetObstacleBaseFrame(def:ObstacleDef,variation:number,skin:number):string{
    let spr=(def.frame&&def.frame.base)?def.frame.base:def.idString
    if(skin>0&&def.biome_skins){
        spr+=`_${def.biome_skins[skin-1]}`
    }
    if(def.variations){
        spr+=`_${variation}`
    }
    return spr
}
export class Obstacle extends GameObject{
    stringType:string="obstacle"
    numberType: number=4
    name:string=""
    def!:ObstacleDef

    container:Container2D=new Container2D()
    m_position:Vec2=v2.new(0,0)
    rotation:number=0
    side:Orientation=0
    sprite=new Sprite2D
    variation=0
    skin=0
    health=1

    dead:boolean=true

    frame={
        particle:"",
        dead:"",
        base:""
    }

    door_status?:ObstacleDoorStatus

    doors_hitboxes?:Record<-1|0|1,RectHitbox2D>

    emitter_1?:ParticlesEmitter2D<ClientParticle2D>
    // deno-lint-ignore no-explicit-any
    create(_args: Record<string,any>): void {
        this.game.camera.addObject(this.container)
        this.updatable=false
    }

    sounds?:{
        break?:Sound
        hit?:Sound[]
    }
    override on_destroy(): void {
        this.container.destroy()
        if(this.emitter_1)this.emitter_1.destroyed=true
    }
    update_frame(){
        if(this.def.frame_transform)this.sprite.transform_frame(this.def.frame_transform)
        if(this.dead){
            this.sprite.frame=this.game.resources.get_sprite(this.frame.dead)
            this.container.zIndex=zIndexes.DeadObstacles
            if(this.emitter_1)this.emitter_1.destroyed=true
        }else{
            this.sprite.frame=this.game.resources.get_sprite(this.frame.base)
            this.container.zIndex=this.def.zIndex??zIndexes.Obstacles1
            //if(this.be)
        }
        this.container.visible=true
    }
    die(){
        if(this.dead)return
        this.dead=true
        this.update_frame()
        const ac=random.int(8,13)
        if(this.emitter_1)this.emitter_1.enabled=false
        if(this.game.save.get_variable("cv_graphics_particles")>=GraphicsDConfig.Normal){
            for(let i=0;i<ac;i++){
                this._add_own_particle(this.hb.randomPoint(),2)
            }
        }
        if(this.sounds&&this.sounds.break){
            this.game.sounds.play(this.sounds.break,{
                position:this.position,
                max_distance:30
            })
        }
    }
    particle_tint?:Color
    _add_own_particle(position:Vec2,force:number=1,small:boolean=false){
        const p=new ABParticle2D({
            frame:{
                image:this.def.particles?.variations?`${this.frame.particle}_${random.int(1,this.def.particles.variations)}`:this.frame.particle
            },
            position,
            speed:random.float(1,2)*force,
            angle:random.rad(),
            direction:random.rad(),
            life_time:random.float(1,2),
            zIndex:zIndexes.Particles,
            scale:small?random.float(0.2,0.5):random.float(0.5,1),
            tint:this.particle_tint,
            to:{
                speed:random.float(0.1,1),
                angle:random.rad(),
            }
        })
        this.game.particles.add_particle(p)
    }
    update(_dt:number): void {
        
    }
    on_hitted(position:Vec2){
        if(this.game.save.get_variable("cv_graphics_particles")>=GraphicsDConfig.Normal)this._add_own_particle(position,undefined,true)
        if(this.sounds&&this.sounds.hit&&this.sounds.hit.length>0){
            this.game.sounds.play(this.sounds.hit[random.int(0,this.sounds.hit.length)],{
                volume:1,
                position:this.position,
                max_distance:40,
            },"obstacles")
        }
    }
    override render(camera: Camera2D, renderer: Renderer, _dt: number): void {
        
    }
    update_door(door_status:ObstacleDoorStatus){
        this.door_status=door_status
        if(this.is_new){
            if(door_status.open===0){
                this.container.rotation=this.rotation
            }else if(door_status.open===-1){
                this.container.rotation=this.rotation-(3.141592/2)
            }else if(door_status.open===1){
                this.container.rotation=this.rotation+(3.141592/2)
            }
        }else{
            const dd=this.def.expanded_behavior as ObstacleBehaviorDoor
            const f=()=>{
                if(door_status.open===1){
                    this.game.addTween({
                        target:this.container,
                        duration:(this.def.expanded_behavior as ObstacleBehaviorDoor).open_duration,
                        to:{rotation:this.rotation+(3.141592/2)},
                    })
                    this.hb=this.doors_hitboxes![1].transform(this.container.position,this.scale,0)
                }else if(door_status.open===0){
                    this.game.addTween({
                        target:this.container,
                        duration:(this.def.expanded_behavior as ObstacleBehaviorDoor).open_duration,
                        to:{rotation:this.rotation},
                    })
                    this.hb=this.doors_hitboxes![0].transform(this.container.position,this.scale,0)
                }
                
            }
            if(dd.open_delay){
                this.game.addTimeout(f,dd.open_delay)
            }else{
                f()
            }
        }
    }
    constructor(){
        super()
        this.container.visible=false
        this.container.add_child(this.sprite)
        this.sprite.hotspot=v2.new(.5,.5)
    }
    set_definition(def:ObstacleDef){
        if(this.def)return
        this.def=def
        if(this.def.sounds){
            this.sounds={
                break:this.game.resources.get_audio(this.def.sounds.break),
                hit:[]
            }
            if(this.def.sounds.hit_variations){
                for(let i=1;i<=this.def.sounds.hit_variations;i++){
                    this.sounds.hit!.push(this.game.resources.get_audio(this.def.sounds.hit+`_${i}`))
                }
            }else{
                this.game.resources.get_audio(this.def.sounds.hit)
            }
        }else if(this.def.material){
            const mat=Materials[this.def.material]
            this.sounds={
                break:this.game.resources.get_audio(mat.sounds+"_break"),
                hit:[]
            }
            if(mat.hit_variations){
                for(let i=1;i<=mat.hit_variations;i++){
                    this.sounds.hit!.push(this.game.resources.get_audio(mat.sounds+`_hit_${i}`))
                }
            }else{
                this.game.resources.get_audio(mat.sounds+"_hit")
            }
        }
        this.frame.base=GetObstacleBaseFrame(this.def,this.variation,this.skin)
        this.frame.particle=(this.def.frame?.particle)??this.def.idString+"_particle"
        this.frame.dead=(this.def.frame&&this.def.frame.dead)?this.def.frame.dead:this.def.idString+"_dead"

        if(this.def.particles){
            if(this.def.particles.tint)this.particle_tint=ColorM.number(this.def.particles.tint)
        }

        if(this.def.onDestroyExplosion&&this.game.save.get_variable("cv_graphics_particles")>=GraphicsDConfig.Advanced){
            if(!this.emitter_1){
                this.emitter_1=this.game.particles.add_emiter({
                    delay:0.5,
                    particle:()=>new ABParticle2D({
                        frame:{
                            image:"gas_smoke_particle"
                        },
                        position:this.position,
                        speed:random.float(0.5,0.7),
                        angle:0,
                        direction:random.float(-1.45,-1.65),
                        life_time:random.float(4,6),
                        zIndex:zIndexes.Particles,
                        scale:0,
                        tint:ColorM.hex("#fff5"),
                        to:{scale:random.float(0.7,1.2),tint:ColorM.hex("#fff0")}
                    }),
                    enabled:this.health<=0.4,
                })
            }
        }
        if(this.def.expanded_behavior&&this.def.hitbox){
            switch(this.def.expanded_behavior.type){
                case 0:
                    //this.doors_hitboxes=CalculateDoorHitbox(this.def.hitbox!.to_rect(),this.side,this.def.expanded_behavior as ObstacleBehaviorDoor)
            }
        }
    }
    scale=0
    override decode(stream: NetStream, full: boolean): void {
        const [dead,door]=stream.readBooleanGroup()
        this.scale=stream.readFloat(0,3,3)
        this.container.scale.x=this.scale
        this.container.scale.y=this.scale
        this.health=stream.readFloat(0,1,1)
        if(door){
            this.door_status={
                locked:stream.readBooleanGroup()[0],
                open:stream.readInt8() as -1|0|1
            }
        }
        if(full){
            this.rotation=stream.readRad()
            this.container.rotation=this.rotation
            this.side=stream.readUint8() as Orientation
            this.variation=stream.readUint8()
            this.m_position=stream.readPosition()
            this.skin=stream.readUint8()
            this.set_definition(Obstacles.getFromNumber(stream.readUint16()))
        }
        if(dead){
            if(this.emitter_1)this.emitter_1.enabled=false
            this.die()
        }else if(this.dead){
            this.dead=false
        }else{
            if(this.emitter_1&&this.health<=0.4){
                this.emitter_1.enabled=true
            }
            if(door){
                this.update_door(this.door_status!)
            }
        }
        if(!this.container.visible){
            this.update_frame()
        }
        if(this.def.hitbox){
            this.hb=this.def.hitbox.transform(this.m_position,this.scale,0)
            this.container.position=this.position
            this.manager.cells.updateObject(this)
        }
    }
}