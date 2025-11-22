    import { Skins } from "common/scripts/definitions/loadout/skins.ts";
    import { type GameConsole } from "../engine/console.ts";
    import { ResourcesManager } from "../engine/resources.ts";
    import { HideElement, ShowElement } from "../engine/utils.ts";
    import { api, API_BASE } from "../others/config.ts";
    import { ApiSettingsS } from "common/scripts/config/config.ts";
    import { ShowTab } from "../engine/mod.ts";
    import { SoundManager } from "../engine/sounds.ts";
    import { AccountManager } from "./accountManager.ts";

    export class MenuManager{
        save:GameConsole
        api_settings:ApiSettingsS
        account:AccountManager=new AccountManager()
        tabButtons:Record<string,Record<string,string[]>> = {
            play: {
                campaign: ["campaign", "play"]
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

        content={
            menuD:document.querySelector("#menu") as HTMLDivElement,
            gameD:document.querySelector("#game") as HTMLDivElement,
            insert_name:document.body.querySelector("#insert-name") as HTMLInputElement,
            menu_p:document.body.querySelector("#menu-options") as HTMLDivElement,

            loading_screen:document.body.querySelector("#loading-screen") as HTMLDivElement,

            select_region:document.body.querySelector("#select-region") as HTMLButtonElement,

            settings:{
                graphics_textures:document.body.querySelector("#settings-graphics-texture") as HTMLSelectElement,
                graphics_particles:document.body.querySelector("#settings-graphics-particles") as HTMLSelectElement,
                graphics_lights:document.body.querySelector("#settings-graphics-lights") as HTMLSelectElement,
                graphics_post_proccess:document.body.querySelector("#settings-graphics-post-proccess") as HTMLSelectElement,
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
            }
        }
        resources:ResourcesManager
        submenu_param:boolean
        sounds:SoundManager
        constructor(save:GameConsole,resources:ResourcesManager,sounds:SoundManager){
            this.save=save
            const params = new URLSearchParams(self.location.search)
            const submenu = params.get("menu")
            this.sounds=sounds
            this.resources=resources
            this.menu_tabs["play"]={
                "campaign":document.body.querySelector("#campaign-levels") as HTMLElement,
                "gamemode":document.body.querySelector("#gamemode-image") as HTMLElement,
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
                        enabled:true,
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
            const music=this.sounds.get_manipulative_si("music")??this.sounds.add_manipulative_si("music")
            const menu_music=this.resources.get_audio("menu_music")
            this.sounds.signals.on("load",()=>{
                music?.set(menu_music)
            })
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
                        ShowTab("gamemode",this.menu_tabs["play"])
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
                "menu_music",
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
                this.api_settings=await(await fetch(`${API_BASE}/get-settings`)).json()
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
        }
        setupTabButtons() {
            for (const submenu in this.tabButtons) {
                for (const btnName in this.tabButtons[submenu]) {
                    const [tab, group] = this.tabButtons[submenu][btnName];
                    const btn = this.content.submenus.buttons[btnName];
                    btn.addEventListener("click", () => ShowTab(tab, this.menu_tabs[group]));
                }
            }
        }
        start(){
            this.content.insert_name.value=this.save.get_variable("cv_loadout_name")
            this.content.insert_name.addEventListener("change",()=>{
                this.save.set_variable("cv_loadout_name",this.content.insert_name.value)
            })
            this.content.select_region.addEventListener("change",()=>{
                this.save.set_variable("cv_game_region",this.content.select_region.value)
            })

            this.setupTabButtons()

            //Graphics
            this.content.settings.graphics_textures.value=this.save.get_variable("cv_graphics_resolution")
            this.content.settings.graphics_textures.addEventListener("change",()=>{
                this.save.set_variable("cv_graphics_resolution",this.content.settings.graphics_textures.value)
            })
            this.content.settings.graphics_particles.value=this.save.get_variable("cv_graphics_particles")
            this.content.settings.graphics_particles.addEventListener("change",()=>{
                this.save.set_variable("cv_graphics_particles",this.content.settings.graphics_particles.value)
            })
            this.content.settings.graphics_lights.value=this.save.get_variable("cv_graphics_lights")
            this.content.settings.graphics_lights.addEventListener("change",()=>{
                this.save.set_variable("cv_graphics_lights",this.content.settings.graphics_lights.value)
            })
            this.content.settings.graphics_post_proccess.value=this.save.get_variable("cv_graphics_post_proccess")
            this.content.settings.graphics_post_proccess.addEventListener("change",()=>{
                this.save.set_variable("cv_graphics_post_proccess",this.content.settings.graphics_post_proccess.value)
            })
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
    }