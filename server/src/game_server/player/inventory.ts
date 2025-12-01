import { type Player } from "../gameObjects/player.ts";
import { Angle, CircleHitbox2D, Definition, getPatterningShape, Numeric, random, v2 } from "common/scripts/engine/mod.ts";
import { FireMode, GunDef, Guns } from "common/scripts/definitions/items/guns.ts";
import { Inventory, Item, Slot } from "common/scripts/engine/inventory.ts";
import { DamageReason, InventoryItemType } from "common/scripts/definitions/utils.ts";
import { ConsumingAction, ReloadAction } from "./actions.ts";
import { AmmoDef } from "common/scripts/definitions/items/ammo.ts";
import { ConsumibleCondition, ConsumibleDef } from "common/scripts/definitions/items/consumibles.ts";
import { GameItem, GameItems, WeaponDef } from "common/scripts/definitions/alldefs.ts";
import { MeleeDef, Melees } from "common/scripts/definitions/items/melees.ts";
import { BackpackDef, Backpacks } from "common/scripts/definitions/items/backpacks.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
import { Obstacle } from "../gameObjects/obstacle.ts";
import { ProjectileDef, Projectiles } from "common/scripts/definitions/objects/projectiles.ts";
import { Ammos } from "common/scripts/definitions/items/ammo.ts";
import { type Loot } from "../gameObjects/loot.ts";
import { BoostType } from "common/scripts/definitions/player/boosts.ts";
import { InventoryGift } from "../others/gamemode.ts";
import { SideEffectType } from "common/scripts/definitions/player/effects.ts";
import { SkinDef } from "common/scripts/definitions/loadout/skins.ts";
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { PlayerAnimationType } from "common/scripts/others/constants.ts";
export abstract class LItem extends Item{
    abstract on_use(user:Player,slot?:LItem):void
    abstract update(user:Player):void
    abstract itemType:InventoryItemType
    abstract def:Definition
    droppable:boolean=true
}
export class GunItem extends LItem{
    def:GunDef
    use_delay:number=0
    burst?:{
        t:number
        c:number
    }
    cap:number
    firing:boolean=false

    ammo:number=0
    liquid:boolean=false

    type="gun"
    constructor(def?:GunDef,droppable=true){
        super()
        this.def=def!
        this.tags.push("gun")
        this.cap=this.def.size
        this.droppable=droppable
        this.liquid=Ammos.getFromString(def!.ammoType).liquid??false
    }
    reloading=false
    itemType=InventoryItemType.gun

