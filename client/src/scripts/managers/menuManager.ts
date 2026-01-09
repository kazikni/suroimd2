import { Skins } from "common/scripts/definitions/loadout/skins.ts";
import { SettingInputConfig, type GameConsole } from "../engine/console.ts";
import { ResourcesManager } from "../engine/resources.ts";
import { formatToHtml, HideElement, ShowElement } from "../engine/utils.ts";
import { api, API_BASE } from "../others/config.ts";
import { ApiSettingsS } from "common/scripts/config/config.ts";
import { ShowTab } from "../engine/mod.ts";
import { SoundManager } from "../engine/sounds.ts";
import { AccountManager } from "./accountManager.ts";
import { PlayArgs } from "../others/constants.ts";  
import { LevelDefinition } from "common/scripts/config/level_definition.ts";

export class MenuManager{
    save:GameConsole
    api_settings:ApiSettingsS
    account:AccountManager=new AccountManager()
    tabButtons:Record<string,Record<string,string[]>> = {
        play: {
            campaign: ["campaign", "play"],
            team: ["team", "play"],
        },
        settings: {
            graphics: ["graphics", "settings"],
            game: ["game", "settings"],
            sounds: ["sounds", "settings"],
            keys: ["keys", "settings"],
        },
        about: {
            social: ["social", "about"],
            news: ["news", "about"],
            rules: ["rules", "about"],
            credits: ["credits", "about"],
        }
    };
    submenus_options:Record<string,Record<string,Record<string,SettingInputConfig>>>={
        "settings":{
            "graphics":{
                "renderer":{
                    options:[{name:"Webgl1",value:"webgl1"},{name:"Webgl2",value:"webgl2"}],
                    type:"select"
                },
                "resolution":{
                    options:[
                        {name:"Very Low",value:"very-low"},
                        {name:"Low",value:"low"},
                        {name:"Medium",value:"medium"},
                        {name:"high",value:"high"},
                        {name:"Very High",value:"very-high"},
                    ],
                    type:"select"
                },
                "particles":{
                    options:[
                        {value:"0",name:"No"},
                        {value:"1",name:"Normal"},
                        {value:"2",name:"Advanced"},
                    ],
                    type:"select"
                },
                "lights":{
                    options:[
                        {value:"0",name:"No"},
                        {value:"1",name:"Normal"},
                        {value:"2",name:"Advanced"},
                    ],
                    type:"select"
                },
                "post_proccess":{
                    options:[
                        {value:"0",name:"No"},
                        {value:"1",name:"Normal"},
                        {value:"2",name:"Advanced"},
                    ],
                    type:"select"
                },
            },
        }
    }
    submenus_html:Record<string,Record<string,HTMLDivElement>>={
        "settings":{
            "graphics":document.querySelector("#settings-sm-graphics") as HTMLDivElement
        }
    }
    content={
        menuD:document.querySelector("#menu") as HTMLDivElement,
        gameD:document.querySelector("#game") as HTMLDivElement,
        insert_name:document.body.querySelector("#insert-name") as HTMLInputElement,
        menu_p:document.body.querySelector("#menu-options") as HTMLDivElement,

        loading_screen:document.body.querySelector("#loading-screen") as HTMLDivElement,

        select_region:document.body.querySelector("#select-region") as HTMLButtonElement,

        settings:{
            graphics_climate:document.body.querySelector("#settings-graphics-climate") as HTMLInputElement,

            game_friendly_fire:document.body.querySelector("#settings-game-friendly-fire") as HTMLInputElement,
            game_client_interpolation:document.body.querySelector("#settings-game-interpolation") as HTMLInputElement,
            game_client_rotation:document.body.querySelector("#settings-game-client-rotation") as HTMLInputElement,
            game_ping:document.body.querySelector("#settings-game-ping") as HTMLInputElement,

            sounds_master_volume:document.body.querySelector("#settings-sounds-master-volume") as HTMLInputElement,
        },
        submenus:{
            play:document.body.querySelector("#menu-play-submenu") as HTMLElement,
            loadout:document.body.querySelector("#menu-loadout-submenu") as HTMLElement,
            settings:document.body.querySelector("#menu-settings-submenu") as HTMLElement,
            account:document.body.querySelector("#menu-account-submenu") as HTMLElement,
            about:document.body.querySelector("#menu-about-submenu") as HTMLElement,
            extras:{
                loadout_c:document.body.querySelector("#loadout-sm-extra-content") as HTMLElement,
                loadout_v:document.body.querySelector("#loadout-sm-extra-view") as HTMLElement
            },
            select:{
                account:document.body.querySelector("#account-button-m") as HTMLButtonElement,
            },
            open_buttons:[
                document.body.querySelector("#play-button-m") as HTMLButtonElement,
                document.body.querySelector("#loadout-button-m") as HTMLButtonElement,
                document.body.querySelector("#settings-button-m") as HTMLButtonElement,
                document.body.querySelector("#account-button-m") as HTMLButtonElement,
                document.body.querySelector("#about-button-m") as HTMLButtonElement,
            ],
            buttons:{
                campaign:document.body.querySelector("#btn-play-campaign") as HTMLButtonElement,
                team:document.body.querySelector("#btn-play-team") as HTMLButtonElement,

                graphics:document.body.querySelector("#btn-settings-graphics") as HTMLButtonElement,
                game:document.body.querySelector("#btn-settings-game") as HTMLButtonElement,
                sounds:document.body.querySelector("#btn-settings-sounds") as HTMLButtonElement,
                keys:document.body.querySelector("#btn-settings-keys") as HTMLButtonElement,

                login:document.body.querySelector("#btn-account-login") as HTMLButtonElement,
                register:document.body.querySelector("#btn-account-register") as HTMLButtonElement,

                social:document.body.querySelector("#btn-about-social") as HTMLButtonElement,
                news:document.body.querySelector("#btn-about-news") as HTMLButtonElement,
                rules:document.body.querySelector("#btn-about-rules") as HTMLButtonElement,
                credits:document.body.querySelector("#btn-about-credits") as HTMLButtonElement,
            } as Record<string,HTMLButtonElement>
        },
        campaing_levels:document.body.querySelector("#campaign-levels") as HTMLDivElement,
        //team_options_div:document.body.querySelector("#menu-play-teams") as HTMLSelectElement,
        play_buttons:document.body.querySelector("#menu-play-buttons") as HTMLDivElement,
    }
    resources:ResourcesManager
    submenu_param:boolean
    sounds:SoundManager

