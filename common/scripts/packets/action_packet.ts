import { GameObjectsDefs, type GameObjectDef } from "../definitions/alldefs.ts";
import { NetStream, Packet, v2, Vec2 } from "../engine/mod.ts"
export enum InputActionType{
  drop,
  use_item,
  set_hand,
  debug_give,
  set_scope,
  emote,
  debug_spawn
}
export type InputAction=({
  type:InputActionType.drop,
  drop_kind:number,
  drop:number
}|{
  type:InputActionType.set_hand,
  hand:number
}|{
  type:InputActionType.use_item,
  slot:number
}|{
  type:InputActionType.use_item,
  slot:number
}|{
  type:InputActionType.set_scope,
  scope_id:number
}|{
  type:InputActionType.emote,
  emote:GameObjectDef
}|{
  type:InputActionType.debug_give|InputActionType.debug_spawn,
  item:string,
  count:number
})
export class ActionPacket extends Packet{
    ID=1
    Name="action"
    
    movement:Vec2=v2.new(0,0)
    angle:number=0

    use_weapon:boolean=false
    interact:boolean=false
    reload:boolean=false
    swamp_guns:boolean=false

    aim_speed:number=0

    actions:InputAction[]=[]

    constructor(){
        super()
    }
    encode(stream: NetStream): void {
      stream.writeFloat32(this.movement.x)
      .writeFloat32(this.movement.y)
      .writeRad(this.angle)
      .writeFloat(this.aim_speed,0,1,1)
      .writeBooleanGroup(this.use_weapon,this.interact,this.reload,this.swamp_guns)
      .writeArray(this.actions,(i,_s)=>{
        stream.writeUint8(i.type)
        switch(i.type){
          case InputActionType.drop:
            stream.writeUint8(i.drop)
            stream.writeUint8(i.drop_kind)
            break
          case InputActionType.use_item:
            stream.writeUint8(i.slot)
            break
          case InputActionType.set_hand:
            stream.writeUint8(i.hand)
            break
          case InputActionType.set_scope:
            stream.writeUint8(i.scope_id)
            break
          case InputActionType.emote:
            stream.writeUint16(GameObjectsDefs.keysString[i.emote.idString])
            break
          case InputActionType.debug_give:
          case InputActionType.debug_spawn:
            stream.writeStringSized(32,i.item)
            .writeUint8(i.count)
            break
        }
      },1)
    }
    decode(stream: NetStream): void {
      this.movement={
        x:stream.readFloat32(),
        y:stream.readFloat32()
      }
      this.angle=stream.readRad()
      this.aim_speed=stream.readFloat(0,1,1)
      const bg=stream.readBooleanGroup()
      this.use_weapon=bg[0]
      this.interact=bg[1]
      this.reload=bg[2]
      this.swamp_guns=bg[3]
      this.actions=stream.readArray((_s)=>{
        const ret={
          type:stream.readUint8()
        } as InputAction
        switch(ret.type){
          case InputActionType.drop:
            ret["drop"]=stream.readUint8()
            ret["drop_kind"]=stream.readUint8()
            break
          case InputActionType.use_item:
            ret["slot"]=stream.readUint8()
            break
          case InputActionType.set_hand:
            ret["hand"]=stream.readUint8()
            break
          case InputActionType.set_scope:
            ret["scope_id"]=stream.readUint8()
            break
          case InputActionType.emote:
            ret["emote"]=GameObjectsDefs.valueNumber[stream.readUint16()]
            break
          case InputActionType.debug_give:
          case InputActionType.debug_spawn:
            ret["item"]=stream.readStringSized(32)
            ret["count"]=stream.readUint8()
            break
        }
        return ret
      },1)
    }
}