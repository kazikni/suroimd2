import { ActionDefinition, ActionTreeDef, ConditionNode, DoActionNode, NodeStatus, SelectorNode, SequenceNode } from "../../../../common/scripts/engine/AI/behaviour_tree.ts";
import { Player } from "../gameObjects/player.ts";
import { v2, Vec2 } from "common/scripts/engine/geometry.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { InputActionType } from "common/scripts/packets/action_packet.ts";
export interface BotSettings{
    reaction_time:number,
    accuracy:number,
    bravery:number,
    teamwork:number,
    like_regen:number
}
export interface BotWorld{
    player:Player
    view_objects:ServerGameObject[]
}
export const bots_actions={
    use_slot:{
        name: "use_slot",
        onStart: (ctx,{slot}) => {
            ctx.object.player.input.actions.push(
                {
                    slot,
                    type:InputActionType.use_item
                }
            )
        },
        onTick: (ctx, _a) => {
            return ctx.object.player.actions.current_delay>0?NodeStatus.Success:NodeStatus.Running
        },
    } as ActionDefinition<BotWorld,BotSettings, { slot:number }>,
    aim_to:{
        name: "aim_to",
        onStart: (ctx,{position}) => {
            ctx.object.player.input.rotation=v2.lookTo(ctx.object.player.position,position)
        },
        onTick: (ctx, _a) => {
            return NodeStatus.Running
        },
    } as ActionDefinition<BotWorld,BotSettings, { position:Vec2 }>
}
export const EaseBotBRTree:ActionTreeDef<BotWorld,BotSettings> = new SelectorNode<BotWorld, BotSettings>([
  new SequenceNode<BotWorld, BotSettings>([
    new ConditionNode(ctx => (ctx.object.player.health < 30), "Low Health?"),
    new DoActionNode<BotWorld,BotSettings,{ slot:number }>("use_slot",{slot:0},"heal"),
  ], "If Low HP"),
])