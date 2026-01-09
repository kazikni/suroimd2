import { OfflineGameServer } from "./offline.ts";
import { OfflineClientsManager } from "common/scripts/engine/mod.ts";
import { ConfigType } from "common/scripts/config/config.ts";
import { WorkerSocket } from "common/scripts/engine/server_offline/worker_socket.ts";
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
            msg.config as ConfigType,
            msg.level
        );
        server.mainloop(true)
        const ws=new WorkerSocket(self as unknown as Worker)
        server.clients.fake_connect_other_s(ws)
    }
};
