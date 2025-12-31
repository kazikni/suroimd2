import { Game } from "../others/game.ts";
import { DamageReason, InventoryItemType } from "common/scripts/definitions/utils.ts";
import { ActionsType } from "common/scripts/others/constants.ts";
import { Angle, Numeric, v2, Vec2 } from "common/scripts/engine/mod.ts";
import { DamageSources } from "common/scripts/definitions/alldefs.ts";
import { InputActionType } from "common/scripts/packets/action_packet.ts";
import { BoostType,Boosts } from "common/scripts/definitions/player/boosts.ts";
import { Ammos } from "common/scripts/definitions/items/ammo.ts";
import { KillFeedMessage, KillFeedMessageKillleader, KillFeedMessageType } from "common/scripts/packets/killfeed_packet.ts";
import { JoinedPacket } from "common/scripts/packets/joined_packet.ts";
import { isMobile } from "../engine/game.ts";
import { Debug, GraphicsDConfig } from "../others/config.ts";
import { disableContextMenuPrevent, enableContextMenuPrevent, HideElement, ShowElement } from "../engine/utils.ts";
import { JoystickEvent } from "../engine/keys.ts";
import { PrivateUpdate } from "common/scripts/packets/update_packet.ts";
import { Badges } from "common/scripts/definitions/loadout/badges.ts";
import { EmoteDef, Emotes} from "common/scripts/definitions/loadout/emotes.ts";
import { type Player } from "../gameObjects/player.ts";
import { GameOverPacket } from "common/scripts/packets/gameOver.ts";
import { CrosshairManager } from "./crosshairManager.ts";
import { DefaultCrosshair } from "../defs/crosshair.ts";
import { GameObject } from "../others/gameObject.ts";
export interface HelpGuiState{
    driving:boolean
    gun:boolean
    interact:boolean
    information_box_message:string
}
export class GuiManager{
    game!:Game
    content={
        menuD:document.querySelector("#menu") as HTMLDivElement,
        gameD:document.querySelector("#game") as HTMLDivElement,
        game_gui:document.querySelector("#game-gui") as HTMLDivElement,
        health_bar_interior:document.querySelector("#health-bar") as HTMLDivElement,
        health_bar_animation:document.querySelector("#health-bar-animation") as HTMLDivElement,
        health_bar_amount:document.querySelector("#health-bar-amount") as HTMLSpanElement,

        _bar_interior:document.querySelector("#boost-bar") as HTMLDivElement,
        _bar_amount:document.querySelector("#boost-bar-amount") as HTMLSpanElement,

        action_info_delay:document.querySelector("#action-info-delay") as HTMLSpanElement,
        action_info:document.querySelector("#action-info") as HTMLDivElement,

        helmet_slot:document.querySelector("#helmet-slot") as HTMLImageElement,
        vest_slot:document.querySelector("#vest-slot") as HTMLImageElement,

        debug_menu:document.querySelector("#game-debug-menu") as HTMLDivElement,

        gameOver:document.querySelector("#gameover-container") as HTMLDivElement,
        
        gameOver_main_message:document.querySelector("#gameover-main-message") as HTMLDivElement,
        gameOver_kills:document.querySelector("#gameover-kills") as HTMLDivElement,
        gameOver_damaged:document.querySelector("#gameover-damaged") as HTMLDivElement,
        gameOver_score:document.querySelector("#gameover-score") as HTMLDivElement,
        gameOver_menu_btn:document.querySelector("#gameover-menu-btn") as HTMLButtonElement,

        killfeed:document.querySelector("#killfeed-container") as HTMLDivElement,
        
        information_killbox:document.querySelector("#information-killbox") as HTMLDivElement,
        information_interact:document.querySelector("#information-interaction") as HTMLDivElement,

        killeader_span:document.querySelector("#killeader-text") as HTMLSpanElement,

        help_gui:document.querySelector("#help-gui") as HTMLDivElement,

        debug_show:document.querySelector("#debug-show") as HTMLDivElement,

        post_proccess:{
            vignetting:document.querySelector("#vignetting-gfx") as HTMLDivElement,
            tiltshift:document.querySelector("#tiltshift-gfx") as HTMLDivElement,
            recolor:document.querySelector("#recolor-gfx") as HTMLDivElement,
        },
        debug:{
            input_item_id:document.querySelector("#debug-item-id") as HTMLInputElement,
            input_item_count:document.querySelector("#debug-item-count") as HTMLInputElement,
            btn_give:document.querySelector("#debug-give-item") as HTMLButtonElement,
            btn_spawn:document.querySelector("#debug-spawn-item") as HTMLButtonElement,
        },
        emote_wheel:{
            main:document.querySelector("#emote-wheel") as HTMLDivElement,
            hover:document.querySelector("#emote-wheel-hover") as HTMLImageElement,

            emotes:[
                document.querySelector("#emote-wheel-right") as HTMLImageElement,
                document.querySelector("#emote-wheel-bottom") as HTMLImageElement,
                document.querySelector("#emote-wheel-left") as HTMLImageElement,
                document.querySelector("#emote-wheel-top") as HTMLImageElement
            ]
        }
    }
    mobile_content={
        gui:document.querySelector("#game-mobile-gui") as HTMLDivElement,
        left_joystick:document.querySelector("#left-joystick") as HTMLDivElement,
        right_joystick:document.querySelector("#right-joystick") as HTMLDivElement,

        btn_interact:document.querySelector("#btn-mobile-interact") as HTMLButtonElement,
        btn_reload:document.querySelector("#btn-mobile-reload") as HTMLButtonElement,
    }

