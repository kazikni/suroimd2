import { Ammos } from "../definitions/items/ammo.ts";
import { type GunDef, Guns } from "../definitions/items/guns.ts";
import { type MeleeDef, Melees } from "../definitions/items/melees.ts";
import { BoostType } from "../definitions/player/boosts.ts";
import { InventoryItemData } from "../definitions/utils.ts";
import { Vec2 } from "../engine/geometry.ts";
import { type NetStream, Packet } from "../engine/mod.ts"
import { Numeric } from "../engine/utils.ts";
import { ActionsType } from "../others/constants.ts";
export interface DamageSplash{
    count:number
    position:Vec2
    taker:number
    taker_layer:number
    shield:boolean
    critical:boolean
    shield_break:boolean
}
export interface PrivateUpdate{
    dirty:{
        inventory:boolean
        weapons:boolean
        current_weapon:boolean
        action:boolean
        oitems:boolean
        scopes:boolean
    }

    health:number
    max_health:number

    boost:number
    max_boost:number
    boost_type:BoostType

    inventory?:InventoryItemData[]
    action?:{delay:number,type:ActionsType}

    weapons:{
        melee?:MeleeDef
        gun1?:GunDef
        gun2?:GunDef
    }

    current_weapon?:{
        slot:number
        ammo:number
        liquid:boolean
    }

    oitems:Record<number,number>
    current_scope:number
    scopes:number[]

