import { Sprite2D } from "../engine/mod.ts";
import { v2 } from "common/scripts/engine/geometry.ts";
import { Sound } from "../engine/resources.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { random } from "common/scripts/engine/random.ts";
import { DamageSplash } from "common/scripts/packets/update_packet.ts";
import { type Player } from "./player.ts";
import { ease } from "common/scripts/engine/mod.ts";
import { GameObject } from "../others/gameObject.ts";
export class DamageSplashOBJ extends GameObject{
    stringType:string="damage_splash"
    numberType: number=8

    sprite:Sprite2D

    async create(args: DamageSplash): Promise<void> {
        const color = args.shield
            ? (args.critical ? "#114e" : "#0f9e")
            : (args.critical ? "#ff0e" : "#fffe")

        
        const player = this.manager.get_object(args.taker,args.taker_layer) as Player|undefined
        if(player&&args.shield_break){
            player.broke_shield()
        }

        this.sprite.frame = await this.game.resources.render_text(`${args.count}`, 50, color)
        this.position = v2.duplicate(args.position)
        this.lifetime += Math.random()
        this.sprite.position = this.position
        this.sprite.scale.x = 0
        this.sprite.scale.y = 0

        const s=(random.float(1,1.3)+(args.critical?0.7:0))/this.game.camera.zoom
        this.game.addTween({
            duration: 1,
            target: this.sprite.scale,
            to: v2.random(s,s),
            ease:ease.cubicOut
        })

        
        this.game.addTween({
            duration: 0.4,
            target: this.sprite.position,
            to: v2.add(this.sprite.position, v2.dscale(v2.random2(v2.new(-0.2,-0.5),v2.new(0.3,-0.7)),this.game.camera.zoom*(args.critical?0.6:0.8))),
        })
        this.sprite.rotation=-0.1
        this.game.addTween({
            duration: args.critical?0.1:0.3,
            target: this.sprite,
            to: {rotation:0.1},
            yoyo:true,
            ease:ease.quadraticInOut,
            infinite:true
        })
        
        this.game.camera.addObject(this.sprite)
    }


    sounds?:{
        break?:Sound
        hit?:Sound[]
    }

    lifetime:number=3

    override on_destroy(): void {
        this.sprite.frame?.free()
        this.sprite.destroy()
    }
    dying:boolean=false
    can_die:boolean=true
    update(dt:number): void {
        this.lifetime-=dt
        if(this.lifetime<=0){
            this.dying=true
        }
        if(this.dying&&this.can_die){
            this.can_die=false
            // deno-lint-ignore no-this-alias
            const This=this
            this.game.addTween({
                duration:1,
                target:this.sprite.scale,
                to:{x:0,y:0},
                onComplete(){
                    This.destroy()
                }
            })
        }
    }
    constructor(){
        super()
        this.sprite=new Sprite2D()
        this.sprite.hotspot=v2.new(0.5,0.5)
        this.sprite.scale.x=0
        this.sprite.scale.y=0
        this.sprite.zIndex=zIndexes.DamageSplashs
    }
}