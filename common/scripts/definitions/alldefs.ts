import { GunDef,Guns } from "./items/guns.ts";
import { AmmoDef, Ammos } from "./items/ammo.ts";
import { ConsumibleDef, Consumibles } from "./items/consumibles.ts";
import { DefinitionsMerge } from "../engine/definitions.ts";
import { AccessorieDef, Accessories, HelmetDef, Helmets, VestDef, Vests } from "./items/equipaments.ts";
import { MeleeDef, Melees } from "./items/melees.ts";
import { BackpackDef, Backpacks } from "./items/backpacks.ts";
import { Obstacles, type ObstacleDef } from "./objects/obstacles.ts";
import { ExplosionDef, Explosions } from "./objects/explosions.ts";
import { SkinDef, Skins } from "./loadout/skins.ts";
import { ProjectileDef, Projectiles } from "./objects/projectiles.ts";
import { BuildingDef } from "./objects/buildings_base.ts";
import { EmoteDef, Emotes } from "./loadout/emotes.ts";
import { BadgeDef, Badges } from "./loadout/badges.ts";
import { ScopeDef, Scopes } from "./items/scopes.ts";

export type GameItem=GunDef|MeleeDef|ProjectileDef|AmmoDef|ConsumibleDef|VestDef|HelmetDef|BackpackDef|AccessorieDef|ScopeDef|SkinDef
export const GameItems=new DefinitionsMerge<GameItem>()
GameItems.insert_def(Guns.value)
GameItems.insert_def(Melees.value)
GameItems.insert_def(Ammos.value)
GameItems.insert_def(Consumibles.value)
GameItems.insert_def(Projectiles.value)
GameItems.insert_def(Backpacks.value)
GameItems.insert_def(Vests.value)
GameItems.insert_def(Helmets.value)
GameItems.insert_def(Scopes.value)
GameItems.insert_def(Accessories.value)
GameItems.insert_def(Skins.value)

export type GameObjectDef=GameItem|EmoteDef|BadgeDef|ObstacleDef|ExplosionDef|BuildingDef
export const GameObjectsDefs=new DefinitionsMerge<GameObjectDef>()
GameObjectsDefs.insert_def(GameItems.valueString)
GameObjectsDefs.insert_def(Emotes.value)
GameObjectsDefs.insert_def(Badges.value)

export type WeaponDef=MeleeDef|GunDef|ProjectileDef
export const Weapons=new DefinitionsMerge<WeaponDef>()
Weapons.insert_def(Guns.value)
Weapons.insert_def(Melees.value)
Weapons.insert_def(Projectiles.value)

export type DamageSourceDef=MeleeDef|GunDef|ObstacleDef|ExplosionDef|ProjectileDef
export const DamageSources=new DefinitionsMerge<DamageSourceDef>()
DamageSources.insert_def(Guns.value)
DamageSources.insert_def(Melees.value)
DamageSources.insert_def(Projectiles.value)
DamageSources.insert_def(Obstacles.value)
DamageSources.insert_def(Explosions.value)