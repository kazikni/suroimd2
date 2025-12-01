import { Hitbox2D, NetStream, NullHitbox2D, NullVec2, PolygonHitbox2D, RectHitbox2D, SeededRandom, Vec2, jaggedRectangle, random, v2 } from "common/scripts/engine/mod.ts";
import { type Game } from "./game.ts";
import { Obstacle } from "../gameObjects/obstacle.ts";
import { ObstacleDef, Obstacles } from "common/scripts/definitions/objects/obstacles.ts"
import { IslandDef, MapDef } from "common/scripts/definitions/maps/base.ts"
import { MapPacket,MapObjectEncode } from "common/scripts/packets/map_packet.ts"
import { FloorType, generate_rivers, TerrainManager } from "common/scripts/others/terrain.ts"
import { Layers, SpawnMode, SpawnModeType } from "common/scripts/others/constants.ts"
import { CircleHitbox2D } from "common/scripts/engine/hitbox.ts"
import { Creatures } from "common/scripts/definitions/objects/creatures.ts"
import {BuildingDef, Buildings} from "common/scripts/definitions/objects/buildings_base.ts"
import { Building } from "../gameObjects/building.ts";
export type map_gen_algorithm=(map:GameMap,random:SeededRandom)=>void
export const generation={
    island:(def:IslandDef)=>{
        return (map:GameMap,random:SeededRandom)=>{
            //Terrain
            map.size=def.size
            map.terrain.add_floor(def.terrain.base,new RectHitbox2D(v2.new(0,0),v2.new(map.size.x,map.size.y)),Layers.Normal,false)
            let cp=0
            const hitboxes:Hitbox2D[]=[]
            for(const f of def.terrain.floors.sort()){
                cp+=f.padding
                const min=v2.new(cp,cp),max=v2.new(map.size.x-cp,map.size.y-cp)
                const hb=new PolygonHitbox2D(jaggedRectangle(min,max,f.spacing,f.variation,random))
                hitboxes.push(hb)
                map.terrain.add_floor(f.type,hb,Layers.Normal,true,true,hb)
            }
            if(def.terrain.rivers){
                const r=hitboxes[def.terrain.rivers.spawn_floor].to_rect()
                const rivers=generate_rivers(new RectHitbox2D(r.min,r.max),def.terrain.rivers.defs,def.terrain.rivers.divisions,random,def.terrain.rivers.expansion,[
                    {name:"main",padding:0}
                ])
                for(const r of rivers){
                    map.terrain.add_floor(def.terrain.rivers.floor??FloorType.Water,r.collisions.main,Layers.Normal)
                }
            }
            for(const spawn of def.spawn??[]){
                for(const item of spawn){
                    const count=random.irandom1(item.count)
                    if(Creatures.exist(item.id)){
                        const def=Creatures.getFromString(item.id)
                        for(let idx=0;idx<count;idx++){
                            const obj=map.game.add_creature(v2.new(0,0),def,item.layer)
                            const pos=map.getRandomPosition(obj.hb,obj.id,obj.layer,item.spawn??def.spawn??{
                                type:SpawnModeType.whitelist,
                                list:[FloorType.Grass,FloorType.Ice]
                            },random)
                            if(!pos){
                                obj.destroy()
                                break
                            }
                            obj.position=pos
                        }
                    }else if(Obstacles.exist(item.id)){
                        const def=Obstacles.getFromString(item.id)
                        for(let idx=0;idx<count;idx++){
                            const obj=map.generate_obstacle(def,random,item.spawn,item.layer)
                            if(!obj)break
                        }
                    }else if(Buildings.exist(item.id)){
                        const def=Buildings.getFromString(item.id)
                        for(let idx=0;idx<count;idx++){
                            const obj=map.generate_building(def,random,item.spawn,item.layer)
                            if(!obj)break
                        }
                    }
                }
            }
            for(const l of def.ground_loot??[]){
                const count=random.irandom1(l.count)
                const layer=l.layer??Layers.Normal
                for(let idx=0;idx<count;idx++){
                    const loot=map.game.loot_tables.get_loot(l.table,{withammo:true})
                    const pos:Vec2|undefined=map.getRandomPosition(new CircleHitbox2D(v2.new(0,0),0.6),-1,layer,{
                        type:SpawnModeType.blacklist,
                        list:[map.def.default_floor??FloorType.Water]
                    },random)
                    if(!pos)break
                    for(const ll of loot){
                        map.game.add_loot(pos,ll.item,ll.count)
                    }
                }
            }
        }
    }
}

