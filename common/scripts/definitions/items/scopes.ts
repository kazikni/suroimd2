import { Definition, Definitions } from "../../engine/definitions.ts";
import { ItemQuality } from "../../others/item.ts";
import { InventoryItemType } from "../utils.ts";

export interface ScopeDef extends Definition{
    scope_view:number
    droppable:boolean
    quality:ItemQuality
    item_type?:InventoryItemType.scope
}
export const Scopes=new Definitions<ScopeDef,{}>((i)=>{
    i.item_type=InventoryItemType.scope
})
Scopes.insert(
    {
        idString:"scope_1",
        scope_view:0.78,
        droppable:false,
        quality:ItemQuality.Common
    },
    {
        idString:"scope_2",
        scope_view:0.63,
        droppable:true,
        quality:ItemQuality.Common
    },
    {
        idString:"scope_3",
        scope_view:0.53,
        droppable:true,
        quality:ItemQuality.Uncommon
    },
    {
        idString:"scope_4",
        scope_view:0.35,
        droppable:true,
        quality:ItemQuality.Rare
    },
    {
        idString:"scope_5",
        scope_view:0.27,
        droppable:true,
        quality:ItemQuality.Epic
    },
    {
        idString:"scope_6",
        scope_view:0.14,
        droppable:true,
        quality:ItemQuality.Mythic
    },
)