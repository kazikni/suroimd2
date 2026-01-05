import { ABParticle2D, Camera2D, Container2D, Sprite2D } from "../engine/mod.ts";
import { BaseGameObject2D, CircleHitbox2D, NetStream, Vec2, random, v2, v2m } from "common/scripts/engine/mod.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { Obstacle } from "./obstacle.ts";
import { type Player } from "./player.ts";
import { ColorM, Renderer } from "../engine/renderer.ts";
import { GameObject } from "../others/gameObject.ts";
import { Creature } from "./creature.ts";
import { Building } from "./building.ts";
import { CenterHotspot } from "../engine/utils.ts";
const images=[
    "bullet_normal",
    "bullet_rocket"
]
const particles=[
    "gas_smoke_particle"
]
const SubSteps=3
export class Bullet extends GameObject{
    stringType:string="bullet"
    numberType: number=3
    name:string=""
    velocity:Vec2=v2.new(0,0)
    speed:number=0

    initialPosition!:Vec2
    maxDistance:number=1

    reflection_count:number=0

    old_position:Vec2=v2.new(0,0)

    sendDelete: boolean=true;
    sprite_trail:Sprite2D=new Sprite2D()
    sprite_projectile?:Sprite2D=new Sprite2D()
    container:Container2D=new Container2D()

    create(_args: Record<string, void>) {
        this.sprite_trail.frame=this.game.resources.get_sprite("base_trail")
        this.game.camera.addObject(this.container)
    }
    override on_destroy(): void {
      this.container.destroy()
    }

    maxLength:number=0.3

    dying:boolean=false

    particles=0
    par_time=0

    critical:boolean=false

    private tticks:number=0
    update(dt:number): void {
        if(this.dying||v2.distance(this.initialPosition,this.position)>this.maxDistance){
            this.dying=true
            this.tticks-=dt
            this.sprite_projectile?.destroy()
            if(this.tticks<=0){
                this.destroy()
            }
        }else{
            if(this.sprite_trail.scale.x<this.maxLength)this.tticks+=dt
            const dst=v2.scale(this.velocity,dt/SubSteps)
            this.old_position=v2.duplicate(this.position)

            for(let s=0;s<SubSteps;s++){
                v2m.add(this.hb.position,this.hb.position,dst)
                this.manager.cells.updateObject(this)

                const objs=this.manager.cells.get_objects(this.hb,this.layer)
                for(const obj of objs){
                    if(this.dying)break
                    switch((obj as BaseGameObject2D).stringType){
                        case "player":
                            if((obj as Player).hb&&!(obj as Player).dead&&(this.hb.collidingWith(obj.hb)/*||obj.hb.colliding_with_line(this.old_position,this.position)*/)&&!(obj as Player).parachute){
                                (obj as Player).on_hitted(this.position,this.critical)
                                this.dying=true
                                s=SubSteps
                            }
                            break
                        case "creature":
                            if((obj as Creature).hb&&!(obj as Creature).dead&&(this.hb.collidingWith(obj.hb)/*||obj.hb.colliding_with_line(this.old_position,this.position)*/)){
                                this.dying=true
                                s=SubSteps
                            }
                            break
                        case "obstacle":
                            if((obj as Obstacle).def.no_bullet_collision||(obj as Obstacle).dead)break
                            if(obj.hb&&(this.hb.collidingWith(obj.hb)/*||obj.hb.colliding_with_line(this.old_position,this.position)*/)){
                                (obj as Obstacle).on_hitted(this.position)
                                this.dying=true
                                s=SubSteps
                            }
                            break
                        case "building":
                            if((obj as Building).def.no_bullet_collision)break
                            if(obj.hb&&(this.hb.collidingWith(obj.hb)/*||obj.hb.colliding_with_line(this.old_position,this.position)*/)){
                                (obj as Building).on_hitted(this.position)
                                this.dying=true
                                s=SubSteps
                            }
                            break
                    }
                }
            }

            if(this.particles>0){
                this.par_time-=dt
                if(this.par_time<=0){
                    const p=new ABParticle2D({
                        direction:random.rad(),
                        life_time:0.9,
                        position:this.position,
                        frame:{
                            image:particles[this.particles-1],
                            hotspot:CenterHotspot
                        },
                        speed:random.float(0.5,1.2),
                        angle:0,
                        scale:0.1,
                        tint:ColorM.hex("#fff5"),
                        to:{
                            tint:ColorM.hex("#fff0"),
                            scale:1
                        }
                    })
                    this.game.particles.add_particle(p)
                    this.par_time=0.01
                }
            }
            this.container.position=this.position
        }

        const traveledDistance = v2.distance(this.initialPosition, this.position)

        this.sprite_trail.scale.x=Math.min(
            Math.min(
                this.speed * this.tticks,
                traveledDistance
            ),
            this.maxLength
        );
    }
    constructor(){
        super()
        this.sprite_trail.size=v2.new(200,10)
        this.sprite_trail.hotspot=v2.new(1,.5)
        this.sprite_trail.zIndex=1
        this.sprite_trail.position.x=0
        this.sprite_trail.position.y=0
        this.container.visible=false
        this.container.add_child(this.sprite_trail)
        this.container.updateZIndex()
        this.container.zIndex=zIndexes.Bullets
    }
    override render(_camera: Camera2D, _renderer: Renderer, _dt: number): void {
    
    }
    override decode(stream: NetStream, full: boolean): void {
        this.position=stream.readPosition()
        this.old_position=v2.duplicate(this.position)
        this.tticks=stream.readFloat(0,60,2)
        if(full){
            this.initialPosition=stream.readPosition()
            this.maxDistance=stream.readFloat32()
            this.hb=new CircleHitbox2D(this.position,stream.readFloat(0,2,2))
            this.speed=stream.readFloat32()
            this.container.rotation=stream.readRad()
            this.reflection_count=stream.readUint8()

            this.velocity=v2.from_RadAngle(this.container.rotation)
            v2m.scale(this.velocity,this.velocity,this.speed)

            this.maxLength=stream.readFloat(0,100,3)
            this.sprite_trail.scale!.y=stream.readFloat(0,6,2)
            const col=ColorM.number(stream.readUint32())
            col.a/=this.reflection_count+1
            this.sprite_trail.tint=col

            const proj=stream.readUint8()
            if(proj>0){
                this.sprite_projectile=new Sprite2D()
                this.sprite_projectile.hotspot=CenterHotspot
                this.sprite_projectile.zIndex=2
                this.sprite_projectile.position.x=0
                this.sprite_projectile.position.y=0
                this.sprite_projectile.scale.x=stream.readFloat(0,6,2)
                this.sprite_projectile.scale.y=stream.readFloat(0,6,2)

                this.sprite_projectile.tint=ColorM.number(stream.readUint32())
                this.sprite_projectile.frame=this.game.resources.get_sprite(images[proj-1])

                this.container.add_child(this.sprite_projectile)
            }
            this.particles=stream.readUint8()
            this.container.visible=true
            this.critical=stream.readBooleanGroup()[0]
        }
    }
}