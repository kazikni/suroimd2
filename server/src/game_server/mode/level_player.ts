import { cloneDeep, mergeDeep, SignalManager } from "common/scripts/engine/utils.ts";
import { Game } from "../others/game.ts";
import { EnemyDef, LevelDefinition } from "common/scripts/config/level_definition.ts";
import { type Player } from "../gameObjects/player.ts";
import { GamemodeManager, SoloGamemodeManager } from "./modeManager.ts";
import { MapDef, Maps } from "common/scripts/definitions/maps/base.ts";
import { Gamemodes } from "./gamemode.ts";
import { v2m, Vec2 } from "common/scripts/engine/geometry.ts";
import { EnemyNPCAI } from "../player/enemy_npc_ai.ts";
import { BattleRoyaleBot } from "../player/enemy_bot_ai.ts";
import { FloorType } from "common/scripts/others/terrain.ts";
import { SpawnModeType } from "common/scripts/others/constants.ts";
export class CampaignGamemodeManager extends GamemodeManager{
    player:LevelPlayer
    level:LevelDefinition

    npcs_count=0
    constructor(game:Game,player:LevelPlayer,level:LevelDefinition){
        super(game)
        this.player=player
        this.level=level
    }
    can_join():boolean{
        return true
    }
    can_down(player:Player):boolean{
        return false
        //return player.is_npc
    }
    on_start():void{

    }
    start_rules():boolean{
        return true
    }
    override get_player_spawn_position(player: Player): Vec2 | undefined {
        if(!player.is_npc){
            if(this.level.player.start_position)return this.level.player.start_position
        }
        return super.get_player_spawn_position(player)

    }
    on_player_join(player:Player):void{
        if(!player.is_npc){
            if(this.level.player.name)player.name=this.level.player.name
            if(this.level.player.inventory){
                player.inventory.load_preset(this.level.player.inventory)
            }
        }
    }
    on_player_die(player:Player):void{
        if(player.is_npc){
            this.npcs_count--
            if(this.npcs_count<=0)this.game.finish()
        }
    }
    is_ally(a:Player,b:Player):boolean{
        return a.is_npc===b.is_npc
    }
    generate_map(lobby:boolean):void{
        if(!this.level.map.def){
            this.game.map.generate(Maps[this.game.gamemode.game.map])
        }else if(typeof this.level.map.def==="string"){
            this.game.map.generate(Maps[this.level.map.def],this.level.map.seed)
        }else{
            const def=mergeDeep({},this.level.map.def,Maps[this.level.map.def.base]) as MapDef
            this.game.map.generate(def,this.level.map.seed)
        }
    }
    generate_enemy(def:EnemyDef,name?:string){
        const npc=this.game.add_npc(name)
        npc.ai=new EnemyNPCAI(npc)

        if(def.inventory)npc.inventory.load_preset(def.inventory)
        this.npcs_count++
        if(def.ia.params)npc.ai.params=cloneDeep(def.ia.params)
        return npc
    }
    override begin_after():void{
        switch(this.level.objective.type){
            case "kill_all_enemies":{
                for(const e of this.level.objective.enemies){
                    const count=e.count??1
                    
                    let def:EnemyDef|undefined
                    if(typeof e.def==="string"){
                        def=(this.level.definitions?.enemies)?(this.level.definitions?.enemies[e.def].normal):undefined
                    }else{
                        def=e.def
                    }
                    if(!def)continue
                    for(let i=0;i<count;i++){
                        const npc=this.generate_enemy(def,e.name)
                        if(e.position)v2m.set(npc.position,e.position.x,e.position.y)
                        else{
                            const pos=this.game.map.getRandomPosition(npc.base_hitbox,npc.id,npc.layer,{
                                type:SpawnModeType.whitelist,
                                list:[FloorType.Grass,FloorType.Snow,FloorType.Sand],
                            },this.game.map.random)
                            if(pos)npc.position=pos
                        }
                    }
                }
                break
            }
        }
    }
}
export class LevelPlayer {
    game:Game
    signals:SignalManager
    level!:LevelDefinition
    constructor(game:Game){
        this.game=game
        this.signals=new SignalManager()
        this.signals.emit("init", this)
    }
    begin(level:LevelDefinition){
        this.level=level
        this.signals.emit("level_begin", this)

        if(level.gamemode){
            this.game.gamemode=Gamemodes[level.gamemode]
        }
        switch(level.objective.type){
            case "battle_royale":
                this.game.modeManager=new SoloGamemodeManager(this.game)
                break
            default:
                this.game.modeManager=new CampaignGamemodeManager(this.game, this,level)
                break
        }
    }
    begin_after(){
        this.signals.emit("begin_after", this)
        const level=this.level
        switch(level.objective.type){
            case "battle_royale":
                for(let i=0;i<level.objective.players.count;i++){
                    const pp=this.game.add_bot()
                    const ai=new BattleRoyaleBot(pp)
                    pp.ai=ai
                }
                break
            default:
                break
        }
    }
}