import { cloneDeep, SignalManager } from "common/scripts/engine/utils.ts";
import { Game } from "../others/game.ts";
import { LevelDefinition } from "common/scripts/config/level_definition.ts";
import { type Player } from "../gameObjects/player.ts";
import { GamemodeManager, SoloGamemodeManager } from "./modeManager.ts";
import { Maps } from "common/scripts/definitions/maps/base.ts";
import { Gamemodes } from "./gamemode.ts";
import { SimpleBotAi } from "../player/simple_bot_ai.ts";
import { v2m } from "common/scripts/engine/geometry.ts";
import { EnemyNPCBotAi } from "../player/enemy_npc_ai.ts";
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
    }
    on_start():void{

    }
    start_rules():boolean{
        return true
    }
    on_player_join(player:Player):void{

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
            this.game.map.generate(this.level.map.def,this.level.map.seed)
        }
    }
    override begin_after():void{
        switch(this.level.objective.type){
            case "kill_all_enemies":{
                for(const e of this.level.objective.enemies){
                    const npc=this.game.add_npc(e.name)
                    npc.ai=new EnemyNPCBotAi()
                    v2m.set(npc.position,e.position.x,e.position.y)
                    if(e.inventory)npc.inventory.load_preset(e.inventory)
                    this.npcs_count++
                    if(e.ia.params)npc.ai.params=cloneDeep(e.ia.params)
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
                    const ai=new SimpleBotAi()
                    pp.ai=ai
                }
                break
            default:
                break
        }
    }
}