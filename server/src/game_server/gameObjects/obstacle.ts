import { Angle, Hitbox2D, HitboxType2D, LootTableItemRet, NetStream, Numeric, Orientation, RotationMode, v2, Vec2 } from "common/scripts/engine/mod.ts"
import { ObstacleDef, ObstacleDoorStatus } from "common/scripts/definitions/objects/obstacles.ts";
import { DamageParams } from "../others/utils.ts";
import { random } from "common/scripts/engine/random.ts";
import { type Player } from "./player.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";
import { Explosions } from "common/scripts/definitions/objects/explosions.ts";
import { GameItem } from "common/scripts/definitions/alldefs.ts";

export class Obstacle extends ServerGameObject{
    stringType:string="obstacle"
    numberType: number=4

    def!:ObstacleDef
    spawnHitbox!:Hitbox2D
    skin:number=0

    health:number=0

    constructor(){
        super()
    }
    scale:number=1
    maxScale:number=1

    variation:number=1
    rotation:number=0
    side:Orientation=0
    actived:boolean=false
    m_position:Vec2=v2.new(0,0)

    dead:boolean=false

    loot:LootTableItemRet<GameItem>[]=[]

    door?:ObstacleDoorStatus

    update(_dt:number): void {
    }
    interact(user: Player): void {
        if(this.actived)return
        if(this.def.interactDestroy){
            this.kill({
                amount:this.health,
                position:this.position,
                reason:DamageReason.Player,
                owner:user,
                critical:false
            })
        }
        if(this.door!==undefined){
            this.door!.open=this.door!.open===0?1:0
            const dd=this.def.expanded_behavior!
            if(dd.open_delay!==undefined&&dd.open_delay>0){
                this.actived=true
                this.game.addTimeout(()=>{
                    this.actived=false
                    this.door_change_hb()
                },dd.open_delay!)
            }else{
                this.door_change_hb()
            }
            this.dirtyPart=true
        }
    }

    door_change_hb(){
        
    }
    
    create(args: {def:ObstacleDef,rotation?:number,variation?:number,skin?:number}): void {
        this.def=args.def
        
        if(args.variation){
            this.variation=args.variation
        }else if(this.def.variations){
            this.variation=Numeric.clamp(random.int(1,this.def.variations+1),1,this.def.variations)
        }
        if(args.skin){
            this.skin=args.skin
        }else if(this.def.biome_skins){
            this.skin=this.def.biome_skins.indexOf(this.game.map.def.biome.biome_skin??"")+1
        }
        if(args.rotation===undefined){
            if(this.def.rotationMode===RotationMode.limited){
                this.side=random.int(0,3) as Orientation
                this.rotation=Angle.side_rad(this.side)
            }else{
                this.rotation=Angle.random_rotation_modded(this.def.rotationMode??RotationMode.full)
            }
        }else if(this.def.rotationMode){
            if(this.def.rotationMode===RotationMode.limited){
                this.side=args.rotation as Orientation
                this.rotation=Angle.side_rad(this.side)
            }else{
                this.rotation=args.rotation!
            }
        }
        this.health=this.def.health

        if(this.def.lootTable){
            this.loot=this.game.loot_tables.get_loot(this.def.lootTable,{withammo:true})
        }

        if(this.def.scale?.min&&this.def.scale.max){
            this.maxScale=random.float(this.def.scale.min,this.def.scale.max)
            this.scale=this.maxScale
        }

        switch(this.def.expanded_behavior?.type??-1){
            case 0:{
                this.updatable=true
                this.door={
                    locked:false,
                    open:0,
                }
                break
            }
            default:
                this.updatable=false
        }
    }
    set_position(position:Vec2){
        if(this.def.hitbox){
            this.hb=this.def.hitbox.transform(position,undefined,0)
        }else{
            this.position=position
        }

        if(this.def.spawnHitbox){
            this.spawnHitbox=this.def.spawnHitbox.transform(position,undefined,0)
        }else{
            this.spawnHitbox=this.hb.clone()
        }
        this.m_position=v2.duplicate(position)
        this.reset_scale()
        this.manager.cells.updateObject(this)
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writeBooleanGroup(this.dead,this.door!==undefined)
        .writeFloat(this.scale,0,3,3)
        .writeFloat(this.health/this.def.health,0,1,1)
        if(this.door){
            stream.writeBooleanGroup(this.door.locked)
            .writeInt8(this.door.open)
        }
        if(full){
            stream.writeRad(this.rotation)
            .writeUint8(this.side)
            .writeUint8(this.variation)
            .writePosition(this.m_position)
            .writeUint8(this.skin)
            .writeUint16(this.def.idNumber!)
        }
    }
    reset_scale(){
        if(this.def.hitbox&&this.def.scale){
            const destroyScale = (this.def.scale.destroy ?? 1)*this.maxScale;
            this.scale=Math.max(this.health / this.def.health*(this.maxScale - destroyScale) + destroyScale,0)
            this.hb=this.def.hitbox.transform(this.m_position,this.scale,0)
            this.dirty=true
        }
    }
    damage(params:DamageParams){
        if(this.dead)return
        this.health=Math.max(this.health-params.amount,0)
        if(this.health===0){
            this.kill(params)
        }else{
            this.reset_scale()
        }
        this.dirtyPart=true
    }
    kill(params:DamageParams){
        if(this.dead)return
        if(this.def.onDestroyExplosion){
            const ex=Explosions.getFromString(this.def.onDestroyExplosion)
            this.game.add_explosion(this.hb.center(),ex,params.owner,this.def)
        }
        for(const l of this.loot){
            this.game.add_loot(this.hb.randomPoint(),l.item,l.count)
        }

        this.dirtyPart=true
        this.dead=true
    }
}