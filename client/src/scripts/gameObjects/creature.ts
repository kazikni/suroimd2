import { Container2D, Sprite2D } from "../engine/container_2d.ts"
import { v2m, Vec2 } from "common/scripts/engine/geometry.ts"
import { zIndexes } from "common/scripts/others/constants.ts"
import { CreatureDef, Creatures } from "common/scripts/definitions/objects/creatures.ts"
import { GameObject } from "../others/gameObject.ts"
import { NetStream } from "common/scripts/engine/stream.ts";
import { CenterHotspot } from "../engine/utils.ts";
import { Numeric } from "common/scripts/engine/utils.ts";
export class Creature extends GameObject{
    stringType:string="creature"
    numberType: number=10

    container:Container2D=new Container2D()

    main_sprite:Sprite2D=new Sprite2D()
    def!:CreatureDef
    state:number=0
    dead:boolean=false
    constructor(){
        super()
        this.container.add_child(this.main_sprite)
        this.container.zIndex=zIndexes.Creatures
        this.main_sprite.hotspot=CenterHotspot
        this.main_sprite.zIndex=2
    }

    // deno-lint-ignore no-explicit-any
    create(_args: any): void {
        this.game.camera.addObject(this.container)
    }

    set_def(def:CreatureDef){
        if(this.def)return
        this.def=def
        this.main_sprite.set_frame(def.frame.main,this.game.resources)
    }
    update(_dt:number): void {
        if(this.dest_pos){
            v2m.lerp(this.position,this.dest_pos,this.game.inter_global)
            this.container.rotation=Numeric.lerp_rad(this.container.rotation,this.dest_rot!,this.game.inter_global)
        }
        this.container.position=this.position
        this.manager.cells.updateObject(this)
    }
    kill(){
        if(this.dead)return
        this.dead=true
        this.container.zIndex=zIndexes.DeadCreatures
    }
    override on_destroy(): void {
        this.container.destroy()
    }
    dest_pos?:Vec2
    dest_rot?:number
    override decode(stream: NetStream, full: boolean): void {
        const pos=stream.readPosition()
        const rot=stream.readRad()
        if(this.game.save.get_variable("cv_game_interpolation")&&!full){
            this.dest_pos=pos
            this.dest_rot=rot
        }else{
            this.position=pos
            this.container.rotation=rot
        }
        this.state=stream.readUint8()
        if(full){
            const [dead]=stream.readBooleanGroup()
            this.set_def(Creatures.getFromNumber(stream.readUint16()))
            if(dead){
                this.kill()
            }
        }
    }
}