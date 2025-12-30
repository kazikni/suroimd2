import { Particle2D } from "common/scripts/engine/particles.ts";
import { Sprite2D } from "./container_2d.ts";
import { type ClientGame2D } from "./game.ts";
import { type FrameDef } from "common/scripts/engine/definitions.ts";
import { v2, v2m, Vec2 } from "common/scripts/engine/geometry.ts";
import { Color, ColorM } from "./renderer.ts";
import { Numeric } from "common/scripts/engine/utils.ts";
import { CenterHotspot } from "./utils.ts";

export abstract class ClientParticle2D extends Particle2D{
    constructor(){
        super()
    }
    override on_create(): void {
    }
    override on_destroy(): void {
    }
}
export interface ABParticle2Config{
    frame:FrameDef
    position:Vec2
    speed:number
    direction:number
    life_time:number
    zIndex?:number
    angle?:number
    scale?:number
    tint?:Color
    to?:{
        position?:Vec2
        speed?:number
        direction?:number
        angle?:number
        scale?:number
        tint?:Color
    }
}
export interface RainParticle2Config{
    frame:{
        main:FrameDef
        wave:FrameDef
    }
    scale?:{
        main:number
    }
    lifetime?:number
    zindex?:{
        main:number
        wave:number
    }
    position:Vec2
    rotation:number
    speed?:number
}
export class ABParticle2D extends ClientParticle2D{
    ticks=0
    config:ABParticle2Config
    sprite:Sprite2D=new Sprite2D()

    constructor(config:ABParticle2Config){
        super()
        this.config=config
        this.sprite.position=config.position
        this.position=this.sprite._position
        
        this.sprite.scale=v2.new(config.scale??1,config.scale??1)
        this.sprite.rotation=config.angle??0
        this.sprite.zIndex=config.zIndex??0
        if(config.tint){
            this.sprite.tint=ColorM.clone(config.tint)
        }
    }
    override update(dt: number): void {
        this.ticks+=dt
        if(this.ticks>=this.config.life_time){
            this.destroyed=true
        }

        const tt=this.ticks/this.config.life_time
        let speed=this.config.speed
        if(this.config.to?.speed){
            speed=Numeric.lerp(this.config.speed,this.config.to.speed,tt)
        }
        if(this.config.to?.angle){
            this.sprite._rotation=Numeric.lerp(this.config.angle??0,this.config.to.angle,tt)
        }
        let dire=this.config.direction
        if(this.config.to?.direction){
            dire=Numeric.lerp(this.config.direction,this.config.to.direction,tt)
        }
        if(this.config.to?.scale){
            this.scale=Numeric.lerp(this.config.scale??1,this.config.to.scale,tt)
            this.sprite._scale._x=this.scale
            this.sprite._scale._y=this.scale
        }
        if(this.config.to?.tint){
            this.sprite.tint=ColorM.lerp(this.config.tint??ColorM.default.white,this.config.to.tint,tt)
        }
        const vel=v2.from_RadAngle(dire)
        v2m.scale(vel,vel,speed*dt)
        
        this.sprite._position._x+=vel.x
        this.sprite.position.y+=vel.y

    }
    override on_create(): void {
        super.on_create()
        this.sprite.set_frame(this.config.frame,(this.manager.game as unknown as ClientGame2D).resources);
        (this.manager.game as unknown as ClientGame2D).camera.addObject(this.sprite)
    }
    override on_destroy(): void {
        this.sprite.destroy()
    }
}
export class RainParticle2D extends ClientParticle2D{
    ticks=0
    stage=0

    config:RainParticle2Config
    sprite:Sprite2D=new Sprite2D()
    lifetime:number

    constructor(config:RainParticle2Config){
        super()
        this.config=config
        this.sprite.position=config.position
        this.position=this.sprite._position
        v2m.single(this.sprite.scale,config.scale?.main??1)
        this.sprite.rotation=config.rotation
        this.sprite.hotspot=v2.new(1,.5)
        this.vel=v2.scale(v2.from_RadAngle(config.rotation),config.speed??12)
        if(config.zindex){
            this.sprite.zIndex=config.zindex.main
        }
        this.lifetime=config.lifetime??1
        this.sprite.tint={r:1,b:1,g:1,a:0}
    }
    vel:Vec2=v2.new(0,0)
    override update(dt: number): void {
        switch(this.stage){
            case 0:{
                if(this.ticks>=this.lifetime){
                    this.ticks=0
                    this.stage=1
                    this.sprite.set_frame(this.config.frame.wave,(this.manager.game as unknown as ClientGame2D).resources)
                    v2m.zero(this.sprite.scale)
                    this.sprite.hotspot=CenterHotspot
                    if(this.config.zindex){
                        this.sprite.zIndex=this.config.zindex.wave
                    }
                }
                v2m.add_component(this.sprite.position,this.vel.x*dt,this.vel.y*dt)
                this.ticks+=dt
                this.sprite.tint.a=Numeric.clamp(this.ticks*3,0,1)
                break
            }
            case 1:{
                if(this.ticks>=1){
                    this.destroyed=true
                }
                this.ticks+=2*dt
                this.sprite.tint.a=1-this.ticks
                this.sprite.scale=v2.add(this.sprite.scale,v2.new(6*dt,6*dt))
                break
            }
        }

    }
    override on_create(): void {
        super.on_create()
        this.sprite.set_frame(this.config.frame.main,(this.manager.game as unknown as ClientGame2D).resources);
        (this.manager.game as unknown as ClientGame2D).camera.addObject(this.sprite)
        this.sprite.visible=true
    }
    override on_destroy(): void {
        this.sprite.destroy()
    }
}