import { v2, Vec2 } from "common/scripts/engine/geometry.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { CircleHitbox2D } from "common/scripts/engine/hitbox.ts";
import { type Player } from "./player.ts";
import { random } from "common/scripts/engine/random.ts";
import { BadgeDef, Badges } from "common/scripts/definitions/loadout/badges.ts";
import { NetStream } from "common/scripts/engine/stream.ts";


export class PlayerBody extends ServerGameObject{
    stringType:string="player_body"
    numberType: number=8

    player_name:string=""
    player_badge:string=""

    badge?:BadgeDef

    velocity:Vec2
    old_pos:Vec2=v2.new(-1,-1)

    constructor(angle:number=random.rad(),speed:number=8){
        super()
        this.velocity=v2.scale(v2.from_RadAngle(angle),speed)
    }

    fuse_delay:number=0
    update(dt:number): void {
        if(!v2.is(this.old_pos,this.position)){
            this.manager.cells.updateObject(this)
            this.dirtyPart=true
            this.old_pos=v2.duplicate(this.position)
            this.game.map.clamp_hitbox(this.hb)
        }
        this.position=v2.add(this.position,v2.scale(this.velocity,dt))
        this.velocity=v2.scale(this.velocity,1/(1+dt*3))
    }
    override interact(_user: Player): void {
    }
    create(args: {position:Vec2,owner_name:string,owner_badge:string}): void {
        this.hb=new CircleHitbox2D(args.position,0.4)
        this.player_name=args.owner_name
        this.player_badge=args.owner_badge
        this.dirty=true
        this.dirtyPart=true
        if(this.player_badge!=""){
            this.badge=Badges.getFromString(this.player_badge)
        }
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writePosition(this.position)
        if(full){
            stream.writeStringSized(30,this.player_name)
            stream.writeUint16(this.badge?this.badge.idNumber!+1:0)
        }
    }
}