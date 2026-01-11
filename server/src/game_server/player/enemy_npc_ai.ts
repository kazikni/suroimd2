import { Angle, v2, v2m, Vec2 } from "common/scripts/engine/geometry.ts"
import { random } from "common/scripts/engine/random.ts"
import { Player } from "../gameObjects/player.ts"
import { astar_path2d } from "common/scripts/engine/AI/pathfinding.ts"
import { Obstacle } from "../gameObjects/obstacle.ts"
import { Building } from "../gameObjects/building.ts"
import { BaseObject2D, GameObjectManager2D } from "common/scripts/engine/gameObject.ts"
import { Hitbox2D } from "common/scripts/engine/hitbox.ts"
import { InventoryItemType } from "common/scripts/definitions/utils.ts"
import { GunItem } from "./inventory.ts"
import { StatedBotAi } from "./simple_bot_ai.ts";
import { InputActionType } from "common/scripts/packets/action_packet.ts";
import { Emotes } from "common/scripts/definitions/loadout/emotes.ts";
import { DamageParams } from "../others/utils.ts";

type EnemyState =
    | "idle"
    | "walking"
    | "detecting"
    | "engaged"
    | "go_last_seen"

export class EnemyNPCAI extends StatedBotAi<EnemyState> {
    /* =======================
       INTERNAL STATE
    ======================= */
    state_duration=10

    protected path: Vec2[] = []
    protected pathIndex = 0

    protected seenPlayer?: Player
    protected lastSeenPos?: Vec2

    protected playerCheckTimer = 0

    override params = {
        random_speed: 0.35,
        path_speed: 1.0,

        detection_time: 0.25,
        reaction_time: 0.15,
        lose_time: 0.4,
        vision_distance: 10,

        shoot_angle_epsilon: 0.12,

        bravery: random.float(0, 1),
        accuracy: random.float(0.8, 1.2),
        greed: random.float(0, 1)
    }
    constructor(player:Player) {
        super(player)
        /*
        =======================
           STATE REGISTRATION
        =======================
        */
        this.stateHandlers = {
            idle: this.state_idle.bind(this),
            walking: this.state_walking.bind(this),
            detecting: this.state_detecting.bind(this),
            engaged: this.state_engaged.bind(this),
            go_last_seen: this.state_go_last_seen.bind(this),
        }
        this.setState("idle")
    }
    /*
    =======================
       HELPERS
    =======================
    */
    protected isAimAligned(self: Player, target: Vec2): boolean {
        const desired = Math.atan2(
            target.y - self.position.y,
            target.x - self.position.x
        )
        return Math.abs(
            Angle.delta_rad(self.rotation, desired)
        ) <= this.params.shoot_angle_epsilon
    }
    protected isPlayerVisible(self: Player, other: Player): boolean {
        const dist=v2.distance(self.position, other.position)
        if(other.dead || other.is_npc) return false
        if(dist>this.params.vision_distance) return false

        const angleToPlayer = v2.lookTo(self.position, other.position)
        const diff = Math.abs(Angle.delta_rad(self.rotation, angleToPlayer))
        if (diff > Math.PI / 2) return false

        const ray = self.manager.cells.ray(
            self.position,
            other.position,
            self.layer,
        )
        for (const o of ray) {
            if(o === other)continue
            switch(o.stringType){
                case "obstacle":{
                    const obs = o as Obstacle
                    const h = obs.def.height ?? 0

                    if (h===0)return false// High Wall
                    if (h===1){
                        if(dist>this.params.vision_distance*0.1)return false // Medium Wall
                    }
                    if (h===2)break// Small Wall
                    break
                }
                case "building":
                    if((o as Building).def.no_collisions)break
                    return false
            }
        }
        return true
    }

    protected updateDetection(self: Player, dt: number) {
        this.playerCheckTimer += dt
        if (this.playerCheckTimer >= 0.5) {
            if (!this.seenPlayer) {
                for (const p of self.game.livingPlayers) {
                    if (this.isPlayerVisible(self, p)) {
                        this.seenPlayer = p
                        this.lastSeenPos = v2.duplicate(p.position)
                        break
                    }
                }
                return
            }
            if (this.isPlayerVisible(self, this.seenPlayer)) {
                this.lastSeenPos = v2.duplicate(this.seenPlayer.position)
            } else {
                this.seenPlayer = undefined
            }
            this.playerCheckTimer = 0
        }
    }

