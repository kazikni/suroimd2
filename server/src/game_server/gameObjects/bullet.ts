import {CircleHitbox2D, NetStream, NullVec2, Numeric, OverlapCollision2D, v2, v2m, Vec2 } from "common/scripts/engine/mod.ts"
import { BulletDef, BulletReflection, DamageReason } from "common/scripts/definitions/utils.ts";
import { Obstacle } from "./obstacle.ts";
import { Player } from "./player.ts";
import { Ammos } from "common/scripts/definitions/items/ammo.ts";
import { ServerGameObject } from "../others/gameObject.ts"; 
import { DamageSourceDef } from "common/scripts/definitions/alldefs.ts";
import { Creature } from "./creature.ts";
import { Explosions } from "common/scripts/definitions/objects/explosions.ts";
import { SideEffectType } from "common/scripts/definitions/player/effects.ts";
import { Building } from "./building.ts";

const SubSteps=3
export class Bullet extends ServerGameObject{
    velocity:Vec2
    dir:Vec2
    stringType:string="bullet"
    numberType: number=3
    defs!:BulletDef

    initialPosition!:Vec2
    maxDistance:number=0

    old_position:Vec2=v2.new(0,0)

    owner?:Player
    angle:number=0

    modifiers={
        speed:1,
        size:1,
    }

    critical:boolean=false
    source?:DamageSourceDef

    damage:number=0
    tticks:number=0

