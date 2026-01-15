import { CircleHitbox2D, NetStream, v2, v2m, Vec2 } from "common/scripts/engine/mod.ts"
import { GameConstants } from "common/scripts/others/constants.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { type Player } from "./player.ts";
import { InventoryItemType } from "common/scripts/definitions/utils.ts";
import { type Obstacle } from "./obstacle.ts";
import { GameItem, GameItems } from "common/scripts/definitions/alldefs.ts"
import { BackpackDef } from "common/scripts/definitions/items/backpacks.ts";
import { SkinDef } from "common/scripts/definitions/loadout/skins.ts";
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { Floors, FloorType } from "common/scripts/others/terrain.ts";
import { Building } from "./building.ts";
import { ScopeDef } from "common/scripts/definitions/items/scopes.ts";

export class Loot extends ServerGameObject{
    velocity:Vec2
    stringType:string="loot"
    numberType: number=2
    count:number=1
    item!:GameItem
    real_radius=0

    oldPos:Vec2=v2.new(-1,-1)
    constructor(){
        super()
        this.velocity=v2.new(0,0)
        this.oldPos=v2.duplicate(this.position)
        
    }
    reduce_count(count:number){
        this.count-=count
        this.destroy()
        if(this.count>0){
            this.game.add_loot(this.position,this.item,this.count,this.layer)
        }
    }
    override can_interact(user: Player): boolean {
        return user.hitbox.collidingWith(this.hitbox)&&!this.destroyed
    }
    interact(user: Player): void {
        switch(this.item.item_type!){
            case InventoryItemType.gun:{
                const r=user.inventory.add_gun(this.item as GunDef)
                if(r)this.reduce_count(1)
                break
            }
            case InventoryItemType.melee:{
                user.inventory.set_weapon(0,this.item as MeleeDef)
                this.reduce_count(1)
                break
            }
            case InventoryItemType.ammo:
            case InventoryItemType.projectile:
            case InventoryItemType.consumible:{
                this.destroy()
                user.inventory.give_item(this.item,this.count)
                break
            }
            case InventoryItemType.vest:{
                const d=this.item as VestDef
                if(user.vest&&user.vest.level>=d.level)break
                if(user.vest)user.game.add_loot(user.position,user.vest as GameItem,1)
                user.vest=d
                user.dirty=true
                this.reduce_count(1)
                break
            }
            case InventoryItemType.helmet:{
                const d=this.item as HelmetDef
                if(user.helmet&&user.helmet.level>=d.level)break
                if(user.helmet)user.game.add_loot(user.position,user.helmet,1)
                user.helmet=d
                user.dirty=true
                this.reduce_count(1)
                break
            }
            case InventoryItemType.backpack:{
                const d=this.item as BackpackDef
                if(user.inventory.backpack.level<d.level){
                    user.dirty=true
                    user.inventory.set_backpack(d,true)
                    this.reduce_count(1)
                }
                break
            }
            case InventoryItemType.accessorie:
                break
            case InventoryItemType.scope:
                if(!user.inventory.scopes.includes(this.item.idNumber!)){
                    user.inventory.scopes.push(this.item.idNumber!)
                    this.reduce_count(1)
                    if(this.item.idNumber!>user.scope.idNumber!){
                        user.scope=this.item as ScopeDef
                    }
                    user.inventory.dirty("scopes")
                }
                break
            case InventoryItemType.skin:
                if(user.skin.idString!==this.item.idString){
                    this.game.add_loot(this.position,user.skin,1)
                    user.skin=this.item as SkinDef
                    user.dirty=true
                    this.reduce_count(1)
                }
                break
        }
        //user.give_item(this.item,this.count)
        return
    }
    current_floor:FloorType=FloorType.Water
    update(dt:number): void {
        const cf=Floors[this.current_floor]
        const speed=1
                  * (cf.speed_mult??1)
        const others=this.manager.cells.get_objects(this.hitbox,this.layer)
        for(const other of others){
            switch(other.stringType){
                case "loot":{
                    if(other.id===this.id)continue
                    const col=this.hitbox.overlapCollision(other.hitbox)
                    if(col.length>0){
                        this.velocity=v2.sub(this.velocity,v2.scale((col[0].dir.x===1&&col[0].dir.y===0)?v2.random(-1,1):col[0].dir,3*dt))
                    }
                    break
                }
                case "obstacle":{
                    if((other as Obstacle).dead||(other as Obstacle).def.no_collision)break
                    const col=this.hitbox.overlapCollision(other.hitbox)
                    for(const c of col){
                        this.position=v2.sub(this.position,v2.scale(c.dir,c.pen))
                        this.velocity=v2.sub(this.velocity,v2.scale((c.dir.x===1&&c.dir.y===0)?v2.random(-1,1):c.dir,0.03))
                    }
                    break
                }
                case "building":{
                    if((other as Building).def.no_collisions||!(other.hitbox))break
                    const col=this.hitbox.overlapCollision(other.hitbox)
                    for(const c of col){
                        this.position=v2.sub(this.position,v2.scale(c.dir,c.pen))
                        this.velocity=v2.sub(this.velocity,v2.scale((c.dir.x===1&&c.dir.y===0)?v2.random(-1,1):c.dir,0.03))
                    }
                    break
                }
            }
            
        }
        if(this.velocity.x!=0||this.velocity.y!=0){
            v2m.scale(this.velocity,this.velocity,1/(1+dt*(
                GameConstants.loot.velocityDecay/
                ((cf.acceleration??13)/13)
            )))
            const pos=v2.add(this.position,v2.scale(this.velocity,speed*dt))
            this.position=this.game.map.clamp_hitbox(pos,this.base_hitbox)
        }
        if(!v2.is(this.position,this.oldPos)){
            this.dirtyPart=true
            this.oldPos=v2.duplicate(this.position)
            this.current_floor=this.game.map.terrain.get_floor_type(this.position,this.layer,this.game.map.def.default_floor??FloorType.Water)
            this.manager.cells.updateObject(this)
        }
    }
    push(speed:number,angle:number){
        const a=v2.from_RadAngle(angle)
        v2m.add_component(this.velocity,a.x*speed,a.y*speed)
    }
    create(args: {position:Vec2,item:GameItem,count:number}): void {
        this.base_hitbox=new CircleHitbox2D(v2.new(0,0),0.3)
        this.item=args.item
        this.count=args.count
        switch(this.item.item_type){
            case InventoryItemType.gun:
            case InventoryItemType.melee:
                this.base_hitbox.radius=GameConstants.loot.radius.weapon
                break
            case InventoryItemType.ammo:
                this.base_hitbox.radius=GameConstants.loot.radius.ammo
                break
            case InventoryItemType.consumible:
                this.base_hitbox.radius=GameConstants.loot.radius.consumible
                break
            case InventoryItemType.backpack:
            case InventoryItemType.helmet:
            case InventoryItemType.vest:
                this.base_hitbox.radius=GameConstants.loot.radius.equipament
                break
            case InventoryItemType.projectile:
                this.base_hitbox.radius=GameConstants.loot.radius.projectile
                break
            case InventoryItemType.accessorie:
            case InventoryItemType.skin:
                this.base_hitbox.radius=GameConstants.loot.radius.skin
                break
        }
        this.real_radius=this.base_hitbox.radius
        this.position=args.position
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writePosition(this.position)
        if(full){
            stream.writeUint16(GameItems.keysString[this.item.idString])
            .writeUint8(this.count)
        }
    }
}