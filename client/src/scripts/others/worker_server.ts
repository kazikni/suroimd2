import { OfflineGameServer } from "./offline.ts";
import { OfflineClientsManager, random } from "common/scripts/engine/mod.ts";
import { ConfigType } from "common/scripts/config/config.ts";
import { WorkerSocket } from "common/scripts/engine/server_offline/worker_socket.ts";
import { SimpleBotAi } from "../../../../server/src/game_server/player/simple_bot_ai.ts";
import { Backpacks } from "common/scripts/definitions/items/backpacks.ts";
import { Consumibles } from "common/scripts/definitions/items/consumibles.ts";
import { Melees } from "common/scripts/definitions/items/melees.ts";
import { Boosts, BoostType } from "common/scripts/definitions/player/boosts.ts";
import { Helmets, Vests } from "common/scripts/definitions/items/equipaments.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
self.onerror = (e) => {
    console.error("Worker error:", e,e.valueOf())
};
self.onmessage = (ev) => {
    const msg = ev.data;
    if (msg.type === "start") {
        const server = new OfflineGameServer(
            {
                mode:"normal",
                team_size:1
            },
            new OfflineClientsManager(PacketManager),
            0,
            msg.config as ConfigType
        );
        server.mainloop(true)

        for (let i = 0; i < msg.bots-1; i++) {
            const bot = server.add_bot()
            const ai=new SimpleBotAi()
            bot.ai=ai
            /*bot.inventory.set_backpack(Backpacks.getFromString("tactical_pack"))
            bot.inventory.oitems["556mm"]=random.choose([100,200,310])
            bot.inventory.oitems["762mm"]=random.choose([100,200,310])
            bot.inventory.oitems["9mm"]=random.choose([100,200,400])
            bot.inventory.oitems["22lr"]=random.choose([250,500])
            bot.inventory.oitems["12g"]=random.choose([15,30,60,90])
            bot.inventory.oitems["308sub"]=random.choose([40,80])
            bot.inventory.oitems["50cal"]=random.choose([80,160])
            bot.inventory.oitems["explosive_ammo"]=random.choose([5,10,15,20])
            bot.inventory.oitems["gasoline"]=random.choose([5,10,15,20])
            if(Math.random()<=0.5){
                bot.inventory.set_weapon(0,Melees.getFromString(random.choose(["sledgehammer","axe"])))
            }
            bot.vest=Vests.getFromString(random.choose(["basic_vest","regular_vest","tactical_vest"]))
            bot.helmet=Helmets.getFromString(random.choose(["basic_helmet","regular_helmet","tactical_helmet"]))
            bot.inventory.give_item(Consumibles.getFromString("medikit"),4)
            bot.inventory.give_item(Consumibles.getFromString("yellow_pills"),2)
            bot.inventory.give_item(Consumibles.getFromString("red_pills"),2)
            bot.inventory.give_item(Consumibles.getFromString("blue_pills"),2)
            bot.inventory.give_item(Consumibles.getFromString("purple_pills"),2)
            if(Math.random()<=0.5){
                bot.boost_def=Boosts[BoostType.Shield]
                bot.boost=100
            }*/
        }

        const bot = server.add_bot()
        const ai=new SimpleBotAi()
        bot.ai=ai
        //bot.skin=Skins.getFromString("alice_winner")
        bot.inventory.set_backpack(Backpacks.getFromString("tactical_pack"))
        bot.inventory.oitems["556mm"]=random.choose([100,200,310])
        bot.inventory.oitems["762mm"]=random.choose([100,200,310])
        bot.inventory.oitems["9mm"]=random.choose([100,200,400])
        bot.inventory.oitems["22lr"]=random.choose([250,500])
        bot.inventory.oitems["12g"]=random.choose([15,30,60,90])
        bot.inventory.oitems["308sub"]=random.choose([40,80])
        bot.inventory.oitems["50cal"]=random.choose([80,160])
        bot.inventory.oitems["explosive_ammo"]=random.choose([5,10,15,20])
        bot.inventory.oitems["gasoline"]=random.choose([5,10,15,20])
        if(Math.random()<=0.5){
            bot.inventory.set_weapon(0,Melees.getFromString(random.choose(["sledgehammer","axe"])))
        }
        bot.vest=Vests.getFromString("tactical_vest")
        bot.helmet=Helmets.getFromString("tactical_helmet")
        bot.inventory.give_item(Consumibles.getFromString("medikit"),4)
        bot.inventory.give_item(Consumibles.getFromString("yellow_pills"),2)
        bot.inventory.give_item(Consumibles.getFromString("red_pills"),2)
        bot.inventory.give_item(Consumibles.getFromString("blue_pills"),2)
        bot.inventory.give_item(Consumibles.getFromString("purple_pills"),2)

        bot.boost_def=Boosts[BoostType.Shield]
        bot.boost=100

        const ws=new WorkerSocket(self as unknown as Worker)
        server.clients.fake_connect_other_s(ws)
    }
};
