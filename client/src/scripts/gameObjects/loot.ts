import { Angle, CircleHitbox2D, NetStream, v2, Vec2 } from "common/scripts/engine/mod.ts";
import { GameConstants, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
import { type Camera2D, Container2D, type Renderer, type Sound, Sprite2D } from "../engine/mod.ts";
import { InventoryItemType } from "common/scripts/definitions/utils.ts";
import { GameItem, GameItems } from "common/scripts/definitions/alldefs.ts"
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { ease } from "common/scripts/engine/utils.ts";
import { SkinDef } from "common/scripts/definitions/loadout/skins.ts";
import { v2m, τ } from "common/scripts/engine/geometry.ts";
import { type Player } from "./player.ts";
import { type HelmetDef, type VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { Backpacks, type BackpackDef } from "common/scripts/definitions/items/backpacks.ts";
import { ConsumibleDef } from "common/scripts/definitions/items/consumibles.ts";
export class Loot extends GameObject{
    stringType:string="loot"
    numberType: number=2
    name:string=""
    container:Container2D=new Container2D()

    item!:GameItem
    count:number=1

    sprite_main:Sprite2D=new Sprite2D()
    sprite_outline:Sprite2D=new Sprite2D()

    pickup_sound:Sound|undefined
    create(_args: Record<string, void>): void {
        this.hb=new CircleHitbox2D(v2.new(3,3),0.3)
        this.game.camera.addObject(this.container)
    }
    update(_dt:number): void {
        if(this.dest_pos){
            v2m.lerp(this.position,this.dest_pos,this.game.inter_global)
        }
        this.container.position=this.position
        this.manager.cells.updateObject(this)
    }
    constructor(){
        super()
        this.container.visible=false
        this.sprite_main.hotspot=v2.new(.5,.5)
        this.sprite_main.visible=false
        this.sprite_main.zIndex=3
        this.sprite_outline.hotspot=v2.new(.5,.5)
        this.sprite_outline.visible=false
        this.sprite_outline.zIndex=0
        this.container.zIndex=zIndexes.Loots
        this.container.add_child(this.sprite_outline)
        this.container.add_child(this.sprite_main)
        this.container.updateZIndex()
    }
    override on_destroy(): void {
        this.container.destroy()
    }
    override render(_camera: Camera2D, _renderer: Renderer, _dt: number): void {
        
    }
    override can_interact(player: Player): boolean {
        if ((!this.item)||this.count <= 0) return false
        return player.hb.collidingWith(this.hb)
    }

    override interact(player: Player): void {
        switch(this.item.item_type!){
            case InventoryItemType.gun:
                if(!(
                    (this.game.guiManager.weapons[1]===undefined||this.game.guiManager.weapons[2]===undefined)
                    ||(player.current_weapon&&player.current_weapon.item_type===InventoryItemType.gun)
                ))return
                break
            case InventoryItemType.ammo:
            case InventoryItemType.consumible:
                break
            case InventoryItemType.helmet:
                if(player.helmet&&player.helmet.level>=(this.item as HelmetDef).level)return
                break
            case InventoryItemType.vest:
                if(player.vest&&player.vest.level>=(this.item as VestDef).level)return
                break
            case InventoryItemType.backpack:
                if(player.backpack&&player.backpack.level>=(this.item as BackpackDef).level)return
                break
            case InventoryItemType.projectile:
            case InventoryItemType.melee:
                if(!(
                    (this.game.guiManager.weapons[0]===undefined||this.game.guiManager.weapons[0]===player.default_melee)
                    ||(player.current_weapon&&player.current_weapon.item_type===InventoryItemType.melee)
                ))return
                break
            case InventoryItemType.accessorie:
            case InventoryItemType.skin:
            case InventoryItemType.scope:
        }
        if(this.pickup_sound)this.game.sounds.play(this.pickup_sound,undefined,"players")
    }
    override auto_interact(player: Player): boolean {
        switch(this.item.item_type!){
            case InventoryItemType.melee:
                return this.game.guiManager.weapons[0]===undefined||this.game.guiManager.weapons[0]===player.default_melee
            case InventoryItemType.gun:
                return this.game.guiManager.weapons[1]===undefined||this.game.guiManager.weapons[2]===undefined
            case InventoryItemType.ammo:
                return (this.game.guiManager.oitems[this.item.idString]??0)<(player.backpack?.max[this.item.idString]??9999)
            case InventoryItemType.consumible:{
                const limit_per_slot=player.backpack?.max[this.item.idString]??Backpacks.getFromNumber(0).max[this.item.idString]??15
                return (this.game.guiManager.items![this.item.idString]??0)<limit_per_slot
            }
            case InventoryItemType.helmet:
                return !player.helmet||player.helmet.level<(this.item as HelmetDef).level
            case InventoryItemType.vest:
                return !player.vest||player.vest.level<(this.item as VestDef).level
            case InventoryItemType.backpack:
                return !player.backpack||player.backpack.level<(this.item as BackpackDef).level
        }
        return false
    }
    override get_interact_hint(player: Player) {
        return player.game.language.get("interact-loot", {
            source: player.game.language.get(this.item.idString),
            count: this.count > 1 ? `(${this.count})` : ""
        })
    }
    dest_pos?:Vec2
    override decode(stream: NetStream, full: boolean): void {
        if(this.game.save.get_variable("cv_game_interpolation")&&!full){
            this.dest_pos=stream.readPosition()
        }else{
            this.position=stream.readPosition()
        }
        if(full){
            this.item=GameItems.valueNumber[stream.readUint16()]
            this.count=stream.readUint8()
            switch(this.item.item_type!){
                case InventoryItemType.gun:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.rotation=Angle.deg2rad(-30)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`${(this.item as unknown as GunDef).ammoType}_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_outline.scale=v2.new(1.5,1.5);
                    (this.hb as CircleHitbox2D).radius=GameConstants.loot.radius.weapon
                    this.pickup_sound=this.game.resources.get_audio("gun_pickup")
                    break
                case InventoryItemType.ammo:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true;
                    this.sprite_main.scale=v2.new(2,2)
                    this.sprite_outline.scale=v2.new(1.5,1.5);
                    (this.hb as CircleHitbox2D).radius=GameConstants.loot.radius.ammo
                    this.pickup_sound=this.game.resources.get_audio("ammo_pickup")
                    break
                case InventoryItemType.consumible:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2.new(1.5,1.5)
                    this.sprite_outline.scale=v2.new(0.9,0.9);
                    (this.hb as CircleHitbox2D).radius=GameConstants.loot.radius.consumible
                    this.pickup_sound=this.game.resources.get_audio((this.item as ConsumibleDef).assets?.pickup_sound??`${this.item.idString}_pickup`)
                    break
                case InventoryItemType.backpack:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2.new(0.8,0.8);
                    this.sprite_outline.scale=v2.new(0.9,0.9);
                    (this.hb as CircleHitbox2D).radius=GameConstants.loot.radius.equipament
                    this.pickup_sound=this.game.resources.get_audio(`backpack_pickup`)
                    break
                case InventoryItemType.vest:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2.new(0.8,0.8);
                    this.sprite_outline.scale=v2.new(0.9,0.9);
                    (this.hb as CircleHitbox2D).radius=GameConstants.loot.radius.equipament
                    this.pickup_sound=this.game.resources.get_audio(`vest_pickup`)
                    break
                case InventoryItemType.helmet:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2.new(0.8,0.8);
                    this.sprite_outline.scale=v2.new(0.9,0.9);
                    (this.hb as CircleHitbox2D).radius=GameConstants.loot.radius.equipament
                    this.pickup_sound=this.game.resources.get_audio(`helmet_pickup`)
                    break
                case InventoryItemType.projectile:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true
                    this.sprite_main.scale=v2.new(0.8,0.8);
                    this.sprite_outline.scale=v2.new(0.9,0.9);
                    (this.hb as CircleHitbox2D).radius=GameConstants.loot.radius.projectile
                    break
                case InventoryItemType.melee:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.rotation=Angle.deg2rad(-30)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_outline.scale=v2.new(1.5,1.5);
                    (this.hb as CircleHitbox2D).radius=GameConstants.loot.radius.weapon
                    this.pickup_sound=this.game.resources.get_audio("gun_pickup")
                    break
                case InventoryItemType.accessorie:
                    break
                case InventoryItemType.skin:{
                    const ff=(this.item as unknown as SkinDef).frame?.base??(this.item.idString+"_body")
                    this.sprite_main.frame=this.game.resources.get_sprite(ff)
                    this.sprite_main.visible=true
                    this.sprite_main.scale=v2.new(0.5,.5)
                    this.sprite_main.rotation=τ
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_outline.scale=v2.new(0.9,0.9);
                    (this.hb as CircleHitbox2D).radius=GameConstants.loot.radius.skin
                    break
                }
            }
            if(this.is_new){
                v2m.single(this.container.scale,0.05)
                this.game.addTween({
                    duration:3,
                    target:this.container.scale,
                    ease:ease.elasticOut,
                    to:{
                        x:1,
                        y:1
                    },
                })
            }
            this.container.visible=true
        }
    }
}