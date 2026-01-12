import { Definitions,Definition, Vec2 } from "../../engine/mod.ts"
import { InventoryItemType } from "../utils.ts";
import { PlayerModifiers } from "../../others/constants.ts";
import { v2 } from "common/scripts/engine/geometry.ts";
import { ItemQuality } from "../../others/item.ts";

export interface VestDef extends Definition{
    defence:number
    reduction:number
    level:number
    tint:number
    quality:ItemQuality
    reflect_bullets?:boolean
    item_type?:InventoryItemType.vest
}
export interface HelmetDef extends Definition{
    defence:number
    reduction:number
    level:number
    position?:Vec2
    quality:ItemQuality
    item_type?:InventoryItemType.helmet
}
export const Vests=new Definitions<VestDef,{}>((obj)=>{
    obj.item_type=InventoryItemType.vest
})

export const Helmets=new Definitions<HelmetDef,{}>((obj)=>{
    obj.item_type=InventoryItemType.helmet
})
Helmets.insert(
    {
        idString:"basic_helmet",
        defence:0,
        level:1,
        reduction:0.1,
        position:v2.new(0,0),
        quality:ItemQuality.Common
    },
    {
        idString:"regular_helmet",
        defence:0,
        level:2,
        reduction:0.15,
        position:v2.new(0,0),
        quality:ItemQuality.Uncommon
    },
    {
        idString:"tactical_helmet",
        defence:0,
        level:3,
        reduction:0.20,
        position:v2.new(0,0),
        quality:ItemQuality.Rare
    },
    {
        idString:"lastman_helmet",
        defence:0,
        level:4,
        reduction:0.25,
        position:v2.new(0,0),
        quality:ItemQuality.Legendary
    },
)
Vests.insert(
    //Normals Vest
    {
        idString:"basic_vest",
        defence:0,
        level:1,
        reduction:0.1,
        tint:0xffffff,
        quality:ItemQuality.Common
    },
    {
        idString:"regular_vest",
        defence:0,
        level:2,
        reduction:0.15,
        tint:0x556655,
        quality:ItemQuality.Uncommon
    },
    {
        idString:"tactical_vest",
        defence:0,
        level:3,
        reduction:0.20,
        tint:0x010011,
        quality:ItemQuality.Rare
    },
    {
        idString:"elite_vest",
        defence:0,
        level:4,
        reflect_bullets:true,
        reduction:0.25,
        tint:0x5C322E,
        quality:ItemQuality.Mythic
    },
)
export interface AccessorieDef extends Definition{
    modifiers:Partial<PlayerModifiers>
    quality:ItemQuality
    item_type?:InventoryItemType.accessorie
}
export const Accessories=new Definitions<AccessorieDef,{}>((obj)=>{
    obj.item_type=InventoryItemType.accessorie
})
Accessories.insert(
    {
        idString:"rubber_bracelet",
        modifiers:{
            bullet_size:1.8,
        },
        quality:ItemQuality.Common
    },
    {
        idString:"bullet_wind",
        modifiers:{
            bullet_speed:1.7,
        },
        quality:ItemQuality.Common
    },
    {
        idString:"cobalt_bracelet",
        modifiers:{
            health:0.9,
            boost:1.1
        },
        quality:ItemQuality.Common
    },
    {
        idString:"uranium_bracelet",
        modifiers:{
            health:0.85,
            damage:1.2
        },
        quality:ItemQuality.Common
    },
)