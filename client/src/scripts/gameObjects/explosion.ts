import { CircleHitbox2D, NetStream, v2 } from "common/scripts/engine/mod.ts";
import { ExplosionDef, Explosions } from "common/scripts/definitions/objects/explosions.ts";
import { ColorM } from "../engine/renderer.ts";
import { GameObject } from "../others/gameObject.ts";
import { Sprite2D } from "../engine/container_2d.ts";
export class Explosion extends GameObject{
    stringType:string="explosion"
    numberType: number=5
    def!:ExplosionDef
    maxRadius:number=3

    declare hb:CircleHitbox2D

    sprite:Sprite2D=new Sprite2D()
    t:number=0
    create(_args: Record<string, void>): void {
        this.hb=new CircleHitbox2D(this.position,0)
        this.sprite.frame=this.game.resources.get_sprite("base_explosion")
        this.game.camera.addObject(this.sprite)
    }
    update(dt:number): void {
        if(this.def){
            this.sprite.tint.a=1-this.t
            this.t+=3*dt;
            (this.hb as CircleHitbox2D).radius=this.maxRadius*this.t
            this.sprite.scale=v2.new((this.hb as CircleHitbox2D).radius,(this.hb as CircleHitbox2D).radius)
            if(this.t>=1){
                this.destroy()
            }
        }
    }
    override on_destroy(): void {
      this.sprite.destroy()
    }
    constructor(){
        super()
        this.sprite.visible=false
        this.sprite.hotspot=v2.new(.5,.5)
        this.sprite.size=v2.new(300,300)
    }
    set_definition(def:ExplosionDef){
        if(this.def)return
        this.def=def

        this.def=def
        this.sprite.tint=ColorM.hex(this.def.tint)
        if(this.def.sounds)this.game.sounds.play(this.game.resources.get_audio(this.def.sounds.normal),{

        },"explosions")
    }
    override decode(stream: NetStream, _full: boolean): void {
        this.position=stream.readPosition()
        this.maxRadius=stream.readFloat(0,20,3)
        this.set_definition(Explosions.getFromNumber(stream.readID()))
        this.hb=new CircleHitbox2D(this.position,this.maxRadius)
        this.sprite.position=this.position
        this.sprite.visible=true

    }
}