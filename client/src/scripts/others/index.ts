import { ResourcesManager, ShowElement, WebglRenderer} from "../engine/mod.ts"
import { Game} from "./game.ts"
import { ConfigCasters, ConfigDefaultActions, ConfigDefaultValues } from "./config.ts";
import "../../scss/main.scss"
import { GuiManager } from "../managers/guiManager.ts";
import { SoundManager } from "../engine/sounds.ts";
import { OfflineGameServer } from "./offline.ts";
import { BasicSocket, Client, IPLocation, random } from "common/scripts/engine/mod.ts";
import { GameConsole } from "../engine/console.ts";
import { MenuManager } from "../managers/menuManager.ts";
import { InputManager } from "../engine/keys.ts"
import { ConfigType } from "common/scripts/config/config.ts";
import { WorkerSocket } from "common/scripts/engine/server_offline/worker_socket.ts";
import { NewMDLanguageManager } from "./languages.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { PlayArgs } from "./constants.ts";
import { isMobile } from "../engine/game.ts";
(async() => {
    async function requestImmersive() {
        const el = document.documentElement;
        if (!document.fullscreenElement) {
            if (el.requestFullscreen) {
                await el.requestFullscreen({ navigationUI: "hide" });
            } else if ((el as any).webkitRequestFullscreen) {
                await (el as any).webkitRequestFullscreen();
            }
        }
        if ((window as any).Capacitor?.Plugins?.StatusBar) {
            try {
                await (window as any).Capacitor.Plugins.StatusBar.hide();
            } catch {}
        }
    }
    
    document.addEventListener("touchstart", requestImmersive);
    document.addEventListener("visibilitychange", async () => {
        if ((!document.hidden)&&isMobile) {
            await requestImmersive();
        }
    })

    const canvas=document.querySelector("#game-canvas") as HTMLCanvasElement

    const inputs=new InputManager(100)
    inputs.bind(canvas)

    const GameSave=new GameConsole()
    GameSave.input_manager=inputs
    GameSave.default_actions=ConfigDefaultActions
    GameSave.casters=ConfigCasters
    GameSave.default_values=ConfigDefaultValues
    GameSave.init("suroimd2-config")

    const sounds=new SoundManager()
    const tm=await NewMDLanguageManager("english","/languages")
    sounds.volumes={
        "players":1,
        "music":1,
        "loot":1,
        "obstacles":1,
        "explosions":1,
        "ambience":1,
        "ui":1
    }

    const renderer=new WebglRenderer(canvas,undefined,GameSave.get_variable("cv_graphics_renderer")==="webgl1"?1:2)

    const resources=new ResourcesManager(renderer,sounds)
    await resources.load_audio("menu_music",{src:`/sounds/musics/menu_music_${random.int(1,2)}.mp3`,volume:1},"essentials")
    //await resources.load_audio("menu_music_2",{src:"/sounds/musics/menu_music_2.mp3",volume:1},"essentials")
    await resources.load_audio("button_click",{src:"/sounds/ui/button_click.mp3",volume:1},"essentials")
    const menu_manager=new MenuManager(GameSave,resources,sounds)
    menu_manager.start()

    const gui=new GuiManager()
    class App{
        game:Game

        elements={
            play_button_normal:document.querySelector("#btn-play-normal") as HTMLButtonElement,
            play_button_campaign:document.querySelector("#btn-play-campaign") as HTMLButtonElement
        }

        game_server?:OfflineGameServer

        constructor(){
            this.elements.play_button_campaign.addEventListener("click",(_e)=>{
                //this.playGame({offline:true})
            })
            this.game=new Game(inputs,menu_manager,sounds,GameSave,resources,tm,renderer)
            this.game.listners_init()
            this.game.init_gui(gui)
            this.game.onstop=this.closeGame.bind(this)
            menu_manager.play_callback=this.playGame.bind(this)
        }
        async playGame(join_config:PlayArgs){
            if(this.game.happening)return
            let socket:BasicSocket
            switch(join_config.type){
                case "online":{
                    this.game.offline=false
                    const reg=menu_manager.api_settings.regions[GameSave.get_variable("cv_game_region")]
                    const ser=new IPLocation(reg.host,reg.port)
                    const ghost=await((await fetch(`${ser.toString("http")}/api/get-game`)).json())
                    if(ghost.status===0){
                        socket=new WebSocket(`ws${ghost.address}/api/ws`) as unknown as BasicSocket
                    }
                    break
                }
                case "campaign":{
                    const worker = new Worker(new URL("./worker_server.ts", import.meta.url), {
                        type: "module",
                    });

                    this.game.offline=true
                    worker.postMessage({
                        type: "start",
                        config: {
                            game: {
                                options: {
                                    gameTps: 100,
                                    netTps: 30
                                },
                                debug:{
                                    deenable_lobby:true,
                                    debug_menu:true,
                                }
                            },
                            database: {
                                enabled: false,
                                statistic:false
                            },
                        } as ConfigType,
                        bots: 99,
                        ping: GameSave.get_variable("cv_game_ping"),
                    });

                    socket = new WorkerSocket(worker);
                    break
                }
            }
            ShowElement(menu_manager.content.loading_screen,true)
            const c=new Client(socket!,PacketManager)
            c.onopen=this.game.connected.bind(this.game,c,GameSave.get_variable("cv_loadout_name"))
            this.game.running=true
        }
        closeGame(){
            if(menu_manager.account.enabled)menu_manager.account.update_account()
            this.game.scene.objects.clear()
            this.game.guiManager.clear()
            this.game.menuManager.game_end()
            this.game.client?.disconnect()
            this.game.happening=false
            this.game.running=false
            this.game.clock.stop()

            if(this.game_server){
                this.game_server.clock.stop()
                this.game_server.running=false
                this.game_server=undefined
            }
        }

    }
    const app=new App()
})()