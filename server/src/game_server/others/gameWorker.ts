import { GameConfig, type ConfigType } from "common/scripts/config/config.ts";
import { Game, GameData } from "./game.ts";
import { ClientsManager } from "../../engine/mod.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { Server } from "../../engine/server.ts";

export enum WorkerMessages {
    Begin,
    NewGame,
    SetData 
}

export type WorkerMessage =
    {
        type: WorkerMessages.Begin
        id:number
        config:ConfigType
        port:number
    } | {
        type: WorkerMessages.NewGame
        config?:GameConfig
    } | {
        type: WorkerMessages.SetData
        data:GameData
    };
let game:Game|undefined
let begin:{
    id:number
    config:ConfigType
    clients:ClientsManager
    server:Server
}

const td:TextDecoder=new TextDecoder("utf-8")
const te:TextEncoder=new TextEncoder()
function DataUpdated(data:GameData){
    // deno-lint-ignore ban-ts-comment
    //@ts-ignore
    self.postMessage({
        type:WorkerMessages.SetData,
        data:data
    })
}
self.addEventListener("message",(e)=>{
    // deno-lint-ignore ban-ts-comment
    //@ts-ignore
    const msg=e.data as WorkerMessage
    switch(msg.type){
        case WorkerMessages.Begin:
            if(begin)break
            begin={
                id:msg.id,
                config:msg.config,
                clients:new ClientsManager(PacketManager),
                server:new Server(msg.port,msg.config.game.host.https,msg.config.game.host.cert,msg.config.game.host.key)
            }
            begin.server.route("api/ws",begin.config.database.enabled?begin.clients.handler_log():begin.clients.handler())
            begin.server.run()
            console.log(`Game ${begin.id} Initialized`)
            break
        case WorkerMessages.NewGame:
            if (game){
                game.clock.stop()
                game.running=false
                game.clients.clear()
            }
            game=new Game(msg.config??{team_size:1,mode:"normal"},begin.clients,begin.id,begin.config)
            //game.string_id=uuid.generate() as string
            game.signals.on("update_data",DataUpdated)
            console.log(`Game ${begin.id} Created`)
            game.mainloop(false)

            game.on_stop=()=>{
                if(!game)return
                Game.prototype.on_stop.call(game)
                /*if(begin.config.database.enabled){
                    const f=Deno.openSync(`database/games/game-${game.string_id}`,{write:true,create:true})
                    const encoder = new TextEncoder();
                    f.writeSync(encoder.encode(JSON.stringify({status:game.status,statistic:game.statistics})))
                    f.close()
                }*/
                //(game.replay! as ServerReplayRecorder2D).save_replay(`database/replays/game-${game.string_id}.repl`)
                if(begin.config.database.statistic){
                    const src=begin.config.database.files.statistic??`database/statistic.json`
                    const f=Deno.openSync(src,{write:true,create:true,read:true})
                    f.seekSync(0,Deno.SeekMode.Current)
                    const stat = Deno.statSync(src)
                    const size = stat.size
                    const b = new Uint8Array(size)
                    f.seekSync(0, Deno.SeekMode.Start)
                    f.readSync(b)
                    let js=undefined
                    try {
                        js=JSON.parse(td.decode(b))
                    } catch {
                        js=undefined
                    }
                    f.seekSync(0, Deno.SeekMode.Start)
                    if(js===undefined){
                        f.writeSync(te.encode(JSON.stringify(game.statistics)))
                    }else{
                        const gs=game.statistics!
                        for(const k of Object.keys(gs.items.dropped)){
                            js.items.dropped[k]=(js.items.dropped[k]??0)+gs.items.dropped[k]
                        }
                        for(const k of Object.keys(gs.items.kills)){
                            js.items.kills[k]=(js.items.kills[k]??0)+gs.items.kills[k]
                        }
                        for(const k of Object.keys(gs.loadout.uses)){
                            js.loadout.uses[k]=(js.loadout.uses[k]??0)+gs.loadout.uses[k]
                        }
                        js.player.players+=gs.player.players
                        js.player.disconnection+=gs.player.disconnection
                        f.writeSync(te.encode(JSON.stringify(js,undefined)))
                    }
                }
                const ln:string[]=[]
                for(const p of game.players){
                    if(ln.includes(p.username))continue
                    if(p.earned.coins>0||p.earned.xp>0||p.earned.score>0||p.earned.win>0){
                        ln.push(p.username)
                    }
                    fetch(`${begin.config.api.global}/internal/update-user`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-api-key": begin.config.database.api_key
                        },
                        body: JSON.stringify({
                            username: p.username,
                            kills:p.status.kills+p.account_status.kills,
                            
                            wins:p.account_status.wins+p.earned.win,
                            special_wins:p.account_status.special_wins,
                            coins:p.account_status.coins+p.earned.coins,
                            xp:p.account_status.xp+p.earned.xp,
                            games_total:1
                        })
                    });
                }
            }
            
    }
})