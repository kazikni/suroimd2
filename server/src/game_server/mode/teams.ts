import { type Player } from "../gameObjects/player.ts";

export class Group{
    players:Player[]=[]
    id:number=0
    add_player(p:Player){
        p.group=this
        p.groupId=this.id
        this.players.push(p)
    }
    get_living_players():Player[]{
        return this.players.filter((p)=>!p.dead)
    }
    get_not_downed_players():Player[]{
        return this.players.filter((p)=>!p.dead&&!p.downed)
    }
    get_downed_players():Player[]{
        return this.players.filter((p)=>!p.dead&&p.downed)
    }
    constructor(){

    }
}
export class Team extends Group{
    group=0
    override add_player(p:Player){
        p.team=this
        p.groupId=this.id
        this.players.push(p)
    }
}
export class GroupManager{
    groups:Group[]=[]
    constructor(){

    }
    get_living_groups():Group[]{
        return this.groups.filter((t)=>(t&&t!.get_living_players().length>0))
    }
    add_group():Group{
        this.groups.push(new Group())
        const g=this.groups[this.groups.length-1]
        g.id=this.groups.length-1
        return g
    }
}
export class TeamsManager{
    teams:Partial<Record<number,Team>>={}
    constructor(){

    }
    get_perfect_team(max_team_size:number,group=0):Team|undefined{
        for(const t of Object.values(this.teams)){
            if(t&&t.players.length<max_team_size&&t.group===group)return t
        }
        return undefined
    }
    get_living_teams():Team[]{
        return Object.values(this.teams).filter((t)=>(t&&t!.get_living_players().length>0)) as (Team[])
    }
    add_team(id?:number):Team{
        if(!id){
            id=Object.keys(this.teams).length
        }
        this.teams[id]=new Team()
        this.teams[id]!.id=id
        return this.teams[id]!
    }
}