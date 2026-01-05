import { GInventoryBase, GunItemBase, MDItem, MeleeItemBase } from "common/scripts/others/inventory.ts";
import { Frame, type ResourcesManager, Sound } from "../engine/resources.ts";
export abstract class LItem extends MDItem{
    declare inventory:GInventory
    abstract assets(resources:ResourcesManager):Record<string,Sound|Frame>
}
export class GunItem extends GunItemBase implements LItem{
    declare inventory:GInventory
    assets(resources:ResourcesManager):Record<string,Sound|Frame>{
        return {
            "item":resources.get_sprite(this.def.assets?.item??this.def.idString)
        }
    }
}
export class MeleeItem extends MeleeItemBase implements LItem{
    declare inventory:GInventory
    assets(resources:ResourcesManager):Record<string,Sound|Frame>{
        return {
            "item":resources.get_sprite(this.def.assets?.item??this.def.idString)
        }
    }
}
export class GInventory extends GInventoryBase<LItem>{
    on_dirty?:(i:string)=>void
    override dirty(it: string): void {
        if(this.on_dirty)this.on_dirty(it)
    }
}