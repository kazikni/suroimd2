import { type Player } from "../gameObjects/player.ts";
import { Angle, CircleHitbox2D, getPatterningShape, Numeric, random, v2 } from "common/scripts/engine/mod.ts";
import { FireMode, GunDef, Guns } from "common/scripts/definitions/items/guns.ts";
import { AmmoItemBase, ConsumibleItemBase, GInventoryBase, GunItemBase, MDItem, MeleeItemBase, ProjectileItemBase } from "common/scripts/others/inventory.ts";
import { DamageReason, InventoryDroppable, InventoryItemType, InventoryPreset } from "common/scripts/definitions/utils.ts";
import { ConsumingAction, ReloadAction } from "./actions.ts";
import { AmmoDef } from "common/scripts/definitions/items/ammo.ts";
import { ConsumibleCondition, ConsumibleDef } from "common/scripts/definitions/items/consumibles.ts";
import { GameItem, GameItems } from "common/scripts/definitions/alldefs.ts";
import { MeleeDef, Melees } from "common/scripts/definitions/items/melees.ts";
import { BackpackDef, Backpacks } from "common/scripts/definitions/items/backpacks.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
import { Obstacle } from "../gameObjects/obstacle.ts";
import { ProjectileDef, Projectiles } from "common/scripts/definitions/objects/projectiles.ts";
import { Ammos } from "common/scripts/definitions/items/ammo.ts";
import { type Loot } from "../gameObjects/loot.ts";
import { Boosts, BoostType } from "common/scripts/definitions/player/boosts.ts";
import { InventorySetup } from "../mode/gamemode.ts";
import { SideEffectType } from "common/scripts/definitions/player/effects.ts";
import { SkinDef } from "common/scripts/definitions/loadout/skins.ts";
import { HelmetDef, Helmets, VestDef, Vests } from "common/scripts/definitions/items/equipaments.ts";
import { PlayerAnimationType } from "common/scripts/others/constants.ts";
import { Slot } from "common/scripts/engine/inventory.ts";
import { Scopes } from "common/scripts/definitions/items/scopes.ts";
export abstract class LItem extends MDItem{
    declare inventory:GInventory
    abstract on_use(user:Player,slot?:Slot<LItem>):void
    abstract on_fire(user:Player):void
    abstract attacking():boolean
    abstract update(user:Player):void
    abstract drop():Loot[]
}
export class GunItem extends GunItemBase implements LItem{
    declare inventory:GInventory
    constructor(def?:GunDef){
        super(def)
    }
    use_delay:number=0
    burst?:{
        t:number
        c:number
    }
    firing:boolean=false
    ammo:number=0
    reloading=false
    dd:boolean=false
    on_use(_user: Player, _slot?: Slot<LItem>): void {
        
    }
    on_fire(user:Player){
        if(this.def.fireMode===FireMode.Single&&!user.input.using_item_down)return
        if(this.has_ammo(user)){
            if(this.use_delay<=0){
                this.switching=false
                this.firing=true
                if(this.def.fireMode===FireMode.Burst&&this.def.burst&&!this.burst){
                    this.burst={
                        c:this.def.burst.sequence,
                        t:this.def.burst.delay
                    }
                    this.use_delay=0
                }else{
                    this.shot(user)
                    this.use_delay=this.def.fireDelay
                }
            }
        }else{
            this.burst=undefined
        }
    }
    has_ammo(user:Player):boolean{
        return (this.ammo>0||!this.def.reload)&&(!this.def.mana_consume||this.has_mana(user))
    }
    has_mana(user:Player){
        return user.boost_def.type===BoostType.Mana&&this.def.mana_consume!*user.modifiers.mana_consume<=user.boost
    }
    switching:boolean=false
    attacking():boolean{
        return this.use_delay>0&&this.firing&&!this.reloading&&!this.switching
    }
    reload(user:Player){
        if(!this.def.reload||user.downed)return
        if(this.ammo>=this.def.reload.capacity||(!this.inventory.infinity_ammo&&!user.inventory.oitems[this.def.ammoType])||this.use_delay>0){
            this.reloading=false
            return
        }
        user.privateDirtys.action=true
        user.current_animation={
            type:PlayerAnimationType.Reloading,
            alt_reload:this.ammo===0,
        }
        user.dirty=true
        user.actions.play(new ReloadAction(this))
    }
    shot(user:Player,consume:boolean=true){
        user.actions.cancel()
        user.privateDirtys.action=true
        this.reloading=false
        if(consume){
            if(this.def.reload)this.ammo=Math.max(this.ammo-(this.def.reload!.ammo_consume??1))
            if(this.def.mana_consume)user.boost=Math.max(user.boost-this.def.mana_consume*user.modifiers.mana_consume,0)
        }
        const position=v2.add(
            user.position,
            v2.rotate_RadAngle(v2.new(
              this.def.lenght,
              this.def.dual_from?(this.dd?-this.def.dual_offset:this.def.dual_offset):0
            ),user.rotation)
        )
        if(this.def.dual_from){
            this.dd=!this.dd
        }
        if(this.def.bullet){
            const bc=this.def.bullet.count??1
            const patternPoint = getPatterningShape(bc, this.def.jitterRadius??1)
            for(let i=0;i<bc;i++){
                let ang=user.rotation
                if(this.def.spread){
                  ang+=Angle.deg2rad(random.float(-this.def.spread,this.def.spread))
                }
                const b=user.game.add_bullet(this.def.jitterRadius?v2.add(position,patternPoint[i]):position,ang,this.def.bullet.def,user,this.def.ammoType,this.def)
                b.modifiers={
                  speed:user.modifiers.bullet_speed,
                  size:user.modifiers.bullet_size,
                }
                b.set_direction(ang)
            }
        }
        if(this.def.projectile){
            const pc=this.def.projectile.count??1
            const patternPoint = getPatterningShape(pc, this.def.jitterRadius??1);
            const def=Projectiles.getFromString(this.def.projectile.def)
            for(let i=0;i<pc;i++){
                let ang=user.rotation
                if(this.def.spread){
                  ang+=Angle.deg2rad(random.float(-this.def.spread,this.def.spread))
                }
                const p=user.game.add_projectile(this.def.jitterRadius?v2.add(position,patternPoint[i]):position,def,user)
                p.throw_projectile(ang,this.def.projectile.speed,this.def.projectile.angular_speed)
            }
        }
        if(this.def.recoil){
            user.recoil={delay:this.def.recoil.duration,speed:this.def.recoil.speed}
        }

        user.dirty=true
        user.privateDirtys.current_weapon=true

        if(!this.def.supresed)user.game.play_sound(position,user.layer,"shot",user)
    }
    update(user:Player){
        if(this.use_delay>0)this.use_delay-=user.game.dt
        if(user.inventory.hand_item===this&&!user.actions.current_action){
            if((this.ammo<=0||this.reloading)&&this.def.reload&&!this.attacking()){
                this.reloading=true
                this.reload(user)
            }
            if(this.use_delay<=0){
                this.firing=false
                if(this.burst){
                    if(this.burst.c<=0||this.ammo<=0){
                        this.burst=undefined
                        this.use_delay=this.def.fireDelay
                    }else{
                        this.burst.c--
                        this.use_delay=this.burst.t
                        this.shot(user)
                    }
                }
            }
        }
    }
    override load(): void {
        if(this.def.switchDelay&&this.use_delay<=this.def.switchDelay){
            this.use_delay=this.def.switchDelay
        }
    }
    override unload(): void {
        this.reloading=false
    }
    drop(): Loot[] {
        if(this.ammo>0){
            this.inventory.give_item(Ammos.getFromString((this.def as GunDef).ammoType),this.ammo)
        }
        if(this.def.dual_from){
            const ret:Loot[]=[]
            for(let i=0;i<2;i++)ret.push(this.inventory.owner.game.add_loot(this.inventory.owner.position,Guns.getFromString(this.def.dual_from),1))
            return ret
        }else{
            return [this.inventory.owner.game.add_loot(this.inventory.owner.position,this.def,1)]
        }
    }
}
export class AmmoItem extends AmmoItemBase implements LItem{
    declare inventory:GInventory
    constructor(def:AmmoDef){
        super(def)
        this.def=def
    }
    on_use(_user: Player,_slot?: Slot<LItem>): void {
    }
    on_fire(_user:Player):void{
    }
    update(_user: Player): void {
    }
    drop(): Loot[] {
        return []
    }
    attacking():boolean{
        return false
    }
}
export class ConsumibleItem extends ConsumibleItemBase implements LItem{
    declare inventory:GInventory
    constructor(def:ConsumibleDef){
        super(def)
    }
    on_use(user: Player,slot?:Slot<LItem>): void {
        if(this.def.side_effects[0].type!==SideEffectType.Heal)return
        if(this.def.condition){
            for(const c of this.def.condition){
            switch(c){
                case ConsumibleCondition.UnfullHealth:
                    
                    if(user.health>=user.maxHealth*(this.def.side_effects[0].health?.max??1))return
                    break
                case ConsumibleCondition.UnfullExtra:
                    if(!(user.boost<user.maxBoost*(this.def.side_effects[0].boost?.max??1)||user.boost_def.type!==this.def.boost_type))return
                    break
            }
            }
        }
        user.current_animation={
            type:PlayerAnimationType.Consuming,
            item:this.def.idNumber!
        }
        user.dirty=true
        user.privateDirtys.action=true
        user.actions.play(new ConsumingAction(this,slot!))
    }
    on_fire(_user:Player):void{
    }
    attacking():boolean{
        return false
    }
    update(_user: Player): void {
    }
    drop(): Loot[] {
        return []
    }
}
export class ProjectileItem extends ProjectileItemBase implements LItem{
    declare inventory:GInventory
    constructor(def:ProjectileDef){
        super(def)
    }
    on_use(user: Player,_slot?: Slot<LItem>): void {
        user.inventory.set_hand_item(this)
    }
    on_fire(user: Player): void {
        user.projectile_holding={
            def:this.def,
            time:this.def.cook?.fuse_time??10000
        }
    }
    attacking():boolean{
        return this.inventory.owner.projectile_holding!==undefined
    }
    update(_user: Player): void {

    }
    drop(): Loot[] {
        return []
    }
}
export class MeleeItem extends MeleeItemBase implements LItem{
    declare inventory:GInventory
    use_delay:number=0
    firing:boolean=false
    switching:boolean=false
    constructor(def:MeleeDef){
        super(def)
    }
    attacking():boolean{
        return this.use_delay>0&&this.firing
    }
    on_use(_user: Player, _slot?: Slot<LItem>): void {
      
    }
    on_fire(user: Player,_slot?: Slot<LItem>): void {
        if(this.use_delay<=0){
            user.current_animation={
                type:PlayerAnimationType.Melee
            }
            user.dirty=true
            for(const t of this.def.damage_delays){
                user.game.addTimeout(()=>{
                    if(this.inventory.hand_item===this)this.attack(user)
                },t)
                this.use_delay=this.def.attack_delay
            }
            this.firing=true
        }
    }
    attack(user:Player):void{
        const position=v2.add(
          user.position,
          v2.mult(v2.from_RadAngle(user.rotation),v2.new(this.def.offset,this.def.offset))
        )
        const hb=new CircleHitbox2D(position,this.def.radius)
        const collidibles:ServerGameObject[]=user.manager.cells.get_objects(hb,user.layer)
        user.current_animation=undefined
        for(const c of collidibles){
            if(!hb.collidingWith(c.hitbox))continue
            if(c instanceof Obstacle){
                if((this.def.resistence_damage??0)>=(c.def.resistence??0)&&!c.def.imortal){
                    c.damage({
                        amount:this.def.damage,
                        critical:false,
                        position:hb.position,
                        reason:DamageReason.Player,
                        owner:user,
                        source:this.def
                    })
                }
            }else if(c.stringType==="player"&&c.id!==user.id){
                (c as Player).damage({
                    amount:this.def.damage,
                    critical:false,
                    position:hb.position,
                    reason:DamageReason.Player,
                    owner:user,
                    source:this.def
                })
            }
        }
    }
    update(user: Player): void {
        if(this.use_delay>0){
            this.use_delay-=1/user.game.tps
        }else{
            this.firing=false
        }
    }
    override unload(): void {
        this.use_delay=this.def.attack_delay
    }
    drop(): Loot[] {
        return [this.inventory.owner.game.add_loot(this.inventory.owner.position,this.def,1)]
    }
}
export class GInventory extends GInventoryBase<LItem>{
    owner:Player
    infinity_ammo:boolean=false
    droppable:InventoryDroppable={
        backpack:true,
        helmet:true,
        vest:true
    }
    constructor(owner:Player){
        super({
            0:MeleeItem as (new(item:GameItem)=>LItem),
            1:GunItem as (new(item:GameItem)=>LItem),
            2:GunItem as (new(item:GameItem)=>LItem),
        })
        this.owner=owner
        this.default_backpack=Backpacks.getFromString("null_pack")
        this.set_backpack()
        this.clear_weapons()
    }
    override set_weapon_index(idx:number){
        super.set_weapon_index(idx)

        this.owner.actions.cancel()
        this.owner.recoil=undefined
        this.owner.throw_using_projectile()
        this.owner.input.swicthed=true
    }
    override dirty(it: string): void {
        if(!this.owner)return
        switch(it){
            case "oitems":
                this.owner.privateDirtys.oitems=true
                break
            case "scopes":
                this.owner.privateDirtys.scopes=true
                break
            case "items":
                this.owner.privateDirtys.inventory=true
                break
            case "weapons":
                this.owner.privateDirtys.weapons=true
                break
            case "hand":
                this.owner.privateDirtys.current_weapon=true
                this.owner.dirty=true
                break
        }
    }
    override set_weapon(slot: number, wep?: GameItem,drop:boolean=true): void {
        if(drop){
            if(this.weapons[slot]&&this.weapons[slot].def!=this.weapons_defaults[slot]){
                this.weapons[slot].drop()
                this.weapons[slot]=undefined
            }
        }
        super.set_weapon(slot,wep)
    }
    add_gun(dd:GunDef):boolean{
        const id=dd.idString
        if(dd.dual&&!dd.dual_from){
            for(const w of Object.keys(this.weapons)){
                if(this.weapons[w as unknown as number]?.def.idString==dd.idString){
                    this.set_weapon(w as unknown as number,Guns.getFromString(id+"_dual"),false)
                    return true
                }
            }
        }
        for(const w of Object.keys(this.weapons)){
            if(this.weapon_is_free(w as unknown as number)&&this.weapons_kind[w as unknown as number]==GunItem){
                this.set_weapon(w as unknown as number,dd)
                return true
            }
        }
        if(this.weapons_kind[this.weapon_idx]==GunItem){
            this.set_weapon(this.weapon_idx,dd)
            return true
        }
        return false
    }
    drop_weapon(slot=0){
        if(this.weapon_is_free(slot))return
        const loots:Loot[]=this.weapons[slot]!.drop()
        for(const l of loots){
            l.velocity.x-=1.5
        }
        this.owner.actions.cancel()
        super.set_weapon(slot,undefined)
    }
    swamp_guns(){
        const gun1=this.weapons[1]
        const gun2=this.weapons[2]
        this.weapons[1]=gun2
        this.weapons[2]=gun1
        if(this.weapon_idx===1){
            this.weapon_idx=2
        }else if(this.weapon_idx===2){
            this.weapon_idx=1
        }
        this.owner.privateDirtys.current_weapon=true
        this.owner.privateDirtys.weapons=true
    }
    drop_oitem(idx:number=0,drop_count:number=60){
        const a=Ammos.getFromNumber(idx)
        const res=this.consume_oitem(a.idString,drop_count)
        if(res){

            this.owner.game.add_loot(this.owner.position,a,res)
            this.owner.privateDirtys.oitems=true
        }
    }
    give_item(def:GameItem,count:number,drop_n:boolean=true):number{
        switch(def.item_type){
            case InventoryItemType.ammo:{
                this.owner.privateDirtys.oitems=true
                const max=this.item_limit(def)
                const ac=this.oitems[def.idString]??0
                if(ac>=max){
                    if(drop_n)this.owner.game.add_loot(this.owner.position,def,count)
                    return count
                }
                const drop=Math.max((ac+count)-max,0)
                this.oitems[def.idString]=Numeric.max(ac+count,max)
                if(drop_n&&drop>0){
                    this.owner.game.add_loot(this.owner.position,def,drop)
                }
                return drop
            }
            case InventoryItemType.consumible:{
                const item=new ConsumibleItem(def as unknown as ConsumibleDef)
                item.inventory=this
                item.limit_per_slot=this.item_limit(item.def)
                const ov=this.add(item,count)
                if(ov){
                  this.owner.game.add_loot(this.owner.position,def,ov)
                }
                this.owner.privateDirtys.inventory=true
                break
            }
            case InventoryItemType.projectile:{
                const item=new ProjectileItem(def as unknown as ProjectileDef)
                item.inventory=this
                item.limit_per_slot=this.backpack.max[item.def.idString]??this.default_backpack.max[item.def.idString]??5
                const ov=this.add(item,count)
                if(ov){
                  this.owner.game.add_loot(this.owner.position,def,ov)
                }
                this.owner.privateDirtys.inventory=true
                break
            }
            case InventoryItemType.vest:{
                const d=def as unknown as VestDef
                if(!this.owner.vest){
                    this.owner.vest=d
                    this.owner.dirty=true
                    return count-1
                }else if(this.owner.vest.level<d.level){
                    this.owner.game.add_loot(this.owner.position,this.owner.vest,1)
                    this.owner.vest=d
                    this.owner.dirty=true
                    return count-1
                }
                break
            }
            case InventoryItemType.helmet:{
                const d=def as unknown as HelmetDef
                if(!this.owner.helmet){
                    this.owner.helmet=d
                    this.owner.dirty=true
                    return count-1
                }else if(this.owner.helmet.level<d.level){
                    this.owner.game.add_loot(this.owner.position,this.owner.helmet,1)
                    this.owner.helmet=d
                    this.owner.dirty=true
                    return count-1
                }
                break
            }
            case InventoryItemType.backpack:{
                const d=def as unknown as BackpackDef
                if(this.backpack.level<d.level){
                    this.owner.dirty=true
                    this.set_backpack(d)
                    return count-1
                }
                break
            }
            case InventoryItemType.gun:{
                const d=def as unknown as GunDef
                const g=this.add_gun(d)
                return g?count-1:count
            }
            case InventoryItemType.melee:{
                this.set_weapon(0,def as unknown as MeleeDef)
                return count-1
            }
            case InventoryItemType.skin:{
                if(this.owner.skin.idString!==def.idString){
                    this.owner.game.add_loot(this.owner.position,this.owner.skin,1)
                    this.owner.skin=def as unknown as SkinDef
                    this.owner.dirty=true
                    return count-1
                }
                break
            }
            case InventoryItemType.accessorie:
                break
            case InventoryItemType.scope:{
                if(!this.scopes.includes(def.idNumber!)){
                    this.scopes.push(def.idNumber!)
                    count-=1
                    if(def.idNumber!>this.owner.scope.idNumber!){
                        this.owner.scope=def
                    }
                    this.dirty("scopes")
                }
                break
            }
        }
        this.owner.privateDirtys.inventory=true
        return count
    }
    drop_slot(si:number=0,count:number=10){
        const s=this.slots[si]
        if(s?.item&&s.quantity>0){
            const c=Math.min(count,s.quantity)
            this.owner.game.add_loot(this.owner.position,s.item.def as GameItem,c)
            s.remove(c)
            this.owner.privateDirtys.inventory=true
        }
    }
    drop_item(id:number,count:number=5){
        for(const s in this.slots){
            if(this.slots[s].item&&GameItems.keysString[this.slots[s].item.def.idString]===id){
              this.drop_slot(s as unknown as number,count)
              break
            }
        }
    }
    load_preset(preset:InventoryPreset){
        if(preset.helmet){
            const choose=random.weight2(preset.helmet)
            if(choose){
                this.owner.helmet=Helmets.getFromString(choose.item)
                if(choose.drop_chance)this.droppable.helmet=(Math.random()<=choose.drop_chance)
                else if(choose.droppable!==undefined)this.droppable.helmet=choose.droppable
            }
        }
        if(preset.vest){
            const choose=random.weight2(preset.vest)
            if(choose){
                this.owner.vest=Vests.getFromString(choose.item)
                if(choose.drop_chance)this.droppable.vest=(Math.random()<=choose.drop_chance)
                else if(choose.droppable!==undefined)this.droppable.vest=choose.droppable
            }
        }
        if(preset.backpack){
            const choose=random.weight2(preset.backpack)
            if(choose){
                this.set_backpack(Backpacks.getFromString(choose.item))
                if(choose.drop_chance)this.droppable.vest=(Math.random()<=choose.drop_chance)
                else if(choose.droppable!==undefined)this.droppable.vest=choose.droppable
            }
        }

        if(preset.melee)this.set_weapon(0,Melees.getFromString(random.weight2(preset.melee)?.item!))
        if(preset.gun1){
            const choose=random.weight2(preset.gun1)!
            this.set_weapon(1,Guns.getFromString(choose.item))
            const wep=this.weapons[1] as GunItem
            wep.ammo=wep.def.reload?.capacity??0
        }
        if(preset.gun2){
            const choose=random.weight2(preset.gun2)!
            this.set_weapon(2,Guns.getFromString(choose.item))
            const wep=this.weapons[2] as GunItem
            wep.ammo=wep.def.reload?.capacity??0
        }
        if(preset.oitems){
            for(const o of Object.keys(preset.oitems)){
                this.oitems[o]=preset.oitems[o]
            }
        }
        if(preset.hand){
            this.set_weapon_index(preset.hand)
        }
        if(preset.infinity_ammo!==undefined)this.infinity_ammo=preset.infinity_ammo
        if(preset.droppables){
            if(preset.droppables.helmet!==undefined)this.droppable.helmet=preset.droppables.helmet
            if(preset.droppables.vest!==undefined)this.droppable.vest=preset.droppables.vest
            if(preset.droppables.backpack!==undefined)this.droppable.backpack=preset.droppables.backpack
        }
        if(preset.boosts){
            const choose=random.weight2(preset.boosts)
            if(choose){
                this.owner.boost_def=Boosts[choose.boost_type]
                this.owner.boost=this.owner.maxBoost*choose.boost
            }
        }
        for(const slot of preset.items??[]){
            const choose=random.weight2(slot)
            if(choose&&GameItems.valueString[choose.item]){
                const item=GameItems.valueString[choose.item]
                this.give_item(item,choose.count??1,false)
            }
        }
    }
    gift(g:InventorySetup){
        if(g.vest){
            const v=g.vest(this.owner)
            if(v)this.owner.vest=v
        }
        if(g.helmet){
            const h=g.helmet(this.owner)
            if(h)this.owner.helmet=h
        }
        if(g.backpack){
            const b=g.backpack(this.owner)
            this.set_backpack(b)
        }
        if(g.melee){
            const mel=g.melee(this.owner)
            if(mel)this.set_weapon(0,mel)
        }
        if(g.gun1){
            const gun=g.gun1(this.owner)
            if(gun){
                this.set_weapon(1,gun)
            }
        }
        if(g.gun2){
            const gun=g.gun2(this.owner)
            if(gun){
                this.set_weapon(1,gun)
            }
        }
        if(g.items){
            const items=g.items(this.owner)
            for(const i of items){
                this.give_item(i.item,i.count,false)
            }
        }
    }
    drop_all(){
        const layer=this.owner.layer
        for(const w of Object.keys(this.weapons)){
            this.drop_weapon(w as unknown as number)
        }
        const l:Loot[]=[]
        for(const s of Object.keys(this.oitems)){
            const def=Ammos.getFromString(s)
            const dir=random.float(-3.141592,3.141592)
            const r=(this.owner.hitbox as CircleHitbox2D).radius
            const pos=v2.add(this.owner.position,v2.new((Math.cos(dir)*r),(Math.sin(dir)*r)))
            while(this.oitems[s]>0){
                const rc=Math.min(this.oitems[s],60)
                const ll=this.owner.game.add_loot(pos,def,rc)
                l.push(ll);
                ll.push(random.float(1,7),dir+random.float(-0.03,0.03))
                this.oitems[s]-=rc
            }
            delete this.oitems[s]
        }
        if(this.owner.helmet&&this.droppable.helmet){
            this.owner.game.add_loot(this.owner.position,this.owner.helmet,1,layer)
            this.owner.helmet=undefined
        }
        if(this.owner.vest&&this.droppable.vest){
            this.owner.game.add_loot(this.owner.position,this.owner.vest,1,layer)
            this.owner.vest=undefined
        }
        if(this.backpack&&this.backpack.level&&this.droppable.backpack){
            this.owner.game.add_loot(this.owner.position,this.backpack,1,layer)
            this.set_backpack()
        }
        if(this.owner.skin.idString!==this.owner.loadout.skin){
            this.owner.game.add_loot(this.owner.position,this.owner.skin,1,layer)
        }
        for(const s of this.slots){
            if(s.item&&s.quantity>0){
                this.owner.game.add_loot(this.owner.position,s.item.def as GameItem,s.quantity,layer)
                s.remove(s.quantity)
            }
        }
        for(const s of this.scopes){
            const def=Scopes.getFromNumber(s)
            if(def.droppable)this.owner.game.add_loot(this.owner.position,def,1,layer)
        }
        for(const loot of l){
            loot.is_new=true
        }
        this.owner.privateDirtys.oitems=true
        this.owner.privateDirtys.inventory=true
        this.owner.privateDirtys.weapons=true
    }
    update(){
        for(const w of Object.keys(this.weapons)){
            this.weapons[w as unknown as number]?.update(this.owner)
        }
    }
}