import { random } from "common/scripts/engine/random.ts";
import { type Player } from "../gameObjects/player.ts";
import { type Game } from "../others/game.ts";
import { GroupManager, TeamsManager } from "./teams.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";
import { Vehicle } from "../gameObjects/vehicle.ts";
import { Angle, v2, Vec2 } from "common/scripts/engine/geometry.ts";
import { Vehicles } from "common/scripts/definitions/objects/vehicles.ts";
import { Layers, SpawnModeType } from "common/scripts/others/constants.ts";
import { Maps } from "common/scripts/definitions/maps/base.ts";
import { FloorType } from "common/scripts/others/terrain.ts";
export abstract class GamemodeManager{
    game:Game
    kill_leader?:Player
    constructor(game:Game){
        this.game=game
    }
    abstract can_join():boolean
    abstract can_down(player:Player):boolean
    abstract on_start():void
    on_finish(){
        this.game.addTimeout(()=>{
            for(const p of this.game.livingPlayers){
                p.earned.win=1
                p.send_game_over(true)
            }
            this.game.killing_game=true
            console.log(`Game ${this.game.id} Fineshed`)
        },2)
    }
    abstract start_rules():boolean
    abstract on_player_join(player:Player):void
    abstract on_player_die(player:Player):void
    get_player_spawn_position(player:Player):Vec2|undefined{
        return this.game.map.getRandomPosition(player.base_hitbox,player.id,player.layer,{
            type:SpawnModeType.whitelist,
            list:[FloorType.Grass,FloorType.Snow,FloorType.Sand],
        },this.game.map.random)
    }
    abstract is_ally(a:Player,b:Player):boolean
    abstract generate_map(lobby:boolean):void
    begin_after():void{
        
    }
}
export class SoloGamemodeManager extends GamemodeManager{
    closed:boolean=false
    battle_plane?:Vehicle
    battle_plane_enabled:boolean=true
    constructor(game:Game){
        super(game)
        this.battle_plane_enabled=this.battle_plane_enabled&&!game.debug.deenable_lobby&&!game.gamemode.game.no_battle_plane
    }
    can_down(_player:Player):boolean{
        return false
    }
    can_join():boolean{
        return !this.closed&&this.game.livingPlayers.length<this.game.gamemode.player.max
    }
    call_battle_plane(direction:number=Angle.deg2rad(45)){
        this.battle_plane=this.game.add_vehicle(v2.new(0,0),Vehicles.getFromString("battle_plane"),Layers.Normal)
        this.closed=true
        this.game.pvpEnabled=true
        this.battle_plane.velocity=v2.scale(v2.from_RadAngle(direction),10)
        this.battle_plane.angle=direction
        for(const p of this.game.players){
            p.clear()
            if(!p.dead){
                for(const s of this.battle_plane.seats){
                    if(!s.player){
                        s.set_player(p)
                        break
                    }
                }
            }
        }
    }
    on_start(){
        if(this.battle_plane_enabled){
            this.call_battle_plane()
        }else{
            this.game.pvpEnabled=true
            this.game.addTimeout(()=>{
                this.closed=true
                console.log(`Game ${this.game.id} Clossed`)
            },50)
        }
    }
    start_rules():boolean{
        return this.game.livingPlayers.length>1
    }
    on_player_join(_p:Player){
        if(!this.game.started&&this.game.livingPlayers.length>1){
            this.game.addTimeout(this.game.start.bind(this.game),3)
        }
    }
    on_player_die(_p:Player){
        if(this.game.livingPlayers.length<=1){
            this.game.finish()
        }
        this.game.living_count_dirty=true
    }
    is_ally(_a:Player,_b:Player):boolean{
        return false
    }
    override generate_map(lobby: boolean): void {
        if(lobby){
            this.game.map.generate(Maps[this.game.gamemode.game.lobby])
        }else{
            this.game.map.generate(Maps[this.game.gamemode.game.map])
        }
    }
}
export class TeamsGamemodeManager extends SoloGamemodeManager{
    teamsManager:TeamsManager
    team_size:number
    constructor(team_size:number,game:Game){
        super(game)
        this.team_size=team_size
        this.teamsManager=new TeamsManager()
    }
    override can_down(player:Player):boolean{
        return (player.team&&player.team.get_not_downed_players().length>1)!
    }
    set_team_for_player(p:Player){
        if(p.team===undefined){
            let t=this.teamsManager.get_perfect_team(this.team_size,p.groupId)
            if(!t){
                t=this.teamsManager.add_team()
            }else if(t.players.length>0){
                p.position=random.choose(t.players).position
            }
            t.add_player(p)
        }
    }
    override on_player_join(p:Player){
        this.set_team_for_player(p)
        if(!this.game.started&&this.teamsManager.get_living_teams().length>1){
            this.game.addTimeout(this.game.start.bind(this.game),3)
        }
    }
    override on_player_die(p:Player){
        if(p.team){
            for(const pp of p.team.get_downed_players()){
                pp.kill({amount:pp.health,critical:false,position:pp.position,reason:DamageReason.Bleend,owner:pp.downedBy,source:pp.downedBySource})
            }
        }
        if(this.teamsManager.get_living_teams().length<=1){
            this.game.finish()
        }
        this.game.living_count_dirty=true
    }
    override is_ally(a:Player,b:Player):boolean{
        return a.teamId===b.teamId
    }
}
export class GroupGamemodeManager extends TeamsGamemodeManager{
    groupsManager:GroupManager=new GroupManager()
    f=0
    groups_count:number

    constructor(team_size:number=4,groups_count:number=2,game:Game){
        super(team_size,game)
        this.groups_count=groups_count
    }
    override can_down(player:Player):boolean{
        return super.can_down(player)&&(player.team&&player.team.get_not_downed_players().length>1)!
    }
    override on_player_join(p:Player){
        let g=this.groupsManager.groups[this.f]
        if(!g){
            g=this.groupsManager.add_group()
        }
        g.add_player(p)
        this.f++
        if(this.f>=this.groups_count){
            this.f=0
        }
        super.set_team_for_player(p)
        if(p.team)p.team.group=g.id
        if(!this.game.started&&this.teamsManager.get_living_teams().length>1){
            this.game.addTimeout(this.game.start.bind(this.game),3)
        }
    }
    override on_player_die(p:Player){
        if(p.team){
            for(const pp of p.team.get_downed_players()){
                pp.kill({amount:pp.health,critical:false,position:pp.position,reason:DamageReason.Bleend,owner:pp.downedBy,source:pp.downedBySource})
            }
        }
        if(this.teamsManager.get_living_teams().length<=1){
            this.game.finish()
        }
        this.game.living_count_dirty=true
    }
    override is_ally(a:Player,b:Player):boolean{
        return a.groupId===b.groupId
    }
}