import { BuildingDef } from "common/scripts/definitions/objects/buildings_base.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { type Player } from "./player.ts";
import { Orientation, v2, Vec2 } from "common/scripts/engine/geometry.ts";
import { Hitbox2D } from "common/scripts/engine/hitbox.ts";
import { NetStream } from "common/scripts/engine/stream.ts";

export class Building extends ServerGameObject{
    stringType:string="building"
    numberType: number=11

    def!:BuildingDef
    state:number=0

    side:Orientation=0
    m_position!:Vec2

    spawnHitbox!:Hitbox2D

    dead:boolean=false

    constructor(){
        super()
    }

    update(_dt:number): void {
    }
    override interact(_user: Player): void {
    }
    create(args: {}): void {
        this.updatable=false
    }
    set_definition(def:BuildingDef){
        if(this.def)return
        this.def=def
    }
    set_position(position:Vec2,side:number){
        this.m_position=v2.duplicate(position)
        this.side=side as Orientation
        if(this.def.hitbox){
            this.hb=this.def.hitbox.transform(this.m_position,undefined,this.side)
        }else{
            this.hb.translate(this.m_position)
        }
        if(this.def.spawnHitbox){
            this.spawnHitbox=this.def.spawnHitbox.transform(this.m_position,undefined,this.side)
        }else{
            this.spawnHitbox=this.hb.clone()
        }
    }
    generate(position:Vec2,side:number){
        this.set_position(position,side)

        for(const l of this.def.loots??[]){
            const items=this.game.loot_tables.get_loot(l.table,{withammo:true})
            const p=v2.add_with_orientation(this.m_position,l.position,this.side)
            const layer=this.layer
            for(const li of items){
                this.game.add_loot(p,li.item,li.count,layer)
            }
        }
        /**for(const o of def.obstacles){
            const odef=Obstacles.getFromString(o.id)
            const obj=this.add_obstacle(odef,o.rotation)
            obj.set_position(v2.add_with_orientation(position,o.position,side))
        }*/

        this.manager.cells.updateObject(this)
    }
    override encode(stream: NetStream, full: boolean): void {
        if(full){
            stream.writePosition(this.m_position)
            .writeUint8(this.side)
            .writeID(this.def.idNumber!)
        }
    }
}