import { Sprite2D } from "../engine/mod.ts";
import { v2 } from "common/scripts/engine/geometry.ts";
import { Sound } from "../engine/resources.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
export class Decal extends GameObject{
    stringType:string="decal"
    numberType: number=7

    sprite:Sprite2D=new Sprite2D()

    lifetime:number=30

    // deno-lint-ignore no-explicit-any
    create(_args: any) {
        this.game.camera.addObject(this.sprite)
    }

    sounds?:{
        break?:Sound
        hit?:Sound[]
    }

    override on_destroy(): void {
        this.sprite.destroy()
    }
    dying:boolean=false
    can_die:boolean=true
    update(dt:number): void {
        this.lifetime-=dt
        if(this.lifetime<=0){
            this.destroy()
        }
    }
    constructor(){
        super()
        this.sprite=new Sprite2D()
        this.sprite.hotspot=v2.new(0.5,0.5)
        this.sprite.zIndex=zIndexes.Decals
    }
}