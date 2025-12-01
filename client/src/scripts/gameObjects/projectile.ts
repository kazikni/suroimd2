import { ProjectileDef, Projectiles } from "common/scripts/definitions/objects/projectiles.ts"
import { CircleHitbox2D, NetStream, v2 } from "common/scripts/engine/mod.ts"
import { GameObject } from "../others/gameObject.ts"
import { Sprite2D } from "../engine/container_2d.ts"
export class Projectile extends GameObject{
    stringType:string="projectile"
    numberType: number=6

    rotation:number=0
    zpos:number=0

    sprite:Sprite2D=new Sprite2D

    def!:ProjectileDef

    create(_args: Record<string, void>): void {
        this.game.camera.addObject(this.sprite)
    }
    override on_destroy(): void {
        this.sprite.destroy()
    }

    update(_dt:number): void {
        this.sprite.position=this.position
        this.sprite.rotation=this.rotation
        const s=(this.def.zBaseScale+(this.def.zScaleAdd*this.zpos))*2
        this.sprite.scale=v2.new(s,s)
    }
    constructor(){
        super()
    }
    set_definition(def:ProjectileDef){
        if(this.def)return
        this.def=def
        this.hb=new CircleHitbox2D(this.position,this.def.radius)
        this.sprite.set_frame({
            image:this.def.frames.world,
            hotspot:v2.new(.5,.5),
            scale:1
        },this.game.resources)
    }
    override decode(stream: NetStream, full: boolean): void {
        this.position=stream.readPosition()
        this.rotation=stream.readRad()
        this.zpos=stream.readFloat(0,1,1)
        if(full){
            this.set_definition(Projectiles.getFromNumber(stream.readID()))
        }
    }
}