export class GameMap{
    size:Vec2
    game:Game
    constructor(game:Game,_seed:number=0){
        this.size=v2.new(10,10)
        this.game=game
    }
    map_packet_stream:NetStream=new NetStream(new ArrayBuffer(400*1024))
    terrain:TerrainManager=new TerrainManager()
    random!:SeededRandom
    objects:Obstacle[]=[]
    getRandomPosition(hitbox:Hitbox2D,id:number,layer:number=Layers.Normal,mode:SpawnMode,random:SeededRandom,gp?:(hitbox:Hitbox2D,map:GameMap)=>Vec2,valid?:(hitbox:Hitbox2D,id:number,layer:number,map:GameMap)=>boolean,maxAttempts:number=100):Vec2|undefined{
        let pos:Vec2|undefined=undefined
        let attempt=0
        if(!valid){
            valid=(hitbox:Hitbox2D,id:number,layer:number,map:GameMap)=>{
                const objs=map.game.scene.objects.cells.get_objects(hitbox,layer)
                for(const o of objs){
                    if(!(o.id===id&&o.layer===layer)&&hb.collidingWith((o as Obstacle).spawnHitbox??o.hb)){
                        return false
                    }
                }
                switch(mode.type){
                    case SpawnModeType.any:
                        break
                    case SpawnModeType.blacklist:{
                        const floor=this.terrain.get_floor_type(hb.center(),layer,FloorType.Water)
                        return !mode.list.includes(floor)
                    }
                        
                    case SpawnModeType.whitelist:{
                        const floor=this.terrain.get_floor_type(hb.center(),layer,FloorType.Water)
                        return mode.list.includes(floor)
                    }
                }
                return true
            }
        }
        if(!gp){
            gp=(_hitbox:Hitbox2D,map:GameMap)=>{
                return v2.random2_s(NullVec2,map.size,random)
            }
        }
        const hb=hitbox.clone()
        const hc=hitbox.clone()
        while(!pos){
            if(attempt>=maxAttempts)break
            pos=gp!(hc,this)
            hb.translate(pos)
            if(!valid!(hb,id,layer,this)){
                pos=undefined
            }
            attempt++
        }
        return pos
    }
    add_obstacle(def:ObstacleDef,rotation?:number):Obstacle{
        const o=this.game.scene.objects.add_object(new Obstacle(),Layers.Normal,undefined,{
            def:def,
            rotation
        }) as Obstacle
        this.objects.push(o)
        return o
    }
    clamp_hitbox(hb:Hitbox2D){
        hb.clamp(v2.new(0,0),this.size)
    }
    generate_obstacle(def:ObstacleDef,random:SeededRandom,spawn?:SpawnMode,layer?:Layers):Obstacle|undefined{
        const o=this.add_obstacle(def)
        const p=this.getRandomPosition(def.spawnHitbox?def.spawnHitbox.clone():(def.hitbox?def.hitbox.clone():new NullHitbox2D(v2.new(0,0))),o.id,layer??o.layer,spawn??o.def.spawnMode,random)
        if(!p){
            o.destroy()
            return undefined
        }
        o.set_position(p)
        o.manager.cells.updateObject(o)
        return o
    }
    generate_building(def:BuildingDef,random:SeededRandom,spawn?:SpawnMode,layer?:Layers):Building|undefined{
        const b=new Building()
        b.set_definition(def)
        b.layer=layer??Layers.Normal
        const p=this.getRandomPosition(def.spawnHitbox?def.spawnHitbox.clone():(def.hitbox?def.hitbox.clone():new NullHitbox2D(v2.new(0,0))),b.id,layer??b.layer,spawn??b.def.spawnMode,random)
        if(!p){
            b.destroy()
            return undefined
        }
        
        this.game.scene.objects.add_object(b,b.layer,undefined,{
            def:def
        })
        b.generate(p,0)
        return b
    }
    def!:MapDef
    generate(definition:MapDef,seed:number=random.float(0,231412)){
        const random=new SeededRandom(seed)
        this.random=random
        this.def=definition

        this.game.loot_tables.clear()
        this.game.loot_tables.add_tables(definition.loot_tables)

        if(definition.generation.island)generation.island(definition.generation.island)(this,random)

        this.game.clients.packets_manager.encode(this.encode(seed),this.map_packet_stream)
    }
    generate_with_algorithm(algorithm:map_gen_algorithm,seed:number=random.float(0,231412)){
        const random=new SeededRandom(seed)
        this.random=random
        algorithm(this,random)
        this.game.clients.packets_manager.encode(this.encode(seed),this.map_packet_stream)
    }
    add_building(def:BuildingDef,position:Vec2,side:0|1|2|3,layer:number=Layers.Normal){
        const b=new Building()
        this.game.scene.objects.add_object(b,layer,undefined,{})
        b.set_definition(def)
        b.generate(position,side)
    }
    encode(seed:number):MapPacket{
        const p=new MapPacket()
        const objects:MapObjectEncode[]=[]
        for(const o of this.objects){
            if(!o.def.invisibleOnMap){
                objects.push({
                    def:o.def.idNumber!,
                    position:o.position,
                    rotation:o.rotation,
                    scale:o.scale,
                    type:0,
                    variation:o.variation
                })
            }
        }
        p.map={
            terrain:this.terrain.floors,
            size:this.size,
            seed:seed,
            objects,
            biome:this.def.biome
        }
        return p
    }
}