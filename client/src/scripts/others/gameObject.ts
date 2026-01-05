import { ClientGameObject2D } from "../engine/game.ts";
import { type Player } from "../gameObjects/player.ts";
import { type Game } from "./game.ts";

export abstract class GameObject extends ClientGameObject2D{
    declare game:Game
    can_interact(player:Player):boolean{return false}
    interact(player:Player):void{}
    get_interact_hint(player: Player): string{return ""}
    auto_interact(player:Player):boolean{return false}
}