    play_callback?:(play_args:PlayArgs)=>void
    constructor(save:GameConsole,resources:ResourcesManager,sounds:SoundManager){
        this.save=save
        const params = new URLSearchParams(self.location.search)
        const submenu = params.get("menu")
        this.sounds=sounds
        this.resources=resources
        this.menu_tabs["play"]={
            "campaign":document.body.querySelector("#campaign-levels") as HTMLElement,
            "gamemode":document.body.querySelector("#gamemode-view") as HTMLElement,
            "team":document.body.querySelector("#gamemode-team") as HTMLElement,
        }
        this.menu_tabs["settings"]={
            "graphics":document.body.querySelector("#settings-sm-graphics") as HTMLElement,
            "game":document.body.querySelector("#settings-sm-game") as HTMLElement,
            "sounds":document.body.querySelector("#settings-sm-sounds") as HTMLElement,
        }
        this.menu_tabs["account"]={
            "login":document.body.querySelector("#account-sm-login") as HTMLElement,
            "register":document.body.querySelector("#account-sm-register") as HTMLElement,
        }
        this.menu_tabs["about"]={
            "social":document.body.querySelector("#about-sm-social") as HTMLElement,
            "news":document.body.querySelector("#about-sm-news") as HTMLElement,
            "rules":document.body.querySelector("#about-sm-rules") as HTMLElement,
            "credits":document.body.querySelector("#about-sm-credits") as HTMLElement,
        }

        this.load_menu(submenu)
        this.submenu_param=!!params

        this.api_settings={
            modes:[
                {
                    gamemode:"normal",
                    team_size:[1]
                },
            ],
            debug:{
                debug_menu:true,
            },
            database:{
                enabled:false,
            },
            regions:{
                "local":{
                    host:"localhost",
                    port:8080
                }
            },
            shop:{
                skins:{

                }
            }
        }
        
        HideElement(this.content.gameD)
        ShowElement(this.content.menuD)
        HideElement(this.content.loading_screen)
        this.content.loading_screen.style.opacity="0"
        this.reload_close_btn()
        for(const btn of this.content.submenus.open_buttons){
            btn.addEventListener("click",this.open_button_func.bind(this))
        }
        this.load_resources(["main"])
        this.update_api()
    }
    reload_close_btn(){
        document.querySelectorAll(".submenu-close-btn").forEach((v,_k)=>{
            (v as HTMLButtonElement).onclick=this.load_menu.bind(this,null)
        })
    }
    menu_tabs:Record<string,Record<string,HTMLElement>>={}
    open_button_func(ev:MouseEvent){
        const t=ev.currentTarget as HTMLButtonElement
        this.load_menu(t.attributes.getNamedItem("menu-id")?.value as string|null)
    }
    load_menu(submenu:string|null){
        HideElement(this.content.submenus.play,true)
        HideElement(this.content.submenus.loadout,true)
        HideElement(this.content.submenus.settings,true)
        HideElement(this.content.submenus.about,true)
        HideElement(this.content.submenus.account,true)

        if(submenu){
            HideElement(this.content.menu_p,true)
            switch(submenu){
                case "play":
                    ShowElement(this.content.submenus.play,true)
                    ShowTab("campaign",this.menu_tabs["play"])
                    break
                case "loadout":
                    ShowElement(this.content.submenus.loadout,true)
                    this.show_your_skins()
                    break
                case "settings":
                    ShowElement(this.content.submenus.settings,true)
                    ShowTab("graphics",this.menu_tabs["settings"])
                    break
                case "account":
                    ShowElement(this.content.submenus.account,true)
                    break
                case "about":
                    ShowElement(this.content.submenus.about,true)
                    ShowTab("social",this.menu_tabs["about"])
                    break
                }
        }else{
            ShowElement(this.content.menu_p,true)
        }
    }
    loaded=false
    loaded_textures:string[]=[]

