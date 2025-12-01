
import { random } from "common/scripts/engine/mod.ts"
import { OfflineClientsManager } from "common/scripts/engine/server_offline/offline_server.ts";
export class ClientsManager extends OfflineClientsManager {
    handler(IDGen?: () => number): (req: Request, url: string[], info: Deno.ServeHandlerInfo) => Response | null {
        return this._createHandler(IDGen);
    }

    handler_log(IDGen?: () => number): (req: Request, url: string[], info: Deno.ServeHandlerInfo) => Response | null {
        return this._createHandler(IDGen, true);
    }

    private _createHandler(IDGen?: () => number, checkLogin: boolean = false) {
        if (!IDGen) {
            IDGen = () => {
                let id: number = random.id();
                while (this.clients.get(id)) {
                    id = random.id();
                }
                return id;
            };
        }

        return (req: Request, url: string[], info: Deno.ServeHandlerInfo) => {
            if (url.length > 1 && url[url.length - 1] != "index.html") {
                return null;
            }

            const upgrade = req.headers.get("upgrade") || "";
            if (upgrade.toLowerCase() != "websocket") {
                return new Response("Request isn't trying to upgrade to WebSocket.", { status: 406 });
            }

            let username: string | null = null;

            if (checkLogin) {
                const cookie = req.headers.get("cookie") ?? "";
                const match = cookie.match(/username=([^;]+)/);
                if (match) {
                    username = decodeURIComponent(match[1]);
                } else {
                    username = "";
                }
            }

            const { socket, response } = Deno.upgradeWebSocket(req);
            // deno-lint-ignore ban-ts-comment
            //@ts-ignore
            socket.onopen = () => {
                const id = IDGen!();
                this.activate_ws(socket, id, info.remoteAddr, username);
            };

            return response;
        };
    }
}