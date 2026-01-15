import { BuildingDef } from "common/scripts/definitions/objects/buildings_base.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { type Player } from "./player.ts";
import { Orientation, v2, Vec2 } from "common/scripts/engine/geometry.ts";
import { Hitbox2D } from "common/scripts/engine/hitbox.ts";
import { NetStream } from "common/scripts/engine/stream.ts";

export class Building extends ServerGameObject {
    stringType = "building"
    numberType = 11

    def!: BuildingDef
    state = 0
    side: Orientation = 0

    spawnHitbox?: Hitbox2D
    dead = false

    constructor() {
        super()
        this.updatable = false
    }

    update(_dt: number): void {}

    override interact(_user: Player): void {}

    create(_args: {}): void {}

    set_definition(def: BuildingDef) {
        if (this.def) return
        this.def = def

        if (def.hitbox) {
            this.base_hitbox = def.hitbox.clone()
            this.update_hitbox()
        }
    }
    set_position(position: Vec2, side: number) {
        this.position = position
        this.side = side as Orientation

        this.update_hitbox()

        if (this.def.spawnHitbox) {
            this.spawnHitbox = this.def.spawnHitbox.transform(this.position, undefined)
        } else {
            this.spawnHitbox = this.hitbox.clone()
        }
    }
    generate(position: Vec2, side: number) {
        this.set_position(position, side)

        for (const l of this.def.loots ?? []) {
            const items = this.game.loot_tables.get_loot(l.table, { withammo: true })
            const p = v2.add_with_orientation(this.position, l.position, this.side)
            for (const li of items) {
                this.game.add_loot(p, li.item, li.count, this.layer)
            }
        }

        this.manager.cells.updateObject(this)
    }

    override encode(stream: NetStream, full: boolean): void {
        if (full) {
            stream.writePosition(this.position)
            .writeUint8(this.side)
            .writeID(this.def.idNumber!)
        }
    }
}
