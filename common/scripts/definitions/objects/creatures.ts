import { Definition, Definitions, FrameDef } from "../../engine/definitions.ts";
import { v2, Vec2 } from "../../engine/geometry.ts";
import { CircleHitbox2D, Hitbox2D } from "../../engine/hitbox.ts";
import { SpawnMode } from "../../others/constants.ts";
export interface CreatureDef extends Definition{
    imortal?:boolean
    health:number
    hitbox:Hitbox2D
    lootTable?:string
    spawn?:SpawnMode
    server_side:{
        update?:string
        update_parameters?:Record<string,any>
    }
    client_side:{
        update?:string
        update_parameters?:Record<string,any>
    }
    parts:{
        frame:FrameDef
        position:Vec2
    }[]
    frame:{
        main:FrameDef
    }
}
export const CreaturesAI={
    
}
export const Creatures=new Definitions<CreatureDef,null>((i)=>{
})

Creatures.insert(
    {
        idString:"pig",
        lootTable:"animal_medium",
        health:80,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.4),
        parts:[],
        frame:{
            main:{
                image:"pig_1",
                scale:1.5
            },
        },
        client_side:{

        },    
        server_side:{
            update:"friendly_1",
            update_parameters:{
                speed:0.4,
                walk_time:1,
                walk_time_extension:2,
            }
        }
    },
    {
        idString:"chicken",
        lootTable:"animal_medium",
        health:40,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.25),
        parts:[],
        frame:{
            main:{
                image:"chicken_1",
                scale:1.5
            },
        },
        client_side:{

        },    
        server_side:{
            update:"friendly_1",
            update_parameters:{
                speed:0.4,
                walk_time:1,
                walk_time_extension:2,
            }
        }
    },
    {
        idString:"basic_zombie",
        health:60,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.4),
        parts:[],
        frame:{
            main:{
                image:"zombie_1",
                scale:1.3333333
            },
        },
        client_side:{

        },    
        server_side:{
            update:"offensive_1",
            update_parameters:{
                speed:0.4,
                walk_time:1,
                walk_time_extension:2,
            }
        }
    },
)