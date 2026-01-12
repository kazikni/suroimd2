import { Numeric } from "common/scripts/engine/utils.ts";
import { type Player } from "../gameObjects/player.ts";
import { random } from "common/scripts/engine/random.ts";
import { v2, Vec2 } from "common/scripts/engine/geometry.ts";
import { Emotes } from "common/scripts/definitions/loadout/emotes.ts";
import { InputActionType } from "common/scripts/packets/action_packet.ts";
import { Ammos } from "common/scripts/definitions/items/ammo.ts";
import { Consumibles } from "common/scripts/definitions/items/consumibles.ts";
import { GameObjectDef } from "common/scripts/definitions/alldefs.ts";
import { DamageParams } from "../others/utils.ts";
import { type Game } from "../others/game.ts";
export type AIMessage<T = any> = {
    type: string
    origin: Vec2
    sender?: BotAi
    data: T
}
export abstract class BotAi{
    // deno-lint-ignore no-explicit-any
    params:any
    player:Player

    deliveries:Record<string,(bot:BotAi,msg:AIMessage)=>void>={}
    constructor(player:Player){
        this.player=player
    }
    abstract AI(dt:number):void
    on_sound(origin:Vec2,sound_type:string,owner?:Player):void{
    }
    on_hitted(params:DamageParams):void{

    }
}
export type BotStateHandler = (self: Player,begin:boolean,dt: number) => void
export abstract class StatedBotAi<TState extends string = string> extends BotAi{
    rot_target = 0
    rot_speed = 0
    move_speed=1
    protected move_dir = v2.new(0, 0)
    protected state!: TState
    protected stateTime = 0
    protected stateHandlers: Partial<Record<TState, BotStateHandler>> = {}
    protected setState(state: TState, resetTime = true) {
        if (this.state === state) return
        this.state = state
        if (resetTime)this.stateTime = 0
    
        const fn = this.stateHandlers[this.state]
        if (fn)fn(this.player,true,0)
    }
    protected tickState(dt: number) {
        const fn = this.stateHandlers[this.state]
        if (fn)fn(this.player,false, dt)
        this.stateTime += dt
    }
    protected apply(dt: number) {
        this.player.input.rotation = Numeric.lerp_rad(
            this.player.rotation,
            this.rot_target,
            1 / (1 + dt * this.rot_speed*100)
        )
        this.player.input.movement=this.move_dir
        this.player.input.speed=this.move_speed
        this.player.input.using_item=false
        this.player.input.using_item_down=false
    }
    AI(dt: number): void {
        this.apply(dt)
        this.tickState(dt)
    }
}
export class SimpleBotAi extends BotAi{
    constructor(player:Player){
        super(player)
        this.rot_speed=random.float(-0.1,0.1)
    }
    rot_speed:number
    movement_time=0
    emotes:GameObjectDef[]=[
        Emotes.getFromString("emote_sad"),
        Emotes.getFromString("emote_happy"),
        Emotes.getFromString("emote_md_logo"),
        Emotes.getFromString("emote_neutral"),
        ...Object.values(Ammos.value),
        ...Object.values(Consumibles.value)
    ]
    override AI(dt:number): void {
        this.player.input.interaction=this.player.seat?Math.random()<0.001:Math.random()<0.1
        this.player.input.using_item=Math.random()<0.2
        this.player.input.using_item_down=this.player.input.using_item
        this.player.input.rotation=Numeric.lerp_rad(this.player.rotation,this.player.rotation+this.rot_speed,0.9)
        if(this.movement_time>0){
            this.movement_time-=dt
        }else{
            this.movement_time=random.float(1,3)
            this.player.input.movement=v2.from_RadAngle(random.rad())
        }
        if(Math.random()<=0.003){
            this.player.input.actions.push({type:InputActionType.emote,emote:random.choose(this.emotes)})
        }
    }
}
export type UtilityContext = {
    player: Player
    dt: number
    time: number
}
export type UtilityAction<T extends string = string> = {
    id: T
    score(ctx: UtilityContext): number
    enter?(ctx: UtilityContext): void
    update?(ctx: UtilityContext): void
    exit?(ctx: UtilityContext): void
    cooldown?: number
}
export abstract class BotAction<T extends string = string>
    implements UtilityAction<T> {

    id!: T
    cooldown = 0

    abstract score(ctx: UtilityContext): number
    enter?(ctx: UtilityContext): void
    update?(ctx: UtilityContext): void
    exit?(ctx: UtilityContext): void
}
export abstract class UtilityStatedBotAi<
    TState extends string,
    TAction extends string