    action?:{delay:number,start:number,type:ActionsType}

    killleader?:{
        id:number
        kills:number
    }

    _makeHint(texts: string[]) {
        const div = document.createElement("div")
        for (const t of texts) {
            const span = document.createElement("span")
            span.textContent = t
            div.appendChild(span)
        }
        this.content.help_gui.appendChild(div)
        return div
    }
    helpTexts = {
        driving: this._makeHint(["R - Reverse", "E - Leave"]),
        gun: this._makeHint(["R - Reload"]),
        loot: this._makeHint(["E - Take Loot"]),
        interact: this._makeHint(["E - Interact"]),
    }
    constructor(){
        this.set_health(100,100)
        HideElement(this.content.debug_menu)
        HideElement(this.content.gameOver)

        const deenable_act=()=>{
            this.game.can_act=false
        }
        const enable_act=()=>{
            this.game.can_act=true
        }

        this.content.debug.input_item_id.onfocus=deenable_act
        this.content.debug.input_item_id.onblur=enable_act

        this.content.debug.input_item_count.onfocus=deenable_act
        this.content.debug.input_item_count.onblur=enable_act

        this.content.debug.btn_give.addEventListener("click",(_e)=>{
            this.game.action.actions.push({
                type:InputActionType.debug_give,
                item:this.content.debug.input_item_id.value,
                count:parseInt(this.content.debug.input_item_count.value)
            })
        })
        this.content.debug.btn_spawn.addEventListener("click",(_e)=>{
            this.game.action.actions.push({
                type:InputActionType.debug_spawn,
                item:this.content.debug.input_item_id.value,
                count:parseInt(this.content.debug.input_item_count.value)
            })
        })
        HideElement(this.content.emote_wheel.main)
        HideElement(this.content.information_killbox)
    }
    mobile_init(){
        this.mobile_open()
        let rotating=false
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        this.mobile_content.left_joystick.addEventListener("joystickmove",(e:JoystickEvent)=>{
            this.game.action.movement.x=e.detail.x
            this.game.action.movement.y=e.detail.y
            if(!rotating){
                this.game.set_lookTo_angle(Math.atan2(e.detail.y,e.detail.x),true,0.3)
            }
        })
        this.mobile_content.left_joystick.addEventListener("joystickend",()=>{
            this.game.action.movement.x=0
            this.game.action.movement.y=0
        })
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        this.mobile_content.right_joystick.addEventListener("joystickmove",(e:JoystickEvent)=>{
            rotating=true
            this.game.fake_crosshair.visible=true
            const dist=Math.sqrt(e.detail.x*e.detail.x+e.detail.y*e.detail.y)
            if(dist>0.9){
                this.game.action.use_weapon=true
            }else{
                this.game.action.use_weapon=false
            }
            this.game.set_lookTo_angle(Math.atan2(e.detail.y,e.detail.x))
        })
        this.mobile_content.right_joystick.addEventListener("joystickend",()=>{
                this.game.action.use_weapon=false
            rotating=false
        })
        this.mobile_content.btn_interact.addEventListener("click",()=>{
            this.game.input_manager.emit("actiondown",{action:"interact"})
        })
        this.mobile_content.btn_reload.addEventListener("click",()=>{
            this.game.input_manager.emit("actiondown",{action:"reload"})
        })
    }
    emote_wheel={
        positon:v2.new(0,0),
        active:false,
        current_side:-1,
        emote:[
        ] as EmoteDef[]
    }
    begin_emote_wheel(position:Vec2,emotes?:EmoteDef[]){
        ShowElement(this.content.emote_wheel.main)
        this.content.emote_wheel.main.style.left=`${position.x*100}px`
        this.content.emote_wheel.main.style.top=`${position.y*100}px`
        this.emote_wheel.positon=position
        this.emote_wheel.active=true

        this.emote_wheel_set_emotes(emotes??[
            Emotes.getFromString("emote_neutral"), //Right
            Emotes.getFromString("emote_md_logo"), //Bottom
            Emotes.getFromString("emote_sad"), //Left
            Emotes.getFromString("emote_happy"), //Top
        ])
    }
    emote_wheel_set_emotes(emote:EmoteDef[]){
        for(const ev in this.content.emote_wheel.emotes){
            this.content.emote_wheel.emotes[ev].src=this.game.resources.get_sprite(emote[ev].idString).src
        }
        this.emote_wheel.emote=emote
    }
    end_emote_wheel(){
        HideElement(this.content.emote_wheel.main)
        this.emote_wheel.active=false
        let selected_emote:EmoteDef|undefined=undefined
        if(this.emote_wheel.current_side!==-1){
            selected_emote=this.emote_wheel.emote[this.emote_wheel.current_side]
        }
        if(selected_emote){
            this.game.action.actions.push({
                type:InputActionType.emote,
                emote:selected_emote
            })
        }
    }
    mobile_enabled:boolean=false
    mobile_close(){
        HideElement(this.mobile_content.gui)
        ShowElement(this.content.help_gui)
        this.mobile_enabled=false
    }
    mobile_open(){
        ShowElement(this.mobile_content.gui)
        HideElement(this.content.help_gui)
        this.mobile_enabled=true
    }
    init(game:Game){
        this.game=game
        if(isMobile||Debug.force_mobile){
            this.mobile_init()
        }
        this.game.signals.on("update",this.update.bind(this))
    }
    start(){
        if(this.game.client){
            this.game.client.on("gameover",this.show_game_over.bind(this))
        }
        HideElement(this.content.post_proccess.tiltshift)
        HideElement(this.content.post_proccess.recolor)
        HideElement(this.content.post_proccess.vignetting)
        if(this.game.save.get_variable("cv_graphics_post_proccess")>=GraphicsDConfig.Advanced){
            ShowElement(this.content.post_proccess.tiltshift)
        }
        if(this.game.save.get_variable("cv_graphics_post_proccess")>=GraphicsDConfig.Normal){
            ShowElement(this.content.post_proccess.vignetting)
            ShowElement(this.content.post_proccess.recolor)
        }
        this.game.renderer.canvas.focus()

        this.content.killeader_span.innerText=this.game.language.get("killleader-wait",{})
        this.enableCrosshair()
        enableContextMenuPrevent()
    }
    players_name:Record<number,{name:string,badge:string,full:string}>={}
    process_joined_packet(jp:JoinedPacket){
        this.game.gameOver=false
        for(const p of jp.players){
            const badge_frame=p.badge!==undefined?Badges.getFromNumber(p.badge).idString:""
            const badge_html=badge_frame===""?"":`<img class="badge-icon" src="./img/game/main/loadout/badges/${badge_frame}.svg">`
            this.players_name[p.id]={name:p.name,badge:badge_html,full:`${badge_html}${p.name}`}
        }
        if(jp.kill_leader){
            this.assign_killleader({
                type:KillFeedMessageType.killleader_assigned,
                player:jp.kill_leader
            })
        }
    }
    state:HelpGuiState={
        driving:false,
        interact:false,
        gun:false,
        information_box_message:""
    }
    update_hint(){
        const state=this.state
        for (const [key, el] of Object.entries(this.helpTexts)) {
            el.style.display = this.state[key as keyof HelpGuiState] ? "" : "none";
        }
        if(state.information_box_message!==this.content.information_interact.innerHTML){
            if(state.information_box_message===""){
                HideElement(this.content.information_interact)
            }else{
                ShowElement(this.content.information_interact)
                this.content.information_interact.innerHTML=state.information_box_message
            }
        }
        if(this.mobile_enabled){
            if(this.current_interaction){
                ShowElement(this.mobile_content.btn_interact)
            }else{
                HideElement(this.mobile_content.btn_interact)
            }
            if(state.gun){
                ShowElement(this.mobile_content.btn_reload)
            }else{
                HideElement(this.mobile_content.btn_reload)
            }
        }
    }
    clear(){
        this.content.killfeed.innerHTML=""
        this.content.killeader_span.innerText=""
        this.killleader=undefined
        this.content.help_gui.innerText=""

        this.information_killbox_messages=[]
        this.information_killbox_time=0

        ShowElement(this.content.menuD)
        HideElement(this.content.gameD)
        HideElement(this.content.gameOver)
        ShowElement(this.content.game_gui)
        this.enableCrosshair()
        
        this.game.inventoryManager.clear()
        disableContextMenuPrevent()
    }
    information_killbox_messages:string[]=[]
    information_killbox_time:number=0
    assign_killleader(msg:KillFeedMessageKillleader){
        this.killleader={
            id:msg.player.id,
            kills:msg.player.kills
        }
        this.content.killeader_span.innerText=`${this.killleader.kills} - ${this.players_name[msg.player.id].name}`
    }
    add_killfeed_message(msg:KillFeedMessage){
        const elem=document.createElement("div") as HTMLDivElement
        elem.classList.add("killfeed-message")
        this.content.killfeed.appendChild(elem)
        switch(msg.type){
            case KillFeedMessageType.join:{
                const badge_frame=msg.playerBadge!==undefined?Badges.getFromNumber(msg.playerBadge).idString:""
                const badge_html=badge_frame===""?"":`<img class="badge-icon" src="./img/game/main/loadout/badges/${badge_frame}.svg">`
                this.players_name[msg.playerId]={badge:badge_html,name:msg.playerName,full:`${badge_html}${msg.playerName}`}
                elem.innerHTML=this.game.language.get("killfeed-join",{"player":this.players_name[msg.playerId].full})
                break
            }
            case KillFeedMessageType.kill:{
                switch(msg.damage_reason){
                    case DamageReason.Abstinence:
                        elem.innerHTML=this.game.language.get("killfeed-kill-abstinence",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Explosion:
                    case DamageReason.Player:{
                        if(!msg.killer)break
                        const dsd=DamageSources.valueNumber[msg.killer.used]
                        elem.innerHTML=this.game.language.get("killfeed-kill-player",{
                            player1:this.players_name[msg.killer.id].full,
                            player2:this.players_name[msg.victimId].full,
                            source:this.game.language.get(dsd.idString),
                        })
                        if(msg.killer.id===this.game.activePlayer!.id){
                            this.information_killbox_messages.push(`${msg.killer.kills} Kills`)
                        }
                        if(this.killleader&&msg.killer.id===this.killleader.id){
                            this.killleader.kills=msg.killer.kills
                            this.content.killeader_span.innerText=`${this.killleader.kills} - ${this.players_name[msg.killer.id].name}`
                        }
                        break
                    }
                    case DamageReason.DeadZone:
                        elem.innerHTML=this.game.language.get("killfeed-kill-deadzone",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.SideEffect:
                        elem.innerHTML=this.game.language.get("killfeed-kill-side-effect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Disconnect:
                        elem.innerHTML=this.game.language.get("killfeed-kill-disconnect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Bleend:
                        elem.innerHTML=this.game.language.get("killfeed-kill-bleend",{player:this.players_name[msg.victimId].full})
                        break
                }
                break
            }
            case KillFeedMessageType.down:{
                switch(msg.damage_reason){
                    case DamageReason.Abstinence:
                        elem.innerHTML=this.game.language.get("killfeed-down-abstinence",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Player:
                    case DamageReason.Explosion:{
                        if(!msg.killer)break
                        const dsd=DamageSources.valueNumber[msg.killer.used]
                        elem.innerHTML=this.game.language.get("killfeed-down-player",{
                            player1:this.players_name[msg.killer.id].full,
                            player2:this.players_name[msg.victimId].full,
                            source:this.game.language.get(dsd.idString)
                        })
                        break
                    }
                    case DamageReason.DeadZone:
                        elem.innerHTML=this.game.language.get("killfeed-down-deadzone",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.SideEffect:
                        elem.innerHTML=this.game.language.get("killfeed-down-side-effect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Disconnect:
                        elem.innerHTML=this.game.language.get("killfeed-down-disconnect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Bleend:
                        elem.innerHTML=this.game.language.get("killfeed-down-bleend",{})
                        break
                }
                break
            }
            case KillFeedMessageType.killleader_assigned:{
                elem.innerHTML=this.game.language.get("killfeed-killleader-assigned",{"player":this.players_name[msg.player.id].full})
                this.assign_killleader(msg)
                this.game.sounds.play(this.game.resources.get_audio("kill_leader_assigned"),{
                    volume:0.4
                },"player")
                break
            }
            case KillFeedMessageType.killleader_dead:{
                this.killleader=undefined
                elem.innerHTML=this.game.language.get("killfeed-killleader-dead",{})
                this.content.killeader_span.innerText=this.game.language.get("killleader-wait",{})
                this.game.sounds.play(this.game.resources.get_audio("kill_leader_dead"),{
                    volume:0.6
                },"player")
                break
            }
        }
        this.game.addTimeout(()=>{
            elem.remove()
        },4)

      this.game.signals.emit("killfeed_message",{obj:msg,text:elem.innerHTML})
    }
    crosshair=false
    enableCrosshair() {
        //CrosshairManager.setCursor(this.content.gameD,DynamicCrosshair)
        //CrosshairManager.setCursor(this.content.gameD,AimCrosshair)
        CrosshairManager.setCursor(document.body,DefaultCrosshair)
        this.crosshair=true
    }
    update_crosshair(){
        if(!this.crosshair)return
        let spread=0
        if(this.game.activePlayer?.current_weapon?.item_type===InventoryItemType.gun){
            spread=this.game.activePlayer.current_weapon.spread??0
        }
        CrosshairManager.updateCrosshair(document.body,(spread*11)*this.game.scope_zoom)
    }
    disableCrosshair() {
        document.body.style.cursor = this.game.cursors.default
        this.crosshair=false
    }
    update_gui(priv:PrivateUpdate){
        this.set_health(priv.health,priv.max_health)
        this.set_boost(priv.boost,priv.max_boost,priv.boost_type)

        if(priv.damages){
            for(const ds of priv.damages){
                this.game.add_damageSplash(ds)
            }
        }
        if(priv.dirty.weapons){
            this.game.inventoryManager.inventory.set_weapon(0,priv.weapons.melee)
            this.game.inventoryManager.inventory.set_weapon(1,priv.weapons.gun1)
            this.game.inventoryManager.inventory.set_weapon(2,priv.weapons.gun2)
            this.game.inventoryManager.update_weapons()
        }
        if(priv.dirty.current_weapon&&priv.current_weapon){
            this.game.inventoryManager.inventory.set_weapon_index(priv.current_weapon.slot)
            this.game.inventoryManager.update_hand(priv.current_weapon)
        }
        if (priv.dirty.inventory&&priv.inventory) {
            this.game.inventoryManager.update_items(priv.inventory)
        }        
        if(priv.dirty.action){
            if(priv.action){
                this.action={
                    delay:priv.action.delay,
                    start:Date.now(),
                    type:priv.action.type
                }
            }else{
                this.action=undefined
            }
        }
        if(priv.dirty.oitems){
            this.game.inventoryManager.inventory.oitems={}
            for(const a of Object.keys(priv.oitems)){
                const def=Ammos.getFromNumber(a as unknown as number)
                this.game.inventoryManager.inventory.oitems[def.idString]=priv.oitems[a as unknown as number]
            }
            this.game.inventoryManager.update_oitems()
        }
        if (this.emote_wheel.active) {
            const angle = Angle.rad2deg(
                v2.lookTo(this.emote_wheel.positon, this.game.input_manager.mouse.position)
            )
            const distance = v2.distance(this.emote_wheel.positon, this.game.input_manager.mouse.position)

            const chsrc = "/img/menu/gui/emote_wheel_hover_center.svg"
            const shsrc = "/img/menu/gui/emote_wheel_hover.svg"

            const norm = (angle + 360) % 360

            if (distance > 0.24) {
                if (this.content.emote_wheel.hover.src !== shsrc) {
                    this.content.emote_wheel.hover.src = shsrc
                }

                let sideClass = "wheel-hover"

                if (norm >= 45 && norm < 135) {
                    sideClass += " wheel-hover-bottom"
                    this.emote_wheel.current_side=1
                } else if (norm >= 135 && norm < 225) {
                    sideClass += " wheel-hover-left"
                    this.emote_wheel.current_side=2
                } else if (norm >= 225 && norm < 315) {
                    sideClass += " wheel-hover-top"
                    this.emote_wheel.current_side=3
                } else {
                    sideClass += " wheel-hover-right"
                    this.emote_wheel.current_side=0
                }

                if (this.content.emote_wheel.hover.className !== sideClass) {
                    this.content.emote_wheel.hover.className = sideClass
                }
            } else {
                this.emote_wheel.current_side=-1
                if (this.content.emote_wheel.hover.src !== chsrc) {
                    this.content.emote_wheel.hover.src = chsrc
                    this.content.emote_wheel.hover.className = "wheel-hover wheel-hover-center"
                }
            }
        }

        this.update_crosshair()
    }
    show_game_over(g:GameOverPacket){
        if(this.game.gameOver)return
        this.game.gameOver=true
        ShowElement(this.content.gameOver)
        HideElement(this.content.game_gui)
        this.disableCrosshair()
        if(g.Win){
            this.content.gameOver_main_message.innerHTML=this.game.language.get("gameover-you-win",{})
        }else{
            this.game.ambient.music.set(null)
            if(!this.players_name[g.Eliminator])return
            this.content.gameOver_main_message.innerHTML=this.game.language.get("gameover-eliminated-by",{
                player:`<span id="gameover-eliminator">${this.players_name[g.Eliminator].full}</span>`
            })
            /*this.content.gameOver_status.innerText=`You Die!`
            this.content.gameOver_status.style.color=""
            if(Math.random()<=0.01){
                const ge=document.createElement("span")
                ge.id="gameover-you-dead"
                ge.innerText="You Die!"
                document.body.appendChild(ge)
                setTimeout(()=>{
                    ge.remove()
                },2900)
            }*/
        }
        /*this.content.gameOver_kills.innerText=`Kills: ${g.Kills}`
        this.content.gameOver_damaged.innerText=`Damage Dealth: ${g.DamageDealth}`
        this.content.gameOver_score.innerText=`Score: 0`*/
        this.content.gameOver_menu_btn.onclick=this.game.onstop!.bind(this.game,this.game)
    }
    update_equipaments(){
        /*const player=this.game.scene.objects.get_object({category:CATEGORYS.PLAYERS,id:this.game.activePlayer}) as Player
        if(!player)return
        if(player.helmet){
            this.content.helmet_slot.src=this.game.resources.get_sprite(player.helmet.idString).path
        }else{
            this.content.helmet_slot.src="img/game/common/icons/helmet.svg"
        }
        if(player.vest){
            this.content.vest_slot.src=this.game.resources.get_sprite(player.vest.idString).path
        }else{
            this.content.vest_slot.src="img/game/common/icons/vest.svg"
        }*/
    }
    update(){
        this.update_active_player(this.game.activePlayer)
        if(this.action){
            const w=(Date.now()-this.action.start)/1000
            if(w<this.action.delay){
                ShowElement(this.content.action_info)
                this.content.action_info_delay.innerText=`${Numeric.maxDecimals(this.action.delay-w,1)}s`
            }else{
                this.action=undefined
            }
        }else{
            HideElement(this.content.action_info)
        }
        if(this.information_killbox_messages.length>0){
            if(this.information_killbox_time<=0){
                ShowElement(this.content.information_killbox)
                this.content.information_killbox.innerHTML=this.information_killbox_messages[0]
            }
            this.information_killbox_time+=this.game.dt
            if(this.information_killbox_time>=3){
                this.information_killbox_time=0
                this.information_killbox_messages.splice(this.information_killbox_messages.length-1,1)
                HideElement(this.content.information_killbox)
            }
        }
        this.content.debug_show.innerText=`FPS: ${this.game.fps}`
    }
    current_interaction?: GameObject
    update_active_player(player?: Player) {
        const old_inter=this.current_interaction
        this.current_interaction = undefined
        this.state.interact = false
        this.state.information_box_message = ""
        if (!player) {
            return
        }
        const objs = this.game.scene.objects.cells.get_objects(player.hb, player.layer)
        for (const o of objs) {
            if(!o.can_interact(player)) continue
            this.current_interaction = o
            const hint = o.get_interact_hint(player)
            if(hint) {
                this.state.information_box_message = hint
            }
            if(this.current_interaction!==old_inter){
                if(this.game.save.get_variable("cv_mobile_auto_pickup")&&this.current_interaction.auto_interact(player)){
                    this.game.input_manager.emit("actiondown",{action:"interact"})
                }
            }
            break
        }
        this.update_hint()
    }
    health:number=-1
    boost:number=-1
    boost_type:BoostType=BoostType.Null
    set_health(health:number,max_health:number){
        const p=health/max_health
        if(p==this.health)return
        this.health=health
        this.content.health_bar_interior.style.width =`${p*100}%`
        this.content.health_bar_animation.style.width=`${p*100}%`
        this.content.health_bar_amount.innerText=`${health}/${max_health}`
    }
    set_boost(boost:number,max_boost:number,type:BoostType){
        const p=boost/max_boost
        if(p==this.boost&&this.boost_type==type)return
        this.boost=boost
        this.boost_type=type
        this.content._bar_interior.style.width =`${p*100}%`
        this.content._bar_amount.innerText=`${boost}/${max_boost}`
        this.content._bar_interior.style.backgroundColor=Boosts[type].color
    }
}