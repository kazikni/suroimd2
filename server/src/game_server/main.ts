import { GameServer } from "./others/server.ts"
import { Server } from "../engine/mod.ts"
import { loadConfigDeno } from "../../configs/config.ts";
import { HostConfig } from "common/scripts/engine/server_offline/offline_server.ts";

function new_server_from_hc(hc:HostConfig):Server{
  if(hc.https){
    return new Server(hc.port,hc.https,hc.cert,hc.key)
  }
  return new Server(hc.port)
}

// Game Server
function hostGame(){
  return new Promise(()=>{
    const Config=loadConfigDeno("../config.json")
    if(Config.game.host){
      const server=new GameServer(new_server_from_hc(Config.game.host),Config)
      server.run()
    }
  })
}

if (import.meta.main) {
  hostGame()
}