    damages:DamageSplash[]
}
function encode_gui_packet(priv:PrivateUpdate,stream:NetStream){
    stream.writeUint8(priv.health)
    stream.writeUint8(priv.max_health)
    stream.writeUint8(priv.boost)
    stream.writeUint8(priv.max_boost)
    stream.writeUint8(priv.boost_type)
    stream.writeBooleanGroup2(
        priv.dirty.inventory,
        priv.dirty.weapons,
        priv.dirty.current_weapon,
        priv.dirty.action,
        priv.dirty.oitems,
        priv.dirty.scopes,
        priv.action!==undefined,
        priv.damages!==undefined,
        priv.current_weapon?.liquid,
    )
    if(priv.dirty.inventory){
        stream.writeArray<InventoryItemData>(priv.inventory!,(i)=>{
            stream.writeUint16(i.idNumber)
            stream.writeUint8(i.type)
            stream.writeUint8(i.count)
        },1)
    }
    if(priv.dirty.weapons){
        stream.writeInt16(priv.weapons.melee?.idNumber??-1)
        stream.writeInt16(priv.weapons.gun1?.idNumber??-1)
        stream.writeInt16(priv.weapons.gun2?.idNumber??-1)
    }
    if(priv.dirty.current_weapon){
        stream.writeInt8(priv.current_weapon!.slot)
        if(priv.current_weapon!.liquid){
            stream.writeFloat32(Numeric.maxDecimals(priv.current_weapon!.ammo,1))
        }else{
            stream.writeUint16(priv.current_weapon!.ammo)
        }
    }
    if(priv.dirty.action&&priv.action){
        stream.writeFloat(priv.action.delay,0,20,3)
        stream.writeUint8(priv.action.type)
    }
    if(priv.damages){
        stream.writeArray(priv.damages,(d)=>{
            stream.writeBooleanGroup(d.critical,d.shield,d.shield_break)
            stream.writeUint16(d.count)
            stream.writePosition(d.position)
            stream.writeID(d.taker)
            stream.writeUint8(d.taker_layer)
        },1)
    }
    if(priv.dirty.oitems){
        stream.writeArray(Object.entries(priv.oitems),(i)=>{
            const def=Ammos.getFromNumber(i[0] as unknown as number)
            stream.writeUint8(i[0] as unknown as number)
            if(def.liquid){
                stream.writeFloat32(Numeric.maxDecimals(i[1],1))
            }else{
                stream.writeUint16(i[1] as unknown as number)
            }
        },1)
    }
    stream.writeUint8(priv.current_scope)
    if(priv.dirty.scopes){
        stream.writeUint8(priv.scopes.length)
        for(let i=0;i<priv.scopes.length;i++){
            stream.writeUint8(priv.scopes[i])
        }
    }
}
function decode_gui_packet(priv:PrivateUpdate,stream:NetStream){
    priv.health=stream.readUint8()
    priv.max_health=stream.readUint8()
    priv.boost=stream.readUint8()
    priv.max_boost=stream.readUint8()
    priv.boost_type=stream.readUint8()
    const [
        dirtyInventory,
        dirtyWeapons,
        dirtyCurrentWeapon,
        dirtyAction,
        dirtyAmmos,
        dirtyScopes,
        hasAction,
        hasDamages,
        liquid,
    ]=stream.readBooleanGroup2()
    priv.dirty={
        inventory:dirtyInventory,
        weapons:dirtyWeapons,
        current_weapon:dirtyCurrentWeapon,
        action:dirtyAction,
        oitems:dirtyAmmos,
        scopes:dirtyScopes
    }
    if(dirtyInventory){
        priv.dirty.inventory=true
        priv.inventory=stream.readArray<InventoryItemData>(()=>{
            return {
                idNumber:stream.readUint16(),
                type:stream.readUint8(),
                count:stream.readUint8()
            }
        },1)
    }
    if(dirtyWeapons){
        const melee=stream.readInt16()
        const gun1=stream.readInt16()
        const gun2=stream.readInt16()
        if(melee!==-1)priv.weapons.melee=Melees.getFromNumber(melee)
        else priv.weapons.melee=undefined
        if(gun1!==-1)priv.weapons.gun1=Guns.getFromNumber(gun1)
        else priv.weapons.gun1=undefined
        if(gun2!==-1)priv.weapons.gun2=Guns.getFromNumber(gun2)
        else priv.weapons.gun2=undefined
    }
    if(dirtyCurrentWeapon){
        priv.current_weapon={
            slot:stream.readInt8(),
            ammo:liquid?Numeric.maxDecimals(stream.readFloat32(),1):stream.readUint16(),
            liquid:liquid
        }
    }
    if(dirtyAction){
        priv.dirty.action=true
        if(hasAction){
            priv.action={
                delay:stream.readFloat(0,20,3),
                type:stream.readUint8(),
            }
        }
    }
    if(hasDamages){
        priv.damages=stream.readArray(()=>{
            const boo=stream.readBooleanGroup()
            return {
                count:stream.readUint16(),
                critical:boo[0],
                shield:boo[1],
                shield_break:boo[2],
                position:stream.readPosition(),
                taker:stream.readID(),
                taker_layer:stream.readInt8()
            }
        },1)
    }
    if(dirtyAmmos){
        const len=stream.readUint8()
        priv.oitems={}
        for(let i=0;i<len;i++){
            const def=Ammos.getFromNumber(stream.readUint8())
            if(def.liquid){
                priv.oitems[def.idNumber!]=Numeric.maxDecimals(stream.readFloat32(),1)
            }else{
                priv.oitems[def.idNumber!]=stream.readUint16()
            }
        }
    }
    priv.current_scope=stream.readUint8()
    if(dirtyScopes){
        const len=stream.readUint8()
        priv.scopes=[]
        for(let i=0;i<len;i++){
            priv.scopes.push(stream.readUint8())
        }
    }
}
export class UpdatePacket extends Packet{
    ID=2
    Name="update"

    priv:PrivateUpdate={
        boost:0,
        boost_type:BoostType.Shield,
        dirty:{
            action:false,
            current_weapon:false,
            inventory:false,
            weapons:false,
            oitems:false,
            scopes:false
        },
        oitems:{},
        scopes:[],
        health:0,
        max_boost:0,
        max_health:0,
        weapons:{
            gun1:undefined,
            gun2:undefined,
            melee:undefined
        },
        action:undefined,
        current_scope:0,
        current_weapon:{
            ammo:0,
            slot:0,
            liquid:false
        },
        damages:[],
        inventory:undefined,
    }

    objects?:NetStream
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeStreamDynamic(this.objects!)
        encode_gui_packet(this.priv,stream)
    }
    decode(stream: NetStream): void {
        this.objects=stream.readStreamDynamic()
        decode_gui_packet(this.priv,stream)
    }
}