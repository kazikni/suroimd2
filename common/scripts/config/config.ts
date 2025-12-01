import { HostConfig } from "../engine/server_offline/offline_server.ts";

export interface GameOptions{
    gameTps:number
    netTps:number
}
export interface GameConfig{
    team_size:number
    mode:string
}
export interface GamemodeConfig{
    team_size:number[]
    gamemode:string
    enabled:boolean
}
export interface GameDebugOptions{
    deenable_lobby?:boolean
    debug_menu:boolean
    dead_zone?:{
        time_speed:number
    }
}
export interface RegionDef{
    host:string
    port:number
    ssh?:boolean
}
export interface ShopConfig{
    skins: Partial<Record<number, number>>
}
export interface ApiSettingsS{
    regions:Record<string,RegionDef>
    modes:GamemodeConfig[]
    shop:ShopConfig
    debug:{
        debug_menu:boolean
    }
    database:{
        enabled:boolean
    }
}
export interface ConfigType {
    api: {
        host: HostConfig
        global:string
    };
    game: {
        max_games: number
        options: GameOptions
        debug:GameDebugOptions
        host: HostConfig
        modes:GamemodeConfig[]
    }
    this_region:string
    vite:{
        port:number
        allowed_hosts?:true|string[]
    }
    regions: Record<string, RegionDef>
    database: {
        enabled: boolean
        statistic:boolean
        files: {
            accounts: string
            forum: string
            statistic:string
        }
        api_key: string
    }
    shop: ShopConfig
}