import { LootTable, LootTableItemRet } from "../../engine/inventory.ts";
import { InventoryItemType } from "../utils.ts";
import { GameItem, GameItems } from "../alldefs.ts";
import { GunDef } from "../items/guns.ts";
import { FloorType, RiversDef } from "../../others/terrain.ts";
import { Random1 } from "../../engine/random.ts";
import { Vec2 } from "../../engine/geometry.ts";
import { SpawnMode, type Layers } from "../../others/constants.ts";
import { NormalLobby, NormalMap, SnowMap } from "./normal.ts";

export interface Aditional{
    withammo:boolean
}
export function loot_table_get_item(item:string,count:number,_aditional:Aditional):LootTableItemRet<GameItem>[]{
    const itemD=GameItems.valueString[item]
    if(!itemD){
        console.error(item,"Not Founded")
    }
    if(itemD.item_type===InventoryItemType.gun){
        const ret:LootTableItemRet<GameItem>[]=[
            {
                item:itemD,
                count:count
            }
        ]
        if(itemD.ammoSpawnAmount){
            const ammo_def=GameItems.valueString[(itemD as unknown as GunDef).ammoSpawn??(itemD as unknown as GunDef).ammoType]
            ret.push({
                item:ammo_def,
                count:(itemD as unknown as GunDef).ammoSpawnAmount!
            })
        }
        return ret
    }else{
        return [
            {
                item:itemD,
                count:count
            }
        ]
    }
}
export interface BiomeFloor{
    color?:number
}
export interface BiomeDef{
    biome_skin?:string
    floors:Partial<Record<FloorType,BiomeFloor>>
    assets:string[]
    ambient:{
        snow?:boolean
        rain?:boolean
        particles:string[]
        sound?:string
    }
}
export interface IslandDef{
    size:Vec2
    terrain:{
        base:FloorType
        floors:{
            type:FloorType
            padding:number
            variation:number
            spacing:number
        }[]
        rivers?:{
            defs:RiversDef[]
            expansion?:number
            spawn_floor:number
            divisions:number
            floor?:FloorType
        }
    },
    ground_loot?:{table:string,count:Random1,layer?:Layers}[],
    spawn?:{id:string,count:Random1,layer?:Layers,spawn?:SpawnMode}[][],
}
export interface MapDef{
    loot_tables:Record<string,LootTable>
    default_floor?:FloorType
    biome:BiomeDef
    generation:{
        island?:IslandDef
    }
}
//export const LootTables=new LootTablesManager<GameItem,Aditional>(get_item)

export const Maps:Record<string,MapDef>={
    normal:NormalMap,
    lobby:NormalLobby,
    snow:SnowMap
}