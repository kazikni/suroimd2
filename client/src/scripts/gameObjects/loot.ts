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
                    this.sprite_main.scale=v2.new(2,2);
                    this.sprite_outline.scale=v2.new(1.5,1.5);
                    (this.hb as CircleHitbox2D).radius=GameConstants.loot.radius.ammo
                    this.pickup_sound=this.game.resources.get_audio("ammo_pickup")
                    break
                case InventoryItemType.consumible:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2.new(1.5,1.5);
                    this.sprite_outline.scale=v2.new(0.9,0.9);
                    (this.hb as CircleHitbox2D).radius=GameConstants.loot.radius.consumible
                    this.pickup_sound=this.game.resources.get_audio(`${this.item.idString}_pickup`)
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