    /*=======================
       STATES
    =======================*/
    protected state_idle(self: Player,begin:boolean, dt: number) {
        this.updateDetection(self, dt)
        if (this.seenPlayer) {
            this.setState("detecting")
            return
        }
        this.move_dir = v2.new(0,0)
        if(begin) {
            this.state_duration=random.float(2,3)
        }else if(this.stateTime>this.state_duration){
            this.setState("walking")
        }
    }
    protected state_walking(self: Player,begin:boolean, dt: number) {
        this.updateDetection(self, dt)
        if(this.seenPlayer) {
            this.setState("detecting")
            return
        }
        if(begin){
            const rot=random.rad()
            this.rot_target=rot
            this.rot_speed=12
            this.state_duration=random.float(2,3)
        }else if(this.stateTime>this.state_duration){
            this.setState("idle")
        }
        this.move_dir = v2.from_RadAngle(this.rot_target)
        v2m.scale(self.input.movement, this.move_dir, this.params.random_speed)
    }
    protected state_detecting(self: Player,begin:boolean, dt: number) {
        if (!this.seenPlayer) {
            this.setState("walking")
            return
        }
        this.rot_speed=1
        if (this.stateTime >= this.params.detection_time) {
            this.setState("engaged")
        }
    }
    protected state_engaged(self: Player,begin:boolean, dt: number) {
        this.updateDetection(self, dt);
        if (!this.seenPlayer) {
            this.setState("go_last_seen");
            return;
        }

        const dist = v2.distance(self.position, this.seenPlayer.position);
        this.rot_target = v2.lookTo(self.position, this.seenPlayer.position);

        const idealDist = this.params.bravery > 0.5 ? 4 : 8;

        if (dist > idealDist + 1) {
            v2m.scale(self.input.movement, v2.from_RadAngle(this.rot_target), this.params.path_speed);
        } else if (dist < idealDist - 1) {
            v2m.scale(self.input.movement, v2.from_RadAngle(this.rot_target), -this.params.path_speed);
        } else {
            const strafeDir = v2.from_RadAngle(this.rot_target + Math.PI / 2);
            v2m.scale(self.input.movement, strafeDir, this.params.random_speed);
        }

        self.input.reload =
            self.inventory.hand_item?.item_type === InventoryItemType.gun &&
            (
                (self.inventory.hand_item as GunItem).reloading ||
                !(self.inventory.hand_item as GunItem).has_ammo(self)
            )
        if (
            !self.input.reload &&
            this.isAimAligned(self, this.seenPlayer.position)
        ) {
            self.input.using_item = true
            self.input.using_item_down = true
        }
    }
    protected state_go_last_seen(self: Player,begin:boolean, dt: number) {
        if(!this.lastSeenPos){
            this.setState("idle")
            return
        }
        this.updateDetection(self, dt)
        if (this.seenPlayer) {
            this.setState("engaged")
            return
        }
        if(begin){
            this.path = astar_path2d(
                self,
                self.base_hitbox,
                this.lastSeenPos,
                this.isBlockedForPath.bind(this)
            )
            this.pathIndex=0
            this.rot_speed=7
        }
        const target=this.path[this.pathIndex]
        if(target){
            const to = v2.sub(target, self.position)
            if (v2.length(to) < 0.4) {
                this.pathIndex++
                if(this.pathIndex>=this.path.length){
                    this.enemy_not_founded()
                    return
                }
            }
            v2m.scale(self.input.movement, to, this.params.path_speed)
            this.rot_target=Math.atan2(to.y,to.x)
        }else{
            this.enemy_not_founded()
        }
    }
    enemy_not_founded(){
        this.player.input.actions.push({type:InputActionType.emote,emote:Emotes.getFromString("emote_neutral")})
        this.setState("idle")
    }
    /* =======================
       PATH BLOCK
    ======================= */

    protected isBlockedForPath(
        manager: GameObjectManager2D<BaseObject2D>,
        hb: Hitbox2D,
        _x: number,
        _y: number,
        layer: number
    ): boolean {
        for (const obj of manager.cells.get_objects(hb, layer)) {
            if (
                (obj.stringType === "obstacle" && !(obj as Obstacle).def.no_collision) ||
                (obj.stringType === "building" && !(obj as Building).def.no_collisions)
            ) {
                if (hb.collidingWith(obj.hitbox)) return true
            }
        }
        return false
    }
    override on_sound(origin: Vec2, sound_type: string,owner?:Player): void {
        if(owner?.is_npc)return
        const dist = v2.distance(this.player.position, origin)
        if (
            ((sound_type === "shot" && dist <= 14) ||
            (sound_type === "explosion" && dist <= 20))&&!this.seenPlayer
        ) {
            this.lastSeenPos = v2.duplicate(origin)
            this.path.length = 0
            this.setState("go_last_seen")
        }
    }
    override on_hitted(params:DamageParams): void {
        if(this.seenPlayer||!params.owner)return
        this.rot_target=v2.lookTo(params.owner.position,params.position)
        this.setState("detecting")
    }
}