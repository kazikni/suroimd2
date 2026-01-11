import { v2, v2m, Vec2 } from "common/scripts/engine/geometry.ts";
import { BotAi } from "./simple_bot_ai.ts";
import { random } from "common/scripts/engine/random.ts";
import { Player } from "../gameObjects/player.ts";
import { Numeric } from "common/scripts/engine/utils.ts";
import { InputActionType } from "common/scripts/packets/action_packet.ts";
import { Emotes } from "common/scripts/definitions/loadout/emotes.ts";
import { astar_path2d } from "common/scripts/engine/AI/pathfinding.ts";
import { Obstacle } from "../gameObjects/obstacle.ts"
import { Building } from "../gameObjects/building.ts"
import { BaseObject2D, GameObjectManager2D } from "common/scripts/engine/gameObject.ts";
import { Hitbox2D } from "common/scripts/engine/hitbox.ts";
export class EnemyNPCBotAi extends BotAi {
    state: "random" | "follow_path" = "rando"
    private subState: "move" | "idle" = "idle"
    private stateTime = 0
    private moveDir = v2.new(0, 0)
    private rotTarget = 0
    private path: Vec2[] = []
    private pathIndex = 0
    private followSub: "move" | "wait" | "react" = "move"
    private followTimer = 0
    override params = {
        random_speed: 0.35,
        path_speed: 1.0,
        react_speed: 0.6
    }
    constructor() {
        super()
        this.resetIdle()
    }
    private resetIdle() {
        this.subState = "idle"
        this.stateTime = random.float(2, 4)
    }
    private resetMove() {
        this.subState = "move"
        this.stateTime = random.float(2, 3)
        this.moveDir = v2.from_RadAngle(random.rad())
        v2m.rotate_RadAngle(this.moveDir, random.float(0.7, 1))
        this.rotTarget = Math.atan2(this.moveDir.y, this.moveDir.x)
    }
    isBlockedForPath(
        manager: GameObjectManager2D<BaseObject2D>,
        hb: Hitbox2D,
        cellX: number,
        cellY: number,
        layer: number
    ): boolean {
        const objs = manager.cells.get_objects(hb, layer)

        for (const obj of objs) {
            switch (obj.stringType) {
                case "obstacle": {
                    const o = obj as Obstacle
                    if (o.def.no_collision || o.dead) break
                    if (hb.collidingWith(o.hitbox)) return true
                    break
                }
                case "building": {
                    const b = obj as Building
                    if (b.def.no_collisions) break
                    if (hb.collidingWith(obj.hitbox)) return true
                    break
                }
            }
        }
        return false
    }
    followPath(path: Vec2[]) {
        if (path.length === 0) return
        this.state = "follow_path"
        this.path = path
        this.pathIndex = 0
        this.followSub = "move"
    }
    private pathCooldown = 0
    private lastTargetPos?: Vec2
    tryPathTo(player: Player, target: Vec2) {
        if (this.pathCooldown > 0) return

        const path = astar_path2d(player,player.base_hitbox, target,this.isBlockedForPath.bind(this))

        if (path.length > 0) {
            this.followPath(path)
            this.pathCooldown = random.float(0.4, 0.8)
            this.lastTargetPos = v2.duplicate(target)
        }
    }

    private updateFollow(player: Player, dt: number) {
        if (this.followSub === "move") {
            const target = this.path[this.pathIndex]
            if (!target) {
                this.startWait()
                return
            }
            const to = v2.sub(target, player.position)
            const dist = v2.length(to)
            if (dist < 0.4) {
                this.pathIndex++
                if (this.pathIndex >= this.path.length) {
                    this.startWait()
                }
                return
            }
            v2m.normalizeSafe(to)
            v2m.scale(player.input.movement, to, this.params.path_speed)
            this.rotTarget = Math.atan2(to.y, to.x)
            player.input.rotation = Numeric.lerp_rad(
                player.rotation,
                this.rotTarget,
                1 / (1 + dt * 1200)
            )
        }else if (this.followSub === "wait") {
            this.followTimer -= dt
            if (this.followTimer <= 0) {
                this.startReact(player)
            }
        }else if (this.followSub === "react") {
            this.followTimer -= dt
            if (this.followTimer <= 0) {
                this.state = "random"
                this.resetIdle()
            }
        }
    }
    private startWait() {
        this.followSub = "wait"
        this.followTimer = random.float(0.6, 1.2)
    }
    private startReact(player: Player,emote: string="emote_neutral") {
        this.followSub = "react"
        this.followTimer = random.float(0.8, 1.5)

        player.input.actions.push({
            type: InputActionType.emote,
            emote: Emotes.getFromString(emote),
        })
    }
    override AI(player: Player, dt: number): void {
        v2m.zero(player.input.movement)
        player.input.using_item = false
        player.input.using_item_down = false
        player.input.interaction = false

        if (this.state === "random") {
            this.updateRandom(player, dt)
        } else if (this.state === "follow_path") {
            this.updateFollow(player, dt)
        }else{
            const p=v2.random(15,85)
            this.tryPathTo(player,p)
            console.log(p)
        }
    }
    private updateRandom(player: Player, dt: number) {
        this.stateTime -= dt
        if (this.subState === "idle") {
            player.input.rotation = Numeric.lerp_rad(
                player.rotation,
                this.rotTarget,
                1 / (1 + dt * 1200)
            )
            if (this.stateTime <= 0) {
                this.resetMove()
            }
        } else {
            v2m.scale(player.input.movement, this.moveDir, this.params.random_speed)
            player.input.rotation = Numeric.lerp_rad(
                player.rotation,
                this.rotTarget,
                1 / (1 + dt * 1200)
            )
            if (this.stateTime <= 0) {
                this.resetIdle()
            }
        }
        if (Math.random() < 0.002) {
            player.input.interaction = true
        }
    }
}