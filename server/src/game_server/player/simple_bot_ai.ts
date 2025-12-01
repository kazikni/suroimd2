import { Numeric } from "common/scripts/engine/utils.ts";
import { type Player } from "../gameObjects/player.ts";
import { random } from "common/scripts/engine/random.ts";
import { v2 } from "common/scripts/engine/geometry.ts";
import { BehaviourTree, Default_Tree_Settings } from "common/scripts/engine/AI/behaviour_tree.ts";
import { bots_actions, BotSettings, BotWorld, EaseBotBRTree } from "../defs/bot_ia_tree.ts";
import { Emotes } from "common/scripts/definitions/loadout/emotes.ts";
import { InputActionType } from "common/scripts/packets/action_packet.ts";
import { Ammos } from "common/scripts/definitions/items/ammo.ts";
import { Consumibles } from "common/scripts/definitions/items/consumibles.ts";
import { GameObjectDef } from "common/scripts/definitions/alldefs.ts";

export abstract class BotAi{
    constructor(){

    }
    abstract AI(player:Player,dt:number):void
}
export class SimpleBotAi extends BotAi{
    constructor(){
        super()
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
    override AI(player: Player,dt:number): void {
        player.input.interaction=player.seat?Math.random()<0.001:Math.random()<0.1
        player.input.using_item=Math.random()<0.2
        player.input.using_item_down=player.input.using_item
        player.input.rotation=Numeric.lerp_rad(player.rotation,player.rotation+this.rot_speed,0.9)
        if(this.movement_time>0){
            this.movement_time-=dt
        }else{
            this.movement_time=random.float(1,3)
            player.input.movement=v2.from_RadAngle(random.rad())
        }
        if(Math.random()<=0.003){
            player.input.actions.push({type:InputActionType.emote,emote:random.choose(this.emotes)})
        }
    }
}
export class TreeBotAi extends BotAi{
    tree:BehaviourTree<BotWorld,BotSettings>
    world:BotWorld
    constructor(player:Player,settings:BotSettings&Default_Tree_Settings){
        super()
        this.world={
            player:player,
            view_objects:[]
        }
        this.tree=new BehaviourTree(this.world,settings,EaseBotBRTree,[
            bots_actions.use_slot,
            bots_actions.aim_to,
        ])
    }
    override AI(player: Player,dt:number): void {
        this.world.view_objects=player.get_objects()
        this.tree.update(dt)
    }
}