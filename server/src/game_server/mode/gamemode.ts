import { BoostType } from "common/scripts/definitions/player/boosts.ts";
import { type Player } from "../gameObjects/player.ts";
import { type MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { type GunDef } from "common/scripts/definitions/items/guns.ts";
import { type BackpackDef } from "common/scripts/definitions/items/backpacks.ts";
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { GameItem } from "common/scripts/definitions/alldefs.ts";
import { mergeDeep } from "common/scripts/engine/utils.ts";
import { KDate } from "common/scripts/engine/definitions.ts";
import { SpawnMode, SpawnModeType } from "common/scripts/others/constants.ts";
import { FloorType } from "common/scripts/others/terrain.ts";

export interface InventorySetupItem{
    item:GameItem,
    count:number
}
export interface InventorySetup{
    helmet?:(player:Player)=>HelmetDef|undefined
    vest?:(player:Player)=>VestDef|undefined
    backpack?:(player:Player)=>BackpackDef|undefined

    items?:(player:Player)=>InventorySetupItem[]

    melee?:(player:Player)=>MeleeDef|undefined
    gun1?:(player:Player)=>GunDef|undefined
    gun2?:(player:Player)=>GunDef|undefined
}
export interface Gamemode{
    player:{
        boosts:{
            adrenaline:{
                decay:number
                speed:number
                regen:number
            }
            mana:{
                regen:number
            }
            addiction:{
                decay:number
                damage:number
                abstinence:number
                speed:number
            }
            green_bless:{
                regen:number
                damage_reduction:number
            }
            death:{
                life_time:number
                damage:number
                damage_reduction:number
                speed:number
            }
            default_boost:BoostType
        },
        respawn?:{
            max_respawn?:number
            keep_inventory?:boolean
            insert_inventory?:InventorySetup
        }
        max:number
        spawn_mode:SpawnMode
    }
    game:{
        no_battle_plane?:boolean
        map:string
        lobby:string
        date:KDate
    }
}
export const DefaultGamemode:Gamemode={
    player:{
        boosts:{
            adrenaline:{
                decay:0.25,
                speed:0.23,
                regen:0.01
            },
            mana:{
                regen:0.03
            },
            addiction:{
                decay:0.15,
                damage:0.7,
                speed:0.5,
                abstinence:0.009
            },
            green_bless:{
                regen:0.01,
                damage_reduction:0.2,
            },
            death:{
                life_time:160,
                damage:0.5,
                damage_reduction:0.5,
                speed:0.7
            },
            default_boost:BoostType.Adrenaline
        },
        /*respawn:{
            max_respawn:2,
            insert_inventory:{
                backpack(_player) {
                    return Backpacks.getFromString("basic_pack")
                },
            }
        }*/
        spawn_mode:{
            type:SpawnModeType.whitelist,
            list:[FloorType.Grass,FloorType.Snow,FloorType.Sand],
        },
        max:100
    },
    game:{
        no_battle_plane:false,
        map:"normal",
        lobby:"lobby",
        date:{
            second:0,
            minute:30,
            hour:13,
            month:13,
            day:10,
            year:2000
        }
    }
}

export const Gamemodes:Record<string,Gamemode>={
    normal:DefaultGamemode,
    snow:mergeDeep({},DefaultGamemode,{
        game:{
            map:"snow",
            lobby:"lobby",
            no_battle_plane:DefaultGamemode.game.no_battle_plane,
            date:{
                second:0,
                minute:30,
                hour:13,
                month:3,
                day:11,
                year:2001
            }
        }
    } satisfies Partial<Gamemode>) as Gamemode
}