    async load_resources(textures:string[]=["main"]){
        if(!this.resources||(this.loaded_textures.length==textures.length&&textures==this.loaded_textures))return
        ShowElement(this.content.loading_screen,true)
        this.loaded=false
        this.resources.clear([
            "button_click",
            "essentials",
            ...textures
        ])
        for(const tt of textures){
            const spg=await(await fetch(`atlases/atlas-${tt}-data.json`)).json()
            for(const s of spg[this.save.get_variable("cv_graphics_resolution")]){
                await this.resources.load_spritesheet("",s,undefined,tt)
            }
        }

        await this.resources.load_group("/sounds/game/main.json","main")
        await this.resources.load_audio("rain_ambience",{src:"/sounds/ambience/rain_ambience.mp3",volume:1},"essentials")
        await this.resources.load_audio("storm_ambience",{src:"/sounds/ambience/storm_ambience.mp3",volume:1},"essentials")
        await this.resources.load_audio("snowstorm_ambience",{src:"/sounds/ambience/snowstorm_ambience.mp3",volume:1},"essentials")

        await this.resources.load_audio("thunder_1",{src:"/sounds/ambience/thunder_1.mp3",volume:1},"essentials")
        await this.resources.load_audio("thunder_2",{src:"/sounds/ambience/thunder_2.mp3",volume:1},"essentials")
        await this.resources.load_audio("thunder_3",{src:"/sounds/ambience/thunder_3.mp3",volume:1},"essentials")
        this.loaded=true
        HideElement(this.content.loading_screen,true)
    }
    async update_api(){
        this.content.select_region.innerHTML=""
        if(api){
            let js=this.api_settings
            try{
                js=await(await fetch(`${API_BASE}/get-settings`)).json()
            }catch(e){
                console.log(e)
            }
            this.api_settings=js
        }
        for(const region of Object.keys(this.api_settings.regions)){
            this.content.select_region.insertAdjacentHTML("beforeend",`<option value=${region}>${region}</option>`)
        }
        this.content.select_region.value=this.save.get_variable("cv_game_region")
        if(this.api_settings.database.enabled){
            this.account.enable(this)
        }else{
            this.content.submenus.select.account.remove()
        }

        const newsS=this.content.submenus.about.querySelector("#about-sm-news") as HTMLDivElement
        newsS.innerHTML=""
        const news=await(await fetch(`${API_BASE}/news/get`)).json() as {title:string,id:string,content:string}[]
        for(const n of news){
            newsS.innerHTML+=`<h2>${n.title}</h2>`
            const d=document.createElement("div")
            d.classList.add("update-item")
            d.innerHTML=formatToHtml(n.content)
            d.innerHTML+=`<a href="/pages/news/?id=${n.id}"><h3>See More</h3></a>`
            newsS.appendChild(d)
        }

        this.update_modes()
    }
    update_modes(){
        this.content.play_buttons.innerHTML="<p class=\"span\">Online</p>"
        this.api_settings.modes.forEach((mode)=>{
            const btn=document.createElement("button")
            btn.className="btn-green"
            btn.innerText=mode.gamemode
            btn.onclick=()=>{
                ShowTab("gamemode",this.menu_tabs["play"])
                const gm_view=this.menu_tabs["play"]["gamemode"]
                gm_view.innerHTML=`
<div class="play-select-item background-menu">
    <h1>${mode.gamemode}</h1>
    <div class="gamemode-image" style="background-image: url('/img/menu/modes/${mode.gamemode}.gif');"></div>
    <button id="btn-join-${mode.gamemode}" class="btn-green">Play</button>
</div>`
                const join_btn=gm_view.querySelector(`#btn-join-${mode.gamemode}`) as HTMLButtonElement
                join_btn.onclick=()=>{
                    console.log(`${mode.gamemode}...`)
                    if(this.play_callback)this.play_callback({type:"online",mode:mode.gamemode,team_size:mode.team_size[0]})
                }
            }
            this.content.play_buttons.appendChild(btn)
        })
        //this.update_team(true,undefined)
    }
    /*update_team(enabled:boolean,connected?:TeamSetting){
        HideElement(this.content.team_options_div)
        if(enabled){
            if(connected){
                //
            }else{
                ShowElement(this.content.team_options_div)
            }
        }
    }*/
    setupTabButtons() {
        for (const submenu in this.tabButtons) {
            for (const btnName in this.tabButtons[submenu]) {
                const [tab, group] = this.tabButtons[submenu][btnName];
                const btn = this.content.submenus.buttons[btnName];
                btn.addEventListener("click", () => ShowTab(tab, this.menu_tabs[group]));
            }
        }
    }
    async start(){
        this.content.insert_name.value=this.save.get_variable("cv_loadout_name")
        this.content.insert_name.addEventListener("change",()=>{
            this.save.set_variable("cv_loadout_name",this.content.insert_name.value)
        })
        this.content.select_region.addEventListener("change",()=>{
            this.save.set_variable("cv_game_region",this.content.select_region.value)
        })

        this.setupTabButtons()

        for (const sm of Object.keys(this.submenus_options)) {
            for (const ssm of Object.keys(this.submenus_options[sm])) {
                const menu = this.submenus_html[sm][ssm];
                for (const opt of Object.keys(this.submenus_options[sm][ssm])) {
                    const div = document.createElement("div");
                    const id = `${sm}-${ssm}-${opt}`;
                    let tags = "";
        
                    switch (this.submenus_options[sm][ssm][opt].type) {
                        case "select": {
                            tags += `<select class="select-blue" id="${id}">`;
                            for (const s of this.submenus_options[sm][ssm][opt].options) {
                                tags += `<option value="${s.value}">${s.name}</option>`;
                            }
                            tags += `</select>`;
                            break;
                        }
        
                    }
        
                    div.innerHTML = `
                        <span>${opt}</span>
                        ${tags}
                    `;
        
                    menu.appendChild(div);
        
                    queueMicrotask(() => {
                        const el = menu.querySelector(`#${id}`) as HTMLSelectElement;
                        if (!el) return;
        
                        const saved = this.save.get_variable(`cv_${ssm}_${opt}`);
        
                        if (saved !== undefined && saved !== null) {
                            el.value = saved;
                        }
                        el.addEventListener("change",()=>{
                            this.save.set_variable(`cv_${ssm}_${opt}`,el.value)
                        })
                    });
                }
            }
        }

        //Graphics
        this.content.settings.graphics_climate.checked=this.save.get_variable("cv_graphics_climate")
        this.content.settings.graphics_climate.addEventListener("click",()=>{
            this.save.set_variable("cv_graphics_climate",this.content.settings.graphics_climate.checked)
        })
        //Game
        this.content.settings.game_friendly_fire.checked=this.save.get_variable("cv_game_friendly_fire")
        this.content.settings.game_friendly_fire.addEventListener("click",()=>{
            this.save.set_variable("cv_game_friendly_fire",this.content.settings.game_friendly_fire.checked)
        })
        this.content.settings.game_client_interpolation.checked=this.save.get_variable("cv_game_interpolation")
        this.content.settings.game_client_interpolation.addEventListener("click",()=>{
            this.save.set_variable("cv_game_interpolation",this.content.settings.game_client_interpolation.checked)
        })
        this.content.settings.game_client_rotation.checked=this.save.get_variable("cv_game_client_rot")
        this.content.settings.game_client_rotation.addEventListener("click",()=>{
            this.save.set_variable("cv_game_client_rot",this.content.settings.game_client_rotation.checked)
        })
        this.content.settings.game_ping.addEventListener("change",()=>{
            this.save.set_variable("cv_game_ping",this.content.settings.game_ping.value)
        })
        this.content.settings.game_ping.value=this.save.get_variable("cv_game_ping")

        //Sounds
        this.content.settings.sounds_master_volume.addEventListener("change",()=>{
            this.save.set_variable("cv_sounds_master_volume",this.content.settings.sounds_master_volume.value)
            this.sounds.masterVolume=this.save.get_variable("cv_sounds_master_volume")/100
        })
        this.content.settings.sounds_master_volume.value=this.save.get_variable("cv_sounds_master_volume")
        this.sounds.masterVolume=this.save.get_variable("cv_sounds_master_volume")/100

        await this.load_campaign()
        
        /*
        HideElement(this.content.settings_tabs)
        HideElement(this.content.section_tabs)*/
    }
    your_skins:string[]=["default_skin"]
    show_your_skins(){
        this.content.submenus.extras.loadout_c.innerHTML=""
        let sel=this.save.get_variable("cv_loadout_skin")
        if(!Skins.exist(sel))sel="default_skin"
        for(const s of this.your_skins){
            const skin=document.createElement("div")
            skin.id="skin-sel-"+s
            skin.innerHTML=`
<div class="name text">${s}</div>
<img src="${this.resources.get_sprite(s+"_body").src}" class="simage"></div>
            `
            skin.classList.add("skin-view-menu")
            if(s===sel){
                skin.classList.add("skin-view-menu-selected")
            }
            skin.addEventListener("click",this.update_sel_skin.bind(this,s))
            this.content.submenus.extras.loadout_c.appendChild(skin)
        }
        this.update_ss_view(sel)
    }
    update_sel_skin(sel=""){
        if(!Skins.exist(sel))sel="default_skin"
        this.save.set_variable("cv_loadout_skin",sel)
        const ss=this.content.submenus.extras.loadout_c.querySelectorAll(".skin-view-menu-selected")
        ss.forEach((v,_)=>{
            v.classList.remove("skin-view-menu-selected")
        })
        const skin=this.content.submenus.extras.loadout_c.querySelector("#skin-sel-"+sel) as HTMLDivElement
        skin.classList.add("skin-view-menu-selected")
        this.update_ss_view(sel)
    }
    update_ss_view(sel:string){
        this.content.submenus.extras.loadout_v.innerHTML=`
            <img src="${this.resources.get_sprite(sel+"_body").src}" class="simage"></div>
        `
    }
    async game_start(assets:string[]){
        ShowElement(this.content.gameD)
        HideElement(this.content.menuD)
        await this.load_resources([...assets,"main"])
    }
    game_end(){
        ShowElement(this.content.menuD)
        HideElement(this.content.gameD)
    }
    async load_campaign():Promise<void>{
        const campaign=await(await fetch("/scripts/campaign.json")).json()
        this.content.campaing_levels.innerHTML = ""
        for(const charpter of campaign.charpters){
            this.content.campaing_levels.innerHTML+=`<h2 class="span">${charpter.name}</h2>`
            for(const l of charpter.levels){
                const level:LevelDefinition=await(await fetch(l)).json()
                const level_div = document.createElement("div")
                level_div.className="play-select-item background-menu"
                level_div.innerHTML = `
    <h1>${level.meta.name}</h1>
    <p>Welcome To The Island</p>
    <button class="btn-green">Start Level</button>`
                this.content.campaing_levels.appendChild(level_div)
                const start_btn = level_div.querySelector(`.btn-green`) as HTMLButtonElement
                start_btn.onclick = () => {
                    if(this.play_callback)this.play_callback({type:"campaign",level:level,dificulty:2})
                }
            }
        }
    }
}