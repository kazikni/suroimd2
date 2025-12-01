import { v2, Vec2 } from "../../engine/geometry.ts";
import { Hitbox2D, RectHitbox2D } from "../../engine/hitbox.ts";
import { Definitions,Definition } from "../../engine/mod.ts"
import { mergeDeep } from "../../engine/utils.ts";
import { Spawn, SpawnMode, zIndexes } from "../../others/constants.ts";

export type BuildingObstacles={
    id:string
    position:Vec2
    rotation?:number
    scale?:number
}
export type BuildingLoot={
    table:string
    position:Vec2
}
export type BuildingSubBuilding={
    id:string
    position:Vec2
    rotation?:0|1|2|3
}
export interface BuildingImageDefinition {
    image: string
    position: Vec2
    rotation?: number
    hotspot?:Vec2
    scale?: number
    tint?: number
    zIndex?: zIndexes
    alpha?: number
}
export interface BuildingDef extends Definition{
    no_collisions?: boolean
    no_bullet_collision?: boolean
    reflect_bullets?:boolean
    obstacles:BuildingObstacles[]
    loots?:BuildingLoot[]
    spawnHitbox?:Hitbox2D
    spawnMode:SpawnMode
    hitbox?:Hitbox2D
    floor_image?:BuildingImageDefinition[]
    material?:string
    assets?:{
        particles?:string
        particles_variation?:number
        particles_tint?:number
        sounds?:{
            hit:string
            break:string
            hit_variations?:number
        }
    }
}
export const Buildings=new Definitions<BuildingDef,null>((i)=>{
})
const Templates={
    container_1:{
        idString:"container_1",
        obstacles:[
            
        ],
        spawnMode:Spawn.grass,
        reflect_bullets:false,
        loots:[
            {position:v2.new(-1,0),table:"ground_loot"},
            {position:v2.new(1,0),table:"ground_loot"}
        ],
        hitbox:RectHitbox2D.wall_enabled(v2.new(-2.85,-1.42),v2.new(2.85,1.42),{
            left:true,
            bottom:true,
            right:false,
            top:true
        },0.5),
        material:"iron",
        assets:{
            particles:"metal_particle",
            particles_tint:0x00359f
        },
        floor_image:[
            {
                image:"container_floor_1",
                position:v2.new(0,0),
                hotspot:v2.new(.5,.5),
                scale:2,
                tint:0x00359f
            }
        ]
    } satisfies BuildingDef,
    container_2:{
        idString:"container_2",
        obstacles:[
            
        ],
        spawnMode:Spawn.grass,
        reflect_bullets:false,
        loots:[
            {position:v2.new(-1,0),table:"ground_loot"},
            {position:v2.new(1,0),table:"ground_loot"}
        ],
        hitbox:RectHitbox2D.wall_enabled(v2.new(-2.85,-1.42),v2.new(2.85,1.42),{
            left:false,
            bottom:true,
            right:false,
            top:true
        },0.5),
        material:"iron",
        assets:{
            particles:"metal_particle",
            particles_tint:0x00359f
        },
        floor_image:[
            {
                image:"container_floor_2",
                position:v2.new(0,0),
                hotspot:v2.new(.5,.5),
                scale:2,
                tint:0x00359f
            }
        ]
    } satisfies BuildingDef,
}
Buildings.insert(
    mergeDeep({},Templates.container_1) as BuildingDef,
    mergeDeep({},Templates.container_2) as BuildingDef
)