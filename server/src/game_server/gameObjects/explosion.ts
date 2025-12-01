import { CircleHitbox2D, NetStream, random, v2, Vec2 } from "common/scripts/engine/mod.ts"
import { Player } from "./player.ts";
import { ExplosionDef } from "common/scripts/definitions/objects/explosions.ts";
import { Obstacle } from "./obstacle.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { DamageSourceDef } from "common/scripts/definitions/alldefs.ts";
import { Creature } from "./creature.ts";
import { Loot } from "./loot.ts";
import { Projectiles } from "common/scripts/definitions/objects/projectiles.ts";

export class Explosion extends ServerGameObject{
    stringType:string="explosion"
    numberType: number=5
    defs!:ExplosionDef

    owner?:Player
    source?:DamageSourceDef

    radius:number=2
    constructor(){
        super()
        this.netSync.deletion=false
    }
    delay:number=2
    interact(_user: Player): void {
        return
    }
    update(_dt:number): void {
        if(this.delay==0){
            this.manager.cells.updateObject(this)
            if(this.defs.bullet){
                for(let i=0;i<this.defs.bullet.count;i++){
                    this.game.add_bullet(this.position,random.rad(),this.defs.bullet.def,this.owner,undefined,this.defs)
                }
            }
            if(this.defs.projectiles){
                for(let i=0;i<this.defs.projectiles.count;i++){
                    const p=this.game.add_projectile(v2.duplicate(this.position),Projectiles.getFromString(this.defs.projectiles.def),this.owner,this.layer)
                    p.velocity=v2.random(-this.defs.projectiles.speed,this.defs.projectiles.speed)
                    p.angularVelocity=this.defs.projectiles.angSpeed+(Math.random()*this.defs.projectiles.randomAng)
                }
            }

            const objs=this.manager.cells.get_objects(this.hb,this.layer)
            const damageCollisions:ServerGameObject[]=[]
            for(const obj of objs){
                switch((obj as ServerGameObject).stringType){
                    case "player":
                        if(obj.hb&&this.hb.collidingWith(obj.hb)){
                            damageCollisions.push(obj)
                        }
                        break
                    case "creature":
                        if(obj.hb&&this.hb.collidingWith(obj.hb)){
                            damageCollisions.push(obj)
                        }
                        break
                    case "loot":
                        if(obj.hb.collidingWith(this.hb)){
                            damageCollisions.push(obj)
                        }
                        break
                    case "obstacle":
                        if(obj.hb&&this.hb.collidingWith(obj.hb)){
                            damageCollisions.push(obj)
                        }
                        break
                }
            }
            for(const obj of damageCollisions){
                switch(obj.stringType){
                    case "player":{
                        (obj as Player).damage({amount:this.defs.damage,reason:DamageReason.Explosion,source:this.source??this.defs,owner:this.owner,position:v2.duplicate(obj.position),critical:false})
                        break
                    }
                    case "creature":
                        (obj as Creature).damage({amount:this.defs.damage,reason:DamageReason.Explosion,source:this.source??this.defs,owner:this.owner,position:v2.duplicate(obj.position),critical:false})
                        break
                    case "obstacle":
                        (obj as Obstacle).damage({amount:this.defs.damage,reason:DamageReason.Explosion,source:this.source??this.defs,owner:this.owner,position:v2.duplicate(obj.position),critical:false})
                        break
                    case "loot":
                        (obj as Loot).push(Math.min(0,v2.distance(obj.position,this.position)-this.radius)*-6,v2.lookTo(this.position,obj.position))
                        break
                }
            }
            this.destroy()
        }else{
            this.delay--
        }
    }
    create(args: {defs:ExplosionDef,source?:DamageSourceDef,position:Vec2,owner?:Player}): void {
        this.defs=args.defs
        this.owner=args.owner
        this.source=args.source
        this.hb=new CircleHitbox2D(args.position,random.float(this.defs.size.min,this.defs.size.max)*2)
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writePosition(this.position)
            .writeFloat((this.hb as CircleHitbox2D).radius,0,20,3)
            .writeID(this.defs.idNumber!)
    }
}