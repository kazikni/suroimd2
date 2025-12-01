import { v2 } from "../../engine/geometry.ts";
import { CircleHitbox2D,Hitbox2D,Definitions,Definition, RotationMode, FrameTransform } from "../../engine/mod.ts";
import { Spawn, SpawnMode, zIndexes } from "../../others/constants.ts";
import { RectHitbox2D } from "../../engine/hitbox.ts";

export interface ObstacleBehaviorDoor{
    type:0,
    open_delay?:number
    cant_close?:boolean
    open_duration:number
    offset:number
}
export interface ObstacleDoorStatus{
    open:-1|0|1
    locked:boolean
}
export interface ObstacleDef extends Definition{
    health:number
    hitbox?:Hitbox2D
    spawnHitbox?:Hitbox2D
    no_collision?:boolean
    no_bullet_collision?:boolean
    invisibleOnMap?:boolean
    scale?:{
        min?:number
        max?:number
        destroy?:number
    }
    frame_transform?:FrameTransform
    frame?:{
        base?:string
        dead?:string
        particle?:string
    }
    particles?:{
        variations?:number
        tint?:number
    }
    variations?:number
    biome_skins?:string[]
    zIndex?:number
    rotationMode?:number

    onDestroyExplosion?:string
    material?:string

    lootTable?:string

    interactDestroy?:boolean
    reflect_bullets?:boolean

    spawnMode:SpawnMode

    sounds?:{
        hit:string
        break:string
        hit_variations?:number
    }

    expanded_behavior?:(
        ObstacleBehaviorDoor
    )
}
export interface MaterialDef{
    sounds:string
    hit_variations?:number
}
export const Materials:Record<string,MaterialDef>={
    tree:{
        sounds:"tree",
        hit_variations:2
    },
    stone:{
        sounds:"stone",
        hit_variations:2
    },
    bush:{
        sounds:"bush",
        hit_variations:2
    },
    metal:{
        sounds:"metal",
        hit_variations:2
    },
    wood:{
        sounds:"wood",
        hit_variations:2
    },
    iron:{
        sounds:"iron",
        hit_variations:2
    },
}

export const Obstacles=new Definitions<ObstacleDef,null>((_v)=>{})
Obstacles.insert(
    {
        idString:"stone",
        health:170,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.82),
        scale:{
            destroy:0.7,
            min:0.7,
            max:1.1
        },
        frame:{
            particle:"stone_particle",
        },
        biome_skins:[
            "snow"
        ],
        frame_transform:{
            scale:2
        },
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles1,
        material:"stone",
        particles:{
            variations:2
        },
        spawnMode:Spawn.grass,
        variations:2,
    },
    {
        idString:"barrel",
        health:100,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.57),
        scale:{
            destroy:0.68
        },
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles1,
        onDestroyExplosion:"barrel_explosion",
        material:"metal",
        reflect_bullets:true,
        frame:{
            particle:"metal_particle"
        },
        particles:{
            tint:0x484848
        },
        spawnMode:Spawn.grass
    },
    {
        idString:"oak_tree",
        health:120,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.4),
        spawnHitbox:new CircleHitbox2D(v2.new(0,0),0.6),
        scale:{
            destroy:0.9,
            max:1.2,
            min:1
        },
        frame_transform:{
            scale:2
        },
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles4,
        material:"tree",
        biome_skins:["snow"],
        frame:{
            particle:"oak_tree_particle"
        },
        spawnMode:Spawn.grass
    },
    {
        idString:"wood_crate",
        health:70,
        hitbox:new RectHitbox2D(v2.new(-0.71,-0.71),v2.new(0.71,0.71)),
        scale:{
            destroy:0.6,
        },
        frame_transform:{
            scale:2,
            hotspot:v2.new(0,0)
        },
        rotationMode:RotationMode.null,
        zIndex:zIndexes.Obstacles3,
        material:"wood",
        interactDestroy:true,
        lootTable:"wood_crate",
        frame:{
            particle:"plank_particle"
        },
        particles:{
            tint:0x583b08
        },
        spawnMode:Spawn.grass
    },
    {
        idString:"copper_crate",
        health:160,
        hitbox:new RectHitbox2D(v2.new(-0.71,-0.71),v2.new(0.71,0.71)),//new HitboxGroup2D(new RectHitbox2D(v2.new(-0.6,-0.6),v2.new(0.6,0.6))),//
        scale:{
            destroy:0.6,
        },
        frame_transform:{
            scale:2,
            hotspot:v2.new(0,0)
        },
        rotationMode:RotationMode.null,
        zIndex:zIndexes.Obstacles3,
        material:"iron", //TODO Copper Material
        reflect_bullets:true,
        lootTable:"copper_crate",
        frame:{
            particle:"metal_particle"
        },
        particles:{
            tint:0xcc742d
        },
        spawnMode:Spawn.grass
    },
    {
        idString:"iron_crate", //Airdrop
        health:170,
        hitbox:new RectHitbox2D(v2.new(-0.71,-0.71),v2.new(0.71,0.71)),
        scale:{
            destroy:0.8,
        },
        frame_transform:{
            hotspot:v2.new(0,0),
            scale:2,
        },
        rotationMode:RotationMode.null,
        zIndex:zIndexes.Obstacles3,
        material:"iron",
        reflect_bullets:true,
        lootTable:"iron_crate",
        frame:{
            particle:"metal_particle"
        },
        particles:{
            tint:0x656877
        },
        spawnMode:Spawn.grass
    },
    {
        idString:"gold_crate", //Gold Airdrop
        health:180,
        frame_transform:{
            hotspot:v2.new(0,0),
            scale:2,
        },
        hitbox:new RectHitbox2D(v2.new(-0.71,-0.71),v2.new(0.71,0.71)),
        scale:{
            destroy:0.8
        },
        rotationMode:RotationMode.null,
        zIndex:zIndexes.Obstacles3,
        material:"iron",
        reflect_bullets:true,
        lootTable:"gold_crate",
        frame:{
            particle:"metal_particle"
        },
        particles:{
            tint:0xffd92b
        },
        spawnMode:Spawn.grass
    },
    {
        idString:"bush",
        health:70,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.7),
        no_collision:true,
        scale:{
            destroy:0.8
        },
        frame_transform:{
            scale:2
        },
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles3,
        material:"bush",
        frame:{
            particle:"leaf_01_particle_1"
        },
        biome_skins:["snow"],
        spawnMode:Spawn.grass
    },
    {
        idString:"wood_door",
        health:180,
        hitbox:new RectHitbox2D(v2.new(-0.87,-0.15),v2.new(0.87,0.15)),
        frame_transform:{
            hotspot:v2.new(0.1,.5),
            position:v2.new(0.13,0.15),
            scale:1.5
        },
        rotationMode:RotationMode.limited,
        zIndex:zIndexes.Obstacles3,
        material:"tree",
        spawnMode:Spawn.grass,
        expanded_behavior:{
            type:0,
            open_duration:0.15,
            offset:0
        }
    },

    //Christmas
    {
        idString:"christmas_tree",
        health:300,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.6),
        spawnHitbox:new CircleHitbox2D(v2.new(0,0),1),
        scale:{
            destroy:0.9,
            max:1.2,
            min:1
        },
        frame_transform:{
            scale:2
        },
        lootTable:"christmas_tree",
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles4,
        material:"tree",
        frame:{
            particle:"oak_tree_particle"
        },
        spawnMode:Spawn.grass
    },
)