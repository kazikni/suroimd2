import { GameItem } from "common/scripts/definitions/alldefs.ts";
import { type Game } from "../others/game.ts";
import { GInventory, GunItem, LItem, MeleeItem } from "../others/inventory.ts";
import { InventoryItemType, ItemQualitySettings } from "common/scripts/definitions/utils.ts";
import { InputActionType } from "common/scripts/packets/action_packet.ts";
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { Ammos } from "common/scripts/definitions/items/ammo.ts";

export class InventoryManager{
    inventory:GInventory
    game:Game
    constructor(game:Game){
        this.game=game
        this.inventory=new GInventory({
            0:MeleeItem as (new(item:GameItem)=>LItem),
            1:GunItem as (new(item:GameItem)=>LItem),
            2:GunItem as (new(item:GameItem)=>LItem)
        })
        //this.inventory.on_dirty=this.inventory_dirty.bind(this)
        this.inventory.clear_weapons()
    }
    content={
        weapons:document.querySelector("#gui-weapons") as HTMLDivElement,
        oitems:document.querySelector("#gui-oitems") as HTMLDivElement,
        hand_info:{
            count:document.querySelector("#hand-info-count") as HTMLSpanElement,
            consume_type:document.querySelector("#hand-info-consume-type")as HTMLImageElement,
        }
    }
    weapons_html:Partial<Record<number,{
        main:HTMLDivElement,
        name:HTMLSpanElement,
        image:HTMLImageElement
    }>>={}
    current_weapon:number=-1

    drop_weapon=(w:number)=>{
        return (e:MouseEvent)=>{
            if(e.button==2){
                this.game.action.actions.push({type:InputActionType.drop,drop:w,drop_kind:1})
            }
        }
    }
    select_weapon=(w:number)=>{
        return ()=>{
            this.game.action.actions.push({type:InputActionType.set_hand,hand:w})
        }
    }
    update_weapons(){
        for(const k of Object.keys(this.inventory.weapons)){
            if(this.weapons_html[k as unknown as number]===undefined){
                const w={
                    main:document.createElement("div"),
                    number:document.createElement("span"),
                    image:document.createElement("img"),
                    name:document.createElement("span"),
                }
                w.main.className="weapon-slot"
                w.number.className="weapon-slot-number"
                w.number.innerHTML=`${parseInt(k)+1}`
                w.main.appendChild(w.number)
                w.name.className="weapon-slot-name"
                w.main.appendChild(w.name)
                w.image.className="weapon-slot-image"
                w.main.appendChild(w.image)

                w.main.id="inventoy-weapon-slot-"+k

                w.main.addEventListener("mousedown",this.drop_weapon(k as unknown as number))
                w.main.addEventListener("touchstart",this.select_weapon(k as unknown as number))

                this.content.weapons.append(w.main)
                this.weapons_html[k as unknown as number]=w
            }
            const item=this.inventory.weapons[k as unknown as number]
            const w=this.weapons_html[k as unknown as number]!
            if(item){
                const assets=item.assets(this.game.resources)
                w.name.innerText=this.game.language.get(this.inventory.weapons[k as unknown as number]!.def.idString)
                w.image.src=assets["item"].src
                w.image.style.display="block"
                w.main.style.background=`linear-gradient(to right,${ItemQualitySettings[item.def.quality].color1}42,${ItemQualitySettings[item.def.quality].color2}42)`
            }else{
                w.name.innerText=""
                w.image.style.display="none"
                w.main.style.background=""
            }
        }
    }
    update_hand(extra?:{ammo:number,liquid:boolean}){
        if(this.current_weapon!==-1&&this.weapons_html[this.current_weapon]){
            this.weapons_html[this.current_weapon]!.main.classList.remove("weapon-slot-selected")
            this.weapons_html[this.current_weapon]!.main.style.border=""
        }
        const weapon=this.inventory.weapons[this.inventory.weapon_idx]
        if(!weapon)return
        if(weapon.item_type===InventoryItemType.melee){
            //
        }else if(weapon.item_type===InventoryItemType.gun&&(weapon.def as GunDef).reload){
            this.content.hand_info.count.innerText=`${extra?.ammo??0}/${(weapon.def as GunDef).reload?.capacity}`

            this.content.hand_info.consume_type.src=this.game.resources.get_sprite((weapon.def as GunDef).ammoType).src
            this.content.hand_info.consume_type.style.display=""
        }
        this.current_weapon=this.inventory.weapon_idx
        this.weapons_html[this.current_weapon]!.main.style.border=`3px solid ${ItemQualitySettings[weapon.def.quality].color2}`
        this.weapons_html[this.current_weapon]!.main.classList.add("weapon-slot-selected")
    }
    inventory_dirty(_i:string){
        /*switch(i){
            case "weapons":
                this.update_weapons()
                break
        }*/
    }
    clear(){
        
    }
    melee_free():boolean{
        return this.inventory.weapon_is_free(0)
    }
    gun_free():boolean{
        return this.inventory.weapon_is_free(1)||this.inventory.weapon_is_free(2)
    }
    handle_slot_click(e:MouseEvent){
        const t=e.currentTarget as HTMLDivElement
        if(e.button==2){
            if(t.dataset.drop_kind==="2"){
                this.game.action.actions.push({type:InputActionType.drop,drop:parseInt(t.dataset.drop!),drop_kind:2})
            }else if(t.dataset.drop_kind==="3"){
                this.game.action.actions.push({type:InputActionType.drop,drop:parseInt(t.dataset.slot!),drop_kind:3})
            }
        }else if(e.button===0){
            if(t.dataset.drop_kind==="3"){
                this.game.action.actions.push({type:InputActionType.use_item,slot:parseInt(t.dataset.slot!)})
            }
        }
    }
    oitems_cache:Map<string,HTMLDivElement>=new Map()
    update_oitems(){
        const ak=Object.keys(this.inventory.oitems)
        const ack=Array.from(this.oitems_cache.entries())
        if(ack.length===ak.length&&ack.length>0){
            for(const a of ak){
                const def=Ammos.getFromString(a)
                const c=`${this.inventory.oitems[a]}${def.liquid?"l":""}`
                const c1=this.oitems_cache.get(a)!.querySelector(".count") as HTMLSpanElement
                c1.innerText=`${c}`
            }
        }else{
            this.content.oitems.innerHTML=""
            this.oitems_cache.clear()
            for(const a of ak){
                const def=Ammos.getFromString(a)
                const c=`${this.inventory.oitems[a]}${def.liquid?"l":""}`
                const htm=`<div class="oitem-slot" id="ammo-${a}">
                    <image class="icon" src="img/game/main/items/ammos/${a}.svg"></image>
                    <span class="count">${c}</span>
                </div>`

                this.content.oitems.insertAdjacentHTML("beforeend", htm);
                const ele=this.content.oitems.querySelector(`#ammo-${a}`) as HTMLDivElement
                this.oitems_cache.set(a,ele)
                ele.dataset.drop_kind="2"
                ele.dataset.drop=def.idNumber!.toString()
                ele.addEventListener("mousedown",this.handle_slot_click.bind(this))
            }
        }
    }
}