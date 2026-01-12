import { MapDef } from "../definitions/maps/base.ts";
import { InventoryPreset } from "../definitions/utils.ts";
import { Vec2 } from "../engine/geometry.ts";
import { PlayerModifiers } from "../others/constants.ts";

export type LevelPlayerDefinition={
    name?:string
    start_position?:Vec2
    inventory?:InventoryPreset
    modifiers:Partial<PlayerModifiers>
}
export type LevelMapDefinition=string|(MapDef&{base:string})
export type EnemyDef={
    ia:{
        kind?:string
        action?:string
        params?:Record<string,any>
    }
    inventory:InventoryPreset
}
export type LevelObjective=({
    type:"kill_all_enemies",
    enemies:{
        def:EnemyDef|string
        name?:string

        position?:Vec2
        count?:number
    }[]
}|{
    type:"battle_royale"
    team_size:number
    groups?:number
    players:{
        count:number
    }
})
export interface LevelDefinition{
    meta:{
        name: string
        description: string
        size:"small"|"medium"|"large"
        dificulty:"easy"|"normal"|"hard"
    }
    map: {
        def?:LevelMapDefinition
        seed?:number
    };
    objective: LevelObjective
    player:LevelPlayerDefinition
    gamemode?:string
    assets?:{
        background_music?:string
        comics?:{
            before_level?:string[]
            after_level?:string[]
        }
    }
    definitions?:{
        enemies?:Record<string,{
            easy:EnemyDef,
            normal:EnemyDef,
            hard:EnemyDef
        }>
    }
}