> extends BotAi {
    rot_target = 0
    rot_speed = 0
    move_speed=1
    protected move_dir = v2.new(0, 0)

    protected state!: TState
    protected stateTime = 0
    protected setState(state: TState) {
        if (this.state === state) return
        this.onExitState?.(this.state)
        this.state = state
        this.stateTime = 0
        this.onEnterState?.(state)
    }

    protected tickState(dt: number) {
        this.stateTime += dt
        this.onUpdateState?.(this.state, dt)
    }

    protected onEnterState?(state: TState): void
    protected onExitState?(state: TState): void
    protected onUpdateState?(state: TState, dt: number): void

    protected actions = new Map<TAction, UtilityAction<TAction>>()
    protected currentAction?: UtilityAction<TAction>
    protected actionCooldowns = new Map<TAction, number>()

    protected utilityInterval = 0.35
    protected utilityTimer = 0

    protected evaluateUtility(ctx: UtilityContext) {
        let best: UtilityAction<TAction> | undefined
        let bestScore = -Infinity

        for (const action of this.actions.values()) {
            const cd = this.actionCooldowns.get(action.id)
            if (cd && cd > 0) continue

            const s = action.score(ctx)
            if (s > bestScore) {
                bestScore = s
                best = action
            }
        }

        if (best && best !== this.currentAction) {
            this.currentAction?.exit?.(ctx)
            this.currentAction = best
            best.enter?.(ctx)
        }
    }

    protected tickUtility(dt: number) {
        this.utilityTimer += dt
        for (const [k, v] of this.actionCooldowns) {
            this.actionCooldowns.set(k, Math.max(0, v - dt))
        }

        if (this.utilityTimer >= this.utilityInterval) {
            this.utilityTimer = 0
            this.evaluateUtility({
                player: this.player,
                dt,
                time: performance.now() / 1000,
            })
        }
    }

    protected applyAction(ctx: UtilityContext) {
        this.currentAction?.update?.(ctx)
    }
    protected apply(dt: number) {
        this.player.input.rotation = Numeric.lerp_rad(
            this.player.rotation,
            this.rot_target,
            1 / (1 + dt * this.rot_speed*100)
        )
        this.player.input.movement=this.move_dir
        this.player.input.speed=this.move_speed
        this.player.input.using_item=false
        this.player.input.using_item_down=false
    }
    override AI(dt: number): void {
        const ctx: UtilityContext = {
            player: this.player,
            dt,
            time: performance.now() / 1000,
        }

        this.tickUtility(dt)
        this.applyAction(ctx)
        this.tickState(dt)
        this.apply(dt)
    }
}
export class AINetworkBase {
    baseRadius = 12
    baseDelay = 0.15

    bots = new Set<BotAi>()
    game:Game
    constructor(game:Game){
        this.game=game
    }
    register(bot: BotAi) {
        this.bots.add(bot)
    }
    unregister(bot: BotAi) {
        this.bots.delete(bot)
    }
    broadcast(msg: AIMessage) {
        for (const bot of this.bots) {
            if (bot === msg.sender) continue
            if (!this.can_receive(bot, msg)) continue

            const delay = this.baseDelay
            if (delay > 0) {
                setTimeout(() => this.deliver(bot, msg), delay * 1000)
            } else {
                this.deliver(bot, msg)
            }
        }
    }
    private can_receive(bot: BotAi, msg: AIMessage): boolean {
        return this.baseRadius >= v2.distance(bot.player.position, msg.origin)
    }
    private deliver(bot: BotAi, msg: AIMessage) {
        const handler = bot.deliveries[msg.type]
        if (handler) {
            handler(bot, msg)
        }
    }
}