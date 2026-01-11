import { Angle, v2, v2m, Vec2 } from "common/scripts/engine/geometry.ts";
import { BotAi } from "./simple_bot_ai.ts";
import { random } from "common/scripts/engine/random.ts";
import { type Player } from "../gameObjects/player.ts";
import { Numeric } from "common/scripts/engine/utils.ts";
import { InputActionType } from "common/scripts/packets/action_packet.ts";
import { Emotes } from "common/scripts/definitions/loadout/emotes.ts";
import { astar_path2d } from "common/scripts/engine/AI/pathfinding.ts";
import { type Obstacle } from "../gameObjects/obstacle.ts"
import { type Building } from "../gameObjects/building.ts"
import { BaseObject2D, GameObjectManager2D } from "common/scripts/engine/gameObject.ts";
import { Hitbox2D } from "common/scripts/engine/hitbox.ts";
import { InventoryItemType } from "common/scripts/definitions/utils.ts";
import { GunItem } from "./inventory.ts";
export class EnemyNPCBotAi extends BotAi {
    state:
        | "random"
        | "detecting"
        | "engaged"
        | "go_last_seen"
        | "search" = "random"

    private subState: "move" | "idle" = "idle"

    private stateTime = 0
    private moveDir = v2.new(0, 0)
    private rotTarget = 0

    private path: Vec2[] = []
    private pathIndex = 0

    private lastSeenPos?: Vec2
    private seenPlayer?: Player

    private detectTimer = 0
    private reactionTimer = 0
    private searchTimer = 0
    private visionHoldTimer = 0

    private player_check_timer = 0

    override params = {
        random_speed: 0.35,
        path_speed: 1.0,

        detection_time: 0.25,
        reaction_time: 0.15,
        lose_time: 0.4,
        search_time: 2.5,
        vision_distance: 10,

        shoot_angle_epsilon: 0.12 //7 Deg
    }
    constructor() {
        super()
        this.resetIdle()
    }
    private is_aim_aligned(player: Player, target: Vec2): boolean {
        const desired = Math.atan2(
            target.y - player.position.y,
            target.x - player.position.x
        )
        const diff = Math.abs(
            Angle.delta_rad(player.rotation, desired)
        )
        return diff <= this.params.shoot_angle_epsilon
    }
    private is_player_detectable(self: Player, other: Player): boolean {
        if (other.dead || other.is_npc) return false

        const dist = v2.distance(self.position, other.position)
        if (dist > this.params.vision_distance) return false

        const ray = self.manager.cells.ray(
            self.position,
            other.position,
            self.layer,
            true
        )

        for (const o of ray) {
            if (o === other) return true

            switch (o.stringType) {
                case "obstacle": {
                    const ob = o as Obstacle
                    if (!ob.def.no_collision && !ob.dead) return false
                    break
                }
                case "building": {
                    const b = o as Building
                    if (!b.def.no_collisions) return false
                    break
                }
            }
        }

        return true
    }
    isBlockedForPath(manager: GameObjectManager2D<BaseObject2D>, hb: Hitbox2D, cellX: number, cellY: number, layer: number ): boolean {
        const objs = manager.cells.get_objects(hb, layer)
        for (const obj of objs) {
        switch (obj.stringType) {
            case "obstacle": {
                const o = obj as Obstacle
                if (o.def.no_collision || o.dead)break
                if (hb.collidingWith(o.hitbox))return true
                break
            }
            case "building":{
                const b = obj as Building
                if (b.def.no_collisions) break
                if (hb.collidingWith(obj.hitbox)) return true
                break
            }
        }
        }
        return false
    }
    /* =======================
       RANDOM WALK
    ======================= */

    private resetIdle() {
        this.subState = "idle"
        this.stateTime = random.float(1.5, 3)
    }

    private resetMove() {
        this.subState = "move"
        this.stateTime = random.float(1.5, 3)
        this.moveDir = v2.from_RadAngle(random.rad())
        this.rotTarget = Math.atan2(this.moveDir.y, this.moveDir.x)
    }

    private updateRandom(player: Player, dt: number) {
        this.stateTime -= dt

        if (this.subState === "idle") {
            if (this.stateTime <= 0) this.resetMove()
        } else {
            v2m.scale(player.input.movement, this.moveDir, this.params.random_speed)
            if (this.stateTime <= 0) this.resetIdle()
        }

        player.input.rotation = Numeric.lerp_rad(
            player.rotation,
            this.rotTarget,
            1 / (1 + dt * 800)
        )
    }

    /* =======================
       PATH FOLLOW
    ======================= */