    dd:boolean=false
    is(other: LItem): boolean {
        return (other instanceof GunItem)&&other.def.idNumber==this.def.idNumber
    }
    override on_use(_user: Player, _slot?: LItem): void {
      
    }
    has_consumible(user:Player):boolean{
        return (this.ammo>0||!this.def.reload)&&(!this.def.mana_consume||this.has_mana(user))
    }
    switching:boolean=false
    attacking():boolean{
        return this.use_delay>0&&this.firing&&!this.reloading&&!this.switching
    }
    on_fire(user:Player,_slot?:LItem){
        if(this.def.fireMode===FireMode.Single&&!user.input.using_item_down)return
        if(this.has_consumible(user)){
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
        }
    }
    has_mana(user:Player){
        return user.boost_def.type===BoostType.Mana&&this.def.mana_consume!*user.modifiers.mana_consume<=user.boost
    }
    reload(user:Player){
        if(!this.def.reload||user.downed)return
        if(this.ammo>=this.def.reload.capacity||!user.inventory.oitems[this.def.ammoType]||this.use_delay>0){
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
    }
    update(user:Player){
        if(this.use_delay>0)this.use_delay-=1/user.game.tps
        if(user.inventory.currentWeapon===this&&!user.actions.current_action){
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
}
export class AmmoItem extends LItem{
    def:AmmoDef
    itemType: InventoryItemType.ammo=InventoryItemType.ammo

    type="ammo"
    constructor(def:AmmoDef,droppable=true){
        super()
        this.def=def
        this.droppable=droppable
        this.tags.push("ammo",`ammo_${this.def.ammoType}`)
    }
    is(other: LItem): boolean {
        return (other instanceof AmmoItem)&&other.def.idNumber==this.def.idNumber
    }
    on_use(_user: Player,_slot?:LItem): void {
    }
    update(_user: Player): void {
      
    }
}
export class ConsumibleItem extends LItem{
  def:ConsumibleDef
  itemType: InventoryItemType.consumible=InventoryItemType.consumible

  type="healing"
  inventory:GInventory
  constructor(def:ConsumibleDef,droppable=true,inventory:GInventory){
      super()
      this.def=def
      this.droppable=droppable
      this.inventory=inventory
  }
  is(other: LItem): boolean {
      return (other instanceof ConsumibleItem)&&other.def.idNumber==this.def.idNumber
  }
  on_use(user: Player,_slot?:LItem): void {
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
      user.actions.play(new ConsumingAction(this))
  }
  update(_user: Player): void {
    
  }
}
export class ProjectileItem extends LItem{
    def:ProjectileDef
    itemType: InventoryItemType.projectile=InventoryItemType.projectile
    inventory:GInventory

    type="projectile"
    constructor(def:ProjectileDef,droppable:boolean=true,inventory:GInventory){
        super()
        this.def=def
        this.droppable=droppable
        this.inventory=inventory
    }
    is(other: LItem): boolean {
        return (other instanceof ProjectileItem)&&other.def.idNumber==this.def.idNumber
    }
    on_use(user: Player,_slot?:LItem): void {
        user.inventory.set_hand_item(this)
    }
    on_fire(user: Player,_slot?:LItem): void {
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
}
export class MeleeItem extends LItem{
    def:MeleeDef
    itemType: InventoryItemType.melee=InventoryItemType.melee
    use_delay:number=0
    firing:boolean=false
    switching:boolean=false

    type="melee"
    constructor(def:MeleeDef,droppable=true){
      super()
      this.limit_per_slot=1
      this.def=def
      this.droppable=droppable
    }
    is(other: LItem): boolean {
      return (other instanceof MeleeItem)&&other.def.idNumber==this.def.idNumber
    }
    attacking():boolean{
        return this.use_delay>0&&this.firing
    }
    attack(user:Player):void{
        if(user.inventory.weaponIdx!==0)return
        const position=v2.add(
          user.position,
          v2.mult(v2.from_RadAngle(user.rotation),v2.new(this.def.offset,this.def.offset))
        )
        const hb=new CircleHitbox2D(position,this.def.radius)
        const collidibles:ServerGameObject[]=user.manager.cells.get_objects(hb,user.layer)
        user.current_animation=undefined
        for(const c of collidibles){
            if(!hb.collidingWith(c.hb))continue
              if(c instanceof Obstacle){
                c.damage({
                  amount:this.def.damage,
                  critical:false,
                  position:hb.position,
                  reason:DamageReason.Player,
                  owner:user,
                  source:this.def
                })
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
    override on_use(_user: Player, _slot?: LItem): void {
      
    }
    on_fire(user: Player,_slot?:LItem): void {
        if(this.use_delay<=0){
            user.current_animation={
                type:PlayerAnimationType.Melee
            }
            user.dirty=true
            for(const t of this.def.damage_delays){
              user.game.addTimeout(this.attack.bind(this,user),t)
              this.use_delay=this.def.attack_delay
            }
            this.firing=true
        }
    }
    update(user: Player): void {
        if(this.use_delay>0){
            this.use_delay-=1/user.game.tps
        }else{
            this.firing=false
        }
    }
}
export class GInventory extends Inventory<LItem>{
    weapons:{
      0?:MeleeItem,
      1?:GunItem,
      2?:GunItem,
      3?:ProjectileItem
    }={0:undefined,1:undefined,2:undefined}
    owner:Player

    weaponIdx:number=-1
    currentWeapon?:GunItem|MeleeItem|ProjectileItem
    currentWeaponDef?:GunDef|MeleeDef|ProjectileDef

    oitems:Record<string,number>={}
    backpack!:BackpackDef
    default_melee:MeleeDef
    default_backpack:BackpackDef

    set_backpack(backpack?:BackpackDef){
        if(!backpack)backpack=this.default_backpack
        if(this.backpack&&this.backpack.idString===backpack.idString)return
        this.backpack=backpack
        for(const s of this.slots){
            if(s.item){
                s.item.limit_per_slot=backpack.max[s.item.def.idString]??this.default_backpack.max[s.item.def.idString]??15
            }
        }
        if(this.slots.length>backpack.slots){
            while(this.slots.length>backpack.slots){
              this.slots.pop()
            }
        }
        while(this.slots.length<backpack.slots){
            this.slots.push(new Slot<LItem>())
        }
        this.owner.privateDirtys.inventory=true
    }

    constructor(owner:Player,default_melee:MeleeDef=Melees.getFromString("survival_knife")){
        super(4)
        this.owner=owner
        this.default_melee=default_melee
        this.default_backpack=Backpacks.getFromString("null_pack")
        this.set_weapon(0,default_melee)
        this.set_backpack()
    }

    set_hand_item(val:GunItem|MeleeItem|ProjectileItem){
        this.currentWeapon=val
        this.currentWeaponDef=val?.def
        this.owner.privateDirtys.weapons=true
        this.owner.privateDirtys.current_weapon=true
        if(this.currentWeapon&&(this.currentWeapon instanceof GunItem||this.currentWeapon instanceof MeleeItem)){
            const id=((this.currentWeaponDef) as GunDef|MeleeDef)
            if(id.switchDelay&&this.currentWeapon.use_delay<=id.switchDelay){
                this.currentWeapon!.use_delay=id.switchDelay
                this.currentWeapon!.firing=false
            }
            this.currentWeapon.switching=true
        }

        this.owner.current_animation=undefined
        this.owner.dirty=true
    }

    set_current_weapon_index(idx:number){
        if(this.weaponIdx===idx||!this.weapons[idx as keyof typeof this.weapons])return

        const val=this.weapons[idx as keyof typeof this.weapons] as GunItem|MeleeItem|undefined
        this.weaponIdx=idx

        if(this.currentWeapon){
            switch(this.currentWeapon.type){
              case "gun":
                (this.currentWeapon as GunItem).reloading=false
                break
              case "melee":
                (this.currentWeapon as MeleeItem).use_delay=(this.currentWeaponDef as MeleeDef).attack_delay
                break
            }
        }

        this.set_hand_item(val!)
        this.owner.actions.cancel()
        this.owner.privateDirtys.action=true
        this.owner.recoil=undefined
        this.owner.throw_using_projectile()

        this.owner.input.swicthed=true
    }
    set_weapon(slot:keyof typeof this.weapons=0,wep:WeaponDef,drop:boolean=true){
        if(drop)this.drop_weapon(slot,false)
        if(slot===0){
          this.weapons[slot]=new MeleeItem(wep as MeleeDef,true)
        }else if(slot==1||slot==2){
          this.weapons[slot]=new GunItem(wep as GunDef,true)
        }
        this.owner.privateDirtys.weapons=true
        this.owner.privateDirtys.current_weapon=true
        if(slot===this.weaponIdx){this.weaponIdx=-1;this.set_current_weapon_index(slot)}
    }
    give_gun(dd:GunDef):boolean{
        const id=dd.idString
        if(dd.dual&&!dd.dual_from){
            if(this.weapons[1]?.def.idString===dd.idString){
                this.set_weapon(1,Guns.getFromString(id+"_dual"),false)
                return true
            }else if(this.weapons[2]?.def.idString===dd.idString){
                this.set_weapon(2,Guns.getFromString(id+"_dual"),false)
                return true
            }
        }
        if(!this.weapons[1]){
            this.set_weapon(1,dd)
            return true
        }
        if(!this.weapons[2]){
            this.set_weapon(2,dd)
            return true
        }
        if(this.weaponIdx>0){
            this.set_weapon(this.weaponIdx as keyof typeof this.weapons,dd)
        }else if(this.weaponIdx===0){
            return false
        }
        return true
    }
    drop_weapon(slot:keyof typeof this.weapons=0,normal:boolean=true){
        if(!this.weapons[slot])return
        let l:Loot
        if(this.weapons[slot].itemType===InventoryItemType.gun){
            if(this.weapons[slot].ammo>0){
                this.give_item(Ammos.getFromString((this.weapons[slot].def as GunDef).ammoType),this.weapons[slot].ammo)
            }
            if(this.weapons[slot].def.dual_from){
                for(let i=0;i<2;i++)l=this.owner.game.add_loot(this.owner.position,Guns.getFromString(this.weapons[slot].def.dual_from),1)
            }else{
                l=this.owner.game.add_loot(this.owner.position,this.weapons[slot].def,1)
            }
        }else if(this.weapons[slot].itemType===InventoryItemType.melee&&this.weapons[slot].def.idString!==this.default_melee.idString){
            l=this.owner.game.add_loot(this.owner.position,this.weapons[slot].def,1)
            this.set_weapon(0,this.default_melee,false)
            return
        }else{
            return
        }
        this.weapons[slot]=undefined
        this.owner.actions.cancel()
        this.owner.privateDirtys.weapons=true
        if(slot===this.weaponIdx&&normal)this.set_current_weapon_index(0)
            l!.velocity.x=-1,5
        if(slot===0){
            this.set_weapon(slot,this.default_melee)
        }
    }
    swamp_guns(){
        const gun1=this.weapons[1]
        const gun2=this.weapons[2]
        this.weapons[1]=gun2
        this.weapons[2]=gun1
        if(this.weaponIdx===1){
            this.weaponIdx=2
        }else if(this.weaponIdx===2){
            this.weaponIdx=1
        }
        this.owner.privateDirtys.current_weapon=true
        this.owner.privateDirtys.weapons=true
    }
    drop_ammo(idx:number=0){
      const a=Ammos.getFromNumber(idx)
      const rc=Math.min(a.drop_count??60,this.oitems[a.idString])
      this.consume_ammo(a.idString,rc)
      this.owner.game.add_loot(this.owner.position,a,rc)
    }
    give_item(def:GameItem,count:number,drop_n:boolean=true):number{
        switch(def.item_type){
            case InventoryItemType.ammo:{
                this.owner.privateDirtys.oitems=true
                const max=this.backpack.max[def.idString]??0
                const ac=this.oitems[def.idString]??0
                const dp=Math.max((ac+count)-max,0)
                this.oitems[def.idString]=Numeric.max(ac+count,max)
                if(drop_n&&dp){
                  this.owner.game.add_loot(this.owner.position,def,dp)
                }
                return dp
            }
            case InventoryItemType.consumible:{
                const item=new ConsumibleItem(def as unknown as ConsumibleDef,undefined,this)
                item.limit_per_slot=this.backpack.max[item.def.idString]??this.default_backpack.max[item.def.idString]??15
                const ov=this.add(item,count)
                if(ov){
                  this.owner.game.add_loot(this.owner.position,def,ov)
                }
                this.owner.privateDirtys.inventory=true
                break
            }
            case InventoryItemType.projectile:{
                const item=new ProjectileItem(def as unknown as ProjectileDef,undefined,this)
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
                const g=this.give_gun(d)
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
            case InventoryItemType.scope:
                break
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
    consume_ammo(a:string,val:number):number{
        this.owner.privateDirtys.oitems=true
        if(this.oitems[a]){
            const con=Numeric.max(val,this.oitems[a])
            this.oitems[a]=Numeric.max(this.oitems[a],this.oitems[a]-val)
            if(this.oitems[a]===0){
                delete this.oitems[a]
            }
            return con
        }
        return 0
    }
    gift(g:InventoryGift){
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
            if(mel)this.set_weapon(0,mel,false)
        }
        if(g.gun1){
            const gun=g.gun1(this.owner)
            if(gun){
                this.set_weapon(1,gun,false)
                this.weapons[1]!.ammo=gun.reload?.capacity??0
            }
        }
        if(g.gun2){
            const gun=g.gun2(this.owner)
            if(gun){
                this.set_weapon(1,gun,false)
                this.weapons[2]!.ammo=gun.reload?.capacity??0
            }
        }
        if(g.items){
            const items=g.items(this.owner)
            for(const i of items){
                this.give_item(i.item,i.count,false)
            }
        }
    }
    clear(){
        this.oitems={}
        this.owner.vest=undefined
        this.owner.helmet=undefined
        this.set_backpack()
        for(const s of this.slots){
          s.clear()
        }
        this.owner.privateDirtys.inventory=true
        this.owner.privateDirtys.weapons=true
        this.owner.privateDirtys.oitems=true
        this.weapons[1]=undefined
        this.weapons[2]=undefined
        this.set_weapon(0,this.default_melee)
        this.set_current_weapon_index(0)
    }
    drop_all(){
        this.drop_weapon(0)
        this.drop_weapon(1)
        this.drop_weapon(2)
        const l:Loot[]=[]
        for(const s of Object.keys(this.oitems)){
            const def=Ammos.getFromString(s)
            //const pos=this.owner.hb.randomPoint()
            const dir=random.float(-3.141592,3.141592)
            const r=(this.owner.hb as CircleHitbox2D).radius
            const pos=v2.add(this.owner.position,v2.new((Math.cos(dir)*r),(Math.sin(dir)*r)))
            while(this.oitems[s]>0){
                const rc=Math.min(this.oitems[s],60)
                const ll=this.owner.game.add_loot(pos,def,rc)
                l.push(ll);
                ll.push(random.float(1,7),dir+random.float(-0.03,0.03));
                //(ll.hb as CircleHitbox2D).radius=0
                this.oitems[s]-=rc
            }
            delete this.oitems[s]
        }
        if(this.owner.vest){
            this.owner.game.add_loot(this.owner.position,this.owner.vest,1)
            this.owner.vest=undefined
        }
        if(this.owner.helmet){
            this.owner.game.add_loot(this.owner.position,this.owner.helmet,1)
            this.owner.helmet=undefined
        }
        if(this.backpack&&this.backpack.level){
            this.owner.game.add_loot(this.owner.position,this.backpack,1)
            this.set_backpack()
        }
        if(this.owner.skin.idString!==this.owner.loadout.skin){
            this.owner.game.add_loot(this.owner.position,this.owner.skin,1)
        }
        for(const s of this.slots){
            if(s.item&&s.quantity>0){
                this.owner.game.add_loot(this.owner.position,s.item.def as GameItem,s.quantity)
                s.remove(s.quantity)
            }
        }
        for(const loot of l){
            loot.is_new=true
        }
        this.owner.privateDirtys.oitems=true
        this.owner.privateDirtys.inventory=true
        this.owner.privateDirtys.weapons=true
    }
    update(){
        this.weapons[0]?.update(this.owner)
        this.weapons[1]?.update(this.owner)
        this.weapons[2]?.update(this.owner)
    }
}