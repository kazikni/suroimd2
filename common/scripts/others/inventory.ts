import { GameItem } from "../definitions/alldefs.ts";
import { AmmoDef, Ammos } from "../definitions/items/ammo.ts";
import { BackpackDef, Backpacks } from "../definitions/items/backpacks.ts";
import { ConsumibleDef } from "../definitions/items/consumibles.ts";
import { GunDef } from "../definitions/items/guns.ts";
import { MeleeDef, Melees } from "../definitions/items/melees.ts";
import { ProjectileDef } from "../definitions/objects/projectiles.ts";
import { InventoryItemType } from "../definitions/utils.ts";
import { Inventory, Item, Slot } from "../engine/inventory.ts";
import { Numeric } from "../engine/utils.ts";

export abstract class MDItem extends Item{
    abstract item_type:InventoryItemType
    abstract def:GameItem
    droppable:boolean=true
    inventory!:GInventoryBase
    constructor(){
        super()
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        this.inventory=null
    }
    unload(){}
    load(){}
}
export class GunItemBase extends MDItem{
    def:GunDef
    liquid:boolean=false
    item_type=InventoryItemType.gun
    constructor(def?:GunDef){
        super()
        this.def=def!
        this.tags.push("gun")
        this.liquid=Ammos.getFromString(def!.ammoType).liquid??false
    }
    is(other: MDItem): boolean {
        return (other.item_type===this.item_type)&&other.def.idNumber==this.def.idNumber
    }
}
export class AmmoItemBase extends MDItem{
    def:AmmoDef
    item_type: InventoryItemType.ammo=InventoryItemType.ammo
    constructor(def:AmmoDef){
        super()
        this.def=def
        this.tags.push("ammo",`ammo_${this.def.ammoType}`)
    }
    is(other: MDItem): boolean {
        return (other.item_type===this.item_type)&&other.def.idNumber==this.def.idNumber
    }
}
export class ConsumibleItemBase extends MDItem{
  def:ConsumibleDef
  item_type: InventoryItemType.consumible=InventoryItemType.consumible
  constructor(def:ConsumibleDef){
      super()
      this.def=def
  }
  is(other: MDItem): boolean {
      return (other.item_type===this.item_type)&&other.def.idNumber==this.def.idNumber
  }
}
export class ProjectileItemBase extends MDItem{
    def:ProjectileDef
    item_type: InventoryItemType.projectile=InventoryItemType.projectile
    constructor(def:ProjectileDef){
        super()
        this.def=def
    }
    is(other: MDItem): boolean {
        return (other.item_type===this.item_type)&&other.def.idNumber==this.def.idNumber
    }
}
export class MeleeItemBase extends MDItem{
    def:MeleeDef
    item_type: InventoryItemType.melee=InventoryItemType.melee
    constructor(def:MeleeDef){
      super()
      this.limit_per_slot=1
      this.def=def
    }
    is(other: MDItem): boolean {
      return (other.item_type===this.item_type)&&other.def.idNumber==this.def.idNumber
    }
}
export class GInventoryBase<IT extends MDItem=MDItem> extends Inventory<IT>{
    weapons:Record<number,IT|undefined>={}
    weapons_kind:Record<number,(new(def:GameItem)=>IT)>={}
    weapons_defaults:Record<number,GameItem>={}

    weapon_idx:number=-1
    hand_item?:IT
    hand_def?:GameItem

    oitems:Record<string,number>={}

    backpack!:BackpackDef
    default_backpack:BackpackDef

    constructor(weapons_kind:Record<number,(new(def:GameItem)=>IT)>,weapons_defaults:Record<number,GameItem>={
        0:Melees.getFromString("survival_knife")
    }){
        super(1)
        this.default_backpack=Backpacks.getFromString("null_pack")
        this.set_backpack()
        this.weapons_kind=weapons_kind
        this.weapons_defaults=weapons_defaults
    }

    set_backpack(backpack?:BackpackDef){
        if(!backpack)backpack=this.default_backpack
        if(this.backpack&&this.backpack.idString===backpack.idString)return
        this.backpack=backpack
        for(const s of this.slots){
            if(s.item){
                s.item.limit_per_slot=backpack.max[s.item.def.idString]??this.default_backpack.max[s.item.def.idString]??15
            }
        }
        if(this.slots.length>backpack.slots){
            while(this.slots.length>backpack.slots){
              this.slots.pop()
            }
        }
        while(this.slots.length<backpack.slots){
            this.slots.push(new Slot<IT>())
        }
        this.dirty("backpack")
    }
    dirty(it:string){}
    set_hand_item(val:IT){
        this.hand_item=val
        this.hand_def=val.def
        this.hand_item.load()
        this.dirty("hand")
    }
    set_weapon_index(idx:number){
        if(this.weapon_idx===idx||!this.weapons[idx as keyof typeof this.weapons])return
        const val=this.weapons[idx as keyof typeof this.weapons]
        this.weapon_idx=idx
        if(this.hand_item){
            this.hand_item.unload()
        }
        this.set_hand_item(val!)
    }
    set_weapon(slot:number,wep?:GameItem){
        if(wep||this.weapons_defaults[slot]){
            const item=new(this.weapons_kind[slot])(wep??this.weapons_defaults[slot])
            item.inventory=this
            this.weapons[slot]=item
        }else{
            this.weapons[slot]=undefined
        }
        if(slot===this.weapon_idx){this.weapon_idx=-1;this.set_weapon_index(slot)}
        this.dirty("weapons")
    }
    clear_weapons(){
        this.weapons={}
        for(const k of Object.keys(this.weapons_kind)){
            if(this.weapons_defaults[k as unknown as number])this.set_weapon(k as unknown as number,this.weapons_defaults[k as unknown as number])
            else this.weapons[k as unknown as number]=undefined
        }
    }
    consume_oitem(a:string,val:number):number{
        if(this.oitems[a]){
            const con=Numeric.max(val,this.oitems[a])
            this.oitems[a]=Numeric.max(this.oitems[a],this.oitems[a]-val)
            if(this.oitems[a]===0){
                delete this.oitems[a]
            }
            this.dirty("oitems")
            return con
        }
        return 0
    }
    clear(){
        this.oitems={}
        this.set_backpack()
        for(const s of this.slots){
          s.clear()
        }
        this.clear_weapons()
    }
}