    private followPath(player: Player, dt: number) {
        const target = this.path[this.pathIndex]
        if (!target) return true

        const to = v2.sub(target, player.position)
        const dist = v2.length(to)

        if (dist < 0.4) {
            this.pathIndex++
            return this.pathIndex >= this.path.length
        }

        v2m.normalizeSafe(to)
        v2m.scale(player.input.movement, to, this.params.path_speed)
        this.rotTarget = Math.atan2(to.y, to.x)

        player.input.rotation = Numeric.lerp_rad(
            player.rotation,
            this.rotTarget,
            1 / (1 + dt * 900)
        )

        return false
    }
    /* =======================
       PLAYER DETECTION
    ======================= */
    private check_for_player(self: Player, dt: number) {
        if (!this.seenPlayer) {
            this.player_check_timer += dt
            if (this.player_check_timer >= 0.12) {
                for (const p of self.game.livingPlayers) {
                    if (this.is_player_detectable(self, p)) {
                        this.seenPlayer = p
                        this.lastSeenPos = v2.duplicate(p.position)
                        this.visionHoldTimer = this.params.lose_time
                        return
                    }
                }
                this.player_check_timer = 0
            }
            return
        }
        if (this.is_player_detectable(self, this.seenPlayer)) {
            this.lastSeenPos = v2.duplicate(this.seenPlayer.position)
            this.visionHoldTimer = this.params.lose_time
        } else {
            this.visionHoldTimer -= dt
            if (this.visionHoldTimer <= 0) {
                this.seenPlayer = undefined
            }
        }
    }

    /* =======================
       MAIN UPDATE
    ======================= */
    override AI(player: Player, dt: number): void {
        v2m.zero(player.input.movement)
        player.input.using_item = false
        player.input.using_item_down = false
        player.input.reload=player.inventory.hand_item?.item_type===InventoryItemType.gun&&
        ((player.inventory.hand_item! as GunItem).reloading||!(player.inventory.hand_item! as GunItem).has_ammo(player))

        this.check_for_player(player,dt*2)

        /* ---------- STATE MACHINE ---------- */

        switch (this.state) {

            case "random": {
                this.updateRandom(player, dt)

                if (this.seenPlayer) {
                    this.detectTimer = 0
                    this.state = "detecting"
                }
                break
            }

            case "detecting": {
                if (!this.seenPlayer || !this.is_player_detectable(player, this.seenPlayer)) {
                    this.seenPlayer = undefined
                    this.state = "random"
                    break
                }

                this.detectTimer += dt
                this.rotTarget = Math.atan2(
                    this.seenPlayer.position.y - player.position.y,
                    this.seenPlayer.position.x - player.position.x
                )

                if (this.detectTimer >= this.params.detection_time) {
                    this.reactionTimer = this.params.reaction_time
                    this.state = "engaged"
                }
                break
            }
            case "engaged": {
                if (!this.seenPlayer) {
                    this.state = "go_last_seen"
                    this.path.length = 0    
                    break
                }
                this.rotTarget = Math.atan2(
                    this.seenPlayer.position.y - player.position.y,
                    this.seenPlayer.position.x - player.position.x
                )
                this.reactionTimer -= dt
                if (
                    this.reactionTimer <= 0 &&
                    !player.input.reload &&
                    this.is_aim_aligned(player, this.seenPlayer.position)
                ) {
                    player.input.using_item = true
                    player.input.using_item_down = true
                }
                break
            }
            case "go_last_seen": {
                if (this.seenPlayer && this.is_player_detectable(player, this.seenPlayer)) {
                    this.state = "engaged"
                    this.reactionTimer = this.params.reaction_time
                    break
                }

                if (!this.path.length && this.lastSeenPos) {
                    this.path = astar_path2d(
                        player,
                        player.base_hitbox,
                        this.lastSeenPos,
                        this.isBlockedForPath.bind(this)
                    )
                    this.pathIndex = 0
                }

                if (this.followPath(player, dt)) {
                    this.searchTimer = this.params.search_time
                    this.state = "search"
                }
                break
            }
            case "search": {
                this.searchTimer -= dt
                this.updateRandom(player, dt)

                if (this.seenPlayer) {
                    this.state = "engaged"
                    this.reactionTimer = this.params.reaction_time
                } else if (this.searchTimer <= 0) {
                    this.state = "random"
                }
                break
            }
        }

        player.input.rotation = Numeric.lerp_rad(
            player.rotation,
            this.rotTarget,
            1 / (1 + dt * 900)
        )
    }

    /* =======================
       SOUND REACTION
    ======================= */
    override on_sound(player: Player, origin: Vec2, sound_type: string): void {
        const dist = v2.distance(player.position, origin)
        if (
            (sound_type === "shot" && dist <= 14) ||
            (sound_type === "explosion" && dist <= 20)
        ) {
            this.lastSeenPos = v2.duplicate(origin)
            this.state = "go_last_seen"
            this.path.length = 0
        }
    }
}