    reflectionCount:number=0
    constructor(){
        super()
        this.velocity=v2.new(0,0)
        this.dir=v2.new(0,0)
        this.netSync.deletion=false
    }
    interact(_user: Player): void {
      return
    }
    on_hit(){
        if(this.defs.on_hit_explosion){
            this.game.add_explosion(this.position,Explosions.getFromString(this.defs.on_hit_explosion),this.owner,this.source,this.layer)
        }
        this.destroy()
    }
    update(dt:number): void {
        if(v2.distance(this.initialPosition,this.position)>this.maxDistance){
            this.destroy()
        }
        this.old_position=v2.duplicate(this.position)
        this.tticks+=dt
        const disT=v2.distance(this.initialPosition,this.position)/this.maxDistance
        dt/=SubSteps
        for(let s=0;s<SubSteps;s++){
            v2m.add_component(this.position,this.velocity.x*dt,this.velocity.y*dt)
            this.manager.cells.updateObject(this)
            const objs=this.manager.cells.get_objects(this.hitbox,this.layer)
            for(const obj of objs){
                if(this.destroyed)break
                switch(obj.stringType){
                    case "player":{
                        if((obj as Player).hitbox&&!(obj as Player).dead&&(!this.owner||((obj as Player).id===this.owner.id&&this.reflectionCount>0)||(obj as Player).id!==this.owner.id)&&(this.hitbox.collidingWith(obj.hitbox)||obj.hitbox.colliding_with_line(this.old_position,this.position))&&!(obj as Player).parachute){
                            const dmg:number=this.damage
                            *(this.defs.falloff?Numeric.lerp(1,this.defs.falloff,disT):1)
                            *(this.critical?(this.defs.criticalMult??1.25):1);
                            (obj as Player).damage({amount:dmg,owner:this.owner,reason:DamageReason.Player,position:v2.duplicate(this.position),critical:this.critical,source:this.source as unknown as DamageSourceDef})
                            this.on_hit()
                            s=SubSteps
                            if(this.defs.effect){
                                for(const e of this.defs.effect){
                                    (obj as Player).side_effect({
                                        type:SideEffectType.AddEffect,
                                        duration:e.time,
                                        effect:e.id
                                    })
                                }
                            }
                            break
                        }
                        break
                    }
                    case "creature":{
                        if((obj as Creature).hitbox&&!(obj as Creature).dead&&(this.hitbox.collidingWith(obj.hitbox)||obj.hitbox.colliding_with_line(this.old_position,this.position))){
                            const dmg:number=this.damage
                            *(this.defs.falloff?Numeric.lerp(1,this.defs.falloff,disT):1)
                            *(this.critical?(this.defs.criticalMult??1.25):1);
                            (obj as Player).damage({amount:dmg,owner:this.owner,reason:DamageReason.Player,position:v2.duplicate(this.position),critical:this.critical,source:this.source as unknown as DamageSourceDef})
                            this.on_hit()
                            s=SubSteps
                            break
                        }
                        break
                    }
                    case "obstacle":
                        if((obj as Obstacle).def.no_bullet_collision)break
                        if((obj as Obstacle).hitbox&&!(obj as Obstacle).dead){
                            const col1=(obj as Obstacle).hitbox.overlapCollision(this.hitbox)
                            const main_col:OverlapCollision2D[]=[...col1]
                            //const col2 = (obj as Obstacle).hb.overlapLine(this.old_position,this.position)!
                            if(main_col.length===0)continue
                            let reflected=false
                            if(((obj as Obstacle).def.reflect_bullets||BulletReflection.All===this.defs.reflection)&&this.defs.reflection!==BulletReflection.None&&this.reflectionCount<3&&!this.defs.on_hit_explosion){
                                this.reflect(main_col[0].dir)
                                reflected=true
                            }
                            if(!(obj as Obstacle).def.imortal){
                                const od=(obj as Obstacle).health;
                                (obj as Obstacle).damage({amount:(this.damage*(this.defs.obstacleMult??1)),owner:this.owner,reason:DamageReason.Player,position:v2.duplicate(this.position),critical:this.critical,source:this.source as unknown as DamageSourceDef})
                                if((obj as Obstacle).dead&&!reflected){
                                    this.damage-=od*(this.defs.obstacleMult??1)
                                    if(this.damage>0){
                                        this.game.add_bullet(this.position,this.angle,this.defs,this.owner,this.ammo,this.source)
                                    }
                                }
                            }
                            this.on_hit()
                            s=SubSteps
                        }
                        break
                    case "building":
                        if((obj as Building).def.no_bullet_collision)break
                        if(obj.hitbox){
                            const col1=(obj as Building).hitbox.overlapCollision(this.hitbox)
                            //const col2 = (obj as Obstacle).hb.overlapLine(this.initialPosition,this.position)
                            const main_col:OverlapCollision2D[]=[...col1]
                            if(main_col.length===0)continue
                            if(((obj as Building).def.reflect_bullets||BulletReflection.All===this.defs.reflection)&&this.defs.reflection!==BulletReflection.None&&this.reflectionCount<3&&!this.defs.on_hit_explosion){
                                this.reflect(main_col[0].dir)
                            }
                            this.on_hit()
                            s=SubSteps
                        }
                        break
                }
            }
        }
    }
    ammo:string=""
    create(args: {defs:BulletDef,position:Vec2,owner:Player,ammo:string,critical?:boolean,source?:DamageSourceDef}): void {
        this.defs=args.defs
        this.base_hitbox=new CircleHitbox2D(NullVec2,this.defs.radius*this.modifiers.size)
        this.position=args.position
        this.initialPosition=this.position
        this.old_position=this.position
        this.maxDistance=this.defs.range/2.5

        const ad=args.ammo?Ammos.getFromString(args.ammo):undefined
        this.tracerColor=this.defs.tracer.color??(ad?ad.defaultTrail:0xffffff)
        this.projColor=this.defs.tracer.proj.color??(ad?ad.defaultProj:0xffffff)
        this.owner=args.owner
        this.critical=args.critical??(Math.random()<=0.15)
        this.source=args.source
        this.ammo=args.ammo

        this.damage=args.defs.damage
    }
    set_direction(angle:number){
        this.dir=v2.from_RadAngle(angle)
        this.velocity=v2.scale(this.dir,this.defs.speed*this.modifiers.speed)
        this.dirty=true
        this.angle=angle;
        (this.base_hitbox as CircleHitbox2D).radius=this.defs.radius*this.modifiers.size
    }
    reflect(normal: Vec2) {
        v2m.neg(normal)
        const dot = v2.dot(this.dir,normal)
        const reflected = {
            x: this.dir.x - 2 * dot * normal.x,
            y: this.dir.y - 2 * dot * normal.y,
        }

        const rotation = Math.atan2(reflected.y, reflected.x)

        v2m.add(this.position, this.position, reflected)

        const b = this.game.add_bullet(
            this.position,
            rotation,
            this.defs,
            this.owner,
            this.ammo,
            this.source
        )
        b.damage = this.damage / 2
        b.reflectionCount = this.reflectionCount + 1
    }

    override on_destroy(): void {
        delete this.game.bullets[this.id]
    }
    tracerColor:number=0
    projColor:number=0
    override encode(stream: NetStream, full: boolean): void {
        stream.writePosition(this.position)
        .writeFloat(this.tticks,0,100,2)
        if(full){
            stream.writePosition(this.initialPosition)
            .writeFloat32(this.maxDistance)
            .writeFloat((this.base_hitbox as CircleHitbox2D).radius,0,2,2)
            .writeFloat32(this.defs.speed*this.modifiers.speed)
            .writeRad(this.angle)
            .writeUint8(this.reflectionCount)
            .writeFloat(this.defs.tracer.width,0,100,3)
            .writeFloat(this.defs.tracer.height*this.modifiers.size,0,6,2)
            .writeUint32(this.tracerColor)
            .writeUint8(this.defs.tracer.proj.img)
            if(this.defs.tracer.proj.img>0){
                stream.writeFloat(this.defs.tracer.proj.width,0,6,2)
                .writeFloat(this.defs.tracer.proj.height,0,6,2)
                .writeUint32(this.projColor)
            }
            stream.writeUint8(this.defs.tracer.particles?.frame??0)
            .writeBooleanGroup(this.critical)
            .writeID(this.owner!.id)
        }
    }
}