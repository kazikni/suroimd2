import { Numeric } from "common/scripts/engine/utils.ts";
import { type Player } from "../gameObjects/player.ts";
import { random } from "common/scripts/engine/random.ts";
import { v2, Vec2 } from "common/scripts/engine/geometry.ts";
import { BehaviourTree, Default_Tree_Settings } from "common/scripts/engine/AI/behaviour_tree.ts";
import { bots_actions, BotSettings, BotWorld, EaseBotBRTree } from "../defs/bot_ia_tree.ts";
import { Emotes } from "common/scripts/definitions/loadout/emotes.ts";
import { InputActionType } from "common/scripts/packets/action_packet.ts";
import { Ammos } from "common/scripts/definitions/items/ammo.ts";
import { Consumibles } from "common/scripts/definitions/items/consumibles.ts";
import { GameObjectDef } from "common/scripts/definitions/alldefs.ts";

export abstract class BotAi{
    // deno-lint-ignore no-explicit-any
    params:any
    player:Player
    constructor(player:Player){
        this.player=player
    }
    abstract AI(dt:number):void
    on_sound(origin:Vec2,sound_type:string):void{
    }
}
export type BotStateHandler<T extends string> = (self: Player,begin:boolean,dt: number) => void

export abstract class StatedBotAi<TState extends string = string> extends BotAi{
    rot_target = 0
    rot_speed = 0
    protected move_dir = v2.new(0, 0)
    protected state!: TState
    protected stateTime = 0
    protected stateHandlers: Partial<Record<TState, BotStateHandler<TState>>> = {}
    /*=======================
       FSM
    =======================*/
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
    /*=======================
       AIM / ROTATION
    =======================*/
    protected apply(dt: number) {
        this.player.input.rotation = Numeric.lerp_rad(
            this.player.rotation,
            this.rot_target,
            1 / (1 + dt * this.rot_speed*100)
        )
        this.player.input.movement=this.move_dir
        this.player.input.using_item=false
        this.player.input.using_item_down=false
    }
    /*=======================
       BASE UPDATE
    =======================*/
    AI(dt: number): void {
        this.apply(dt)
        this.tickState(dt)
    }
    /*=======================
       OPTIONAL EVENTS
    =======================*/
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
export class TreeBotAi extends BotAi{
    tree:BehaviourTree<BotWorld,BotSettings>
    world:BotWorld
    constructor(player:Player,settings:BotSettings&Default_Tree_Settings){
        super(player)
        this.world={
            player:player,
            view_objects:[]
        }
        this.tree=new BehaviourTree(this.world,settings,EaseBotBRTree,[
            bots_actions.use_slot,
            bots_actions.aim_to,
        ])
    }
    override AI(dt:number): void {
        this.world.view_objects=this.player.get_objects()
        this.tree.update(dt)
    }
}