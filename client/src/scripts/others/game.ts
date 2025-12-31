import { ClientGame2D, ResourcesManager, Renderer, ColorM, InputManager} from "../engine/mod.ts"
import { LayersL, zIndexes } from "common/scripts/others/constants.ts";
import { Client, DefaultSignals, Numeric, Vec2, model2d, v2 } from "common/scripts/engine/mod.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { Player } from "../gameObjects/player.ts";
import { Loot } from "../gameObjects/loot.ts";
import { Bullet } from "../gameObjects/bullet.ts";
import { Obstacle } from "../gameObjects/obstacle.ts";
import { GuiManager } from "../managers/guiManager.ts";
import { Explosion } from "../gameObjects/explosion.ts";
import { SoundManager } from "../engine/sounds.ts";
import { Projectile } from "../gameObjects/projectile.ts";
import { DamageSplashOBJ } from "../gameObjects/damageSplash.ts";
import { GameObject } from "./gameObject.ts";
import { Debug } from "./config.ts";
import { type DamageSplash, UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { PlayerBody } from "../gameObjects/player_body.ts";
import { Decal } from "../gameObjects/decal.ts";
import {  KillFeedPacket } from "common/scripts/packets/killfeed_packet.ts";
import { JoinedPacket } from "common/scripts/packets/joined_packet.ts";
import { GameConsole } from "../engine/console.ts";
import { TerrainM } from "../gameObjects/terrain.ts";
import { MapPacket } from "common/scripts/packets/map_packet.ts";
import { Graphics2D, Lights2D, Sprite2D } from "../engine/container_2d.ts";
import { Vehicle } from "../gameObjects/vehicle.ts";
import { Skins } from "common/scripts/definitions/loadout/skins.ts";
import { ActionEvent, AxisActionEvent, GamepadManagerEvent, Key, MouseEvents } from "../engine/keys.ts";
import { Creature } from "../gameObjects/creature.ts";
import { Material, WebglRenderer } from "../engine/renderer.ts";
import { Plane } from "./planes.ts";
import { isMobile } from "../engine/game.ts";
import { DeadZoneManager } from "../managers/deadZoneManager.ts";
import { CenterHotspot, ToggleElement } from "../engine/utils.ts";
import { type MenuManager } from "../managers/menuManager.ts";
import { ActionPacket, InputActionType } from "common/scripts/packets/action_packet.ts";
import { TabManager } from "../managers/tabManager.ts";
import { Camera3D } from "../engine/container_3d.ts";
import { TranslationManager } from "common/scripts/engine/definitions.ts";
import { GeneralUpdate, GeneralUpdatePacket } from "common/scripts/packets/general_update.ts";
import { AmbientManager } from "../managers/ambientManager.ts";
import { Building } from "../gameObjects/building.ts";
import { MessageTabApp } from "../apps/message.ts";
import { TeamManager } from "../managers/teamManager.ts";
import { InventoryManager } from "../managers/inventoryManager.ts";
export const gridSize=5
export class Game extends ClientGame2D<GameObject>{
  client?:Client
  activePlayerId=0
  activePlayer?:Player

  action:ActionPacket=new ActionPacket()
  guiManager!:GuiManager
  inventoryManager:InventoryManager
  menuManager!:MenuManager

  can_act:boolean=true

  gameOver:boolean=false

  terrain:TerrainM=new TerrainM(this)
  
  terrain_gfx=new Graphics2D()
  grid_gfx=new Graphics2D()
  grid_mat:Material
  scope_zoom:number=0.53

  //0.14=l6 32x
  //0.27=l5 16x
  //0.35=l4 8x
  //0.53=l3 4x
  //0.63=l2 2x
  //0.73=l1 1x
  //1=l-1 0.5x
  //1.5=l-2 0.25x
  //1.75=l-3 0.1x
  //2=l-4 0.05x
  flying_position:number=0
  happening:boolean=false

  cursors={
    default:"url('/img/menu/icons/mouse.svg') 0 0, default",
    pointer:"url('/img/menu/icons/pointer.svg') 21 21, pointer"
  }

  light_map=new Lights2D()

  //minimap:MinimapManager=new MinimapManager(this)

  dead_zone:DeadZoneManager=new DeadZoneManager(this)
  ambient:AmbientManager

  language:TranslationManager

  tab:TabManager=new TabManager(this)

  fake_crosshair=new Sprite2D()

  fps:number=60
  frame_calc:number=0

  offline:boolean=false

  living_count:number[]=[2]

  cam3:Camera3D

  team:TeamManager=new TeamManager(this)

  listners_init(){
    this.input_manager.add_axis("movement",
      {
        keys:[Key.W],
        buttons:[]
      },
      {
        keys:[Key.S],
        buttons:[]
      },
      {
        keys:[Key.A],
        buttons:[]
      },
      {
        keys:[Key.D],
        buttons:[]
      }
    )
    this.input_manager.on("axis",(a:AxisActionEvent)=>{
      if(a.action==="movement"){
        this.action.movement=a.value
      }
    })
    this.input_manager.on("actiondown",(a:ActionEvent)=>{
      if(!this.can_act)return
      switch(a.action){
        case "fire":
          this.action.use_weapon=true
          break
        case "emote_wheel":
          this.guiManager.begin_emote_wheel(this.input_manager.mouse.position)
          break
        case "reload":
          this.action.reload=true
          break
        case "interact":
          this.interact()
          break
        case "swamp_guns":
          this.action.swamp_guns=true
          break
        case "weapon1":
          this.action.actions.push({type:InputActionType.set_hand,hand:0})
          break
        case "weapon2":
          this.action.actions.push({type:InputActionType.set_hand,hand:1})
          break
        case "weapon3":
          this.action.actions.push({type:InputActionType.set_hand,hand:2})
          break
        case "full_tab":
          this.tab.toggle_tab_full()
          break
        case "hide_tab":
          this.tab.toggle_tab_visibility()
          break
        case "use_item1":
          this.action.actions.push({type:InputActionType.use_item,slot:0})
          break
        case "use_item2":
          this.action.actions.push({type:InputActionType.use_item,slot:1})
          break
        case "use_item3":
          this.action.actions.push({type:InputActionType.use_item,slot:2})
          break
        case "use_item4":
          this.action.actions.push({type:InputActionType.use_item,slot:3})
          break
        case "use_item5":
          this.action.actions.push({type:InputActionType.use_item,slot:4})
          break
        case "use_item6":
          this.action.actions.push({type:InputActionType.use_item,slot:5})
          break
        case "use_item7":
          this.action.actions.push({type:InputActionType.use_item,slot:6})
          break
        case "previour_weapon":
          this.action.actions.push({type:InputActionType.set_hand,hand:this.inventoryManager.current_weapon-1})
          break
        case "next_weapon":
          this.action.actions.push({type:InputActionType.set_hand,hand:Numeric.loop(this.inventoryManager.current_weapon+1,-1,3)})
          break
        case "debug_menu":
          if((!this.menuManager.api_settings.debug.debug_menu)&&!this.offline)break
          ToggleElement(this.guiManager.content.debug_menu)
          break
      }
    })
    this.input_manager.on("actionup",(a:ActionEvent)=>{
      switch(a.action){
        case "fire":
          this.action.use_weapon=false
          break
        case "emote_wheel":
          this.guiManager.end_emote_wheel()
          break
      }
    })
    this.input_manager.mouse.listener.on(MouseEvents.MouseMove,()=>{
      if(!isMobile){
        this.fake_crosshair.visible=false
        this.action.aim_speed=Math.min(Math.abs(v2.length(this.input_manager.mouse.mouse_speed))*4,1)
        this.set_lookTo_angle(v2.lookTo(v2.new(this.camera.width/2,this.camera.height/2),v2.dscale(this.input_manager.mouse.position,this.camera.zoom)))
      }
    })
    
    this.input_manager.gamepad.listener.on(GamepadManagerEvent.analogicmove,(e: { stick: string; axis: Vec2; })=>{
      if(e.stick==="left"){
        this.action.movement=e.axis
      }else if(e.stick==="right"){
        this.set_lookTo_angle(Math.atan2(e.axis.y,e.axis.x),true)
        this.fake_crosshair.visible=true
      }
    })
  }
  set_lookTo_angle(angle:number,aim_assist:boolean=false,aim_assist_help:number=0.2){
    if(!this.activePlayer)return
    if(aim_assist){
      for(const o of this.scene.objects.objects[this.activePlayer.layer].orden){
        const obj=this.scene.objects.objects[this.activePlayer.layer].objects[o]
        if(obj.id===this.activePlayerId||obj.stringType!=="player")continue
        const ang=v2.lookTo(this.activePlayer.position,obj.position)
        if(Math.abs(angle-ang)<=aim_assist_help){
          angle=ang
          break
        }
      }
    }
    this.action.angle=angle
    if(this.save.get_variable("cv_game_client_rot")&&!this.activePlayer.driving&&this.running&&!this.gameOver){
      (this.activePlayer as Player).rotation=this.action.angle
    }
  }
  constructor(input_manager:InputManager,menu:MenuManager,sounds:SoundManager,consol:GameConsole,resources:ResourcesManager,translation:TranslationManager,renderer:Renderer,objects:Array<new ()=>GameObject>=[]){
    super(input_manager,consol,resources,sounds,renderer,[...objects,Player,Loot,Bullet,Obstacle,Explosion,Projectile,DamageSplashOBJ,Decal,PlayerBody,Vehicle,Creature,Building])
    for(const i of LayersL){
      this.scene.objects.add_layer(i)
    }
    this.language=translation
    this.renderer.background=ColorM.hex("#000")
    this.menuManager=menu

    this.cam3=new Camera3D(this.renderer)

    document.body.style.cursor=this.cursors.default
    this.terrain_gfx.zIndex=zIndexes.Terrain
    this.camera.addObject(this.terrain_gfx)
    this.camera.addObject(this.grid_gfx)
    this.grid_mat=(this.renderer as WebglRenderer).factorys2D.grid.create({
      color:ColorM.rgba(0,0,10,70),
      gridSize:3,
      width:0.012
    })
    this.grid_gfx.fill_material(this.grid_mat)
    this.grid_gfx.drawModel(model2d.rect(v2.new(-100000,-100000),v2.new(100000,100000)))
    this.camera.addObject(this.light_map)
    this.camera.addObject(this.fake_crosshair)

    this.fake_crosshair.zIndex=zIndexes.DamageSplashs
    this.fake_crosshair.hotspot=CenterHotspot

    this.light_map.zIndex=zIndexes.Lights
    this.grid_gfx.zIndex=zIndexes.Grid
    this.dead_zone.append()

    setInterval(()=>{
      this.fps=this.frame_calc
      this.frame_calc=0
    },1000)

    this.ambient=new AmbientManager(this)
    this.hitbox_view=Debug.hitbox

    this.tab.add_app(new MessageTabApp(this.tab))
    this.inventoryManager=new InventoryManager(this)
  }
  add_damageSplash(d:DamageSplash){
    this.scene.objects.add_object(new DamageSplashOBJ(),7,undefined,d)
  }
  override on_stop(): void {
    super.on_stop()
    if(!this.gameOver){
      if(this.onstop)this.onstop(this)
    }
  }
  onstop?:(g:Game)=>void
  clear(){
    this.scene.reset()
    for(const p of this.planes.values()){
      p.free()
    }
    this.planes.clear()
  }
  override on_render(_dt:number):void{
    this.cam3.update(this.dt,this.resources)
    this.light_map.render(this.renderer as WebglRenderer,this.camera)
    //this.minimap.draw()
  }
  override on_run(): void {
  }
  interact(){
    if(this.action.interact)return
    this.action.interact=true
    this.guiManager.update_active_player(this.activePlayer)
    if(this.activePlayer&&this.guiManager.current_interaction){
      this.guiManager.current_interaction.interact(this.activePlayer)
    }
  }
  override on_update(dt:number): void {
    super.on_update(dt)
    this.dead_zone.tick(dt)
    if(this.client&&this.client.opened&&this.can_act){
      this.client.emit(this.action)
      this.action.actions.length=0
      this.action.interact=false
      this.action.reload=false
      this.action.swamp_guns=false
    }
    for(const p of this.planes.values()){
      p.update(dt)
    }
    this.renderer.fullCanvas()
    this.camera.zoom=(this.scope_zoom*Numeric.clamp(1-(0.5*this.flying_position),0.5,1))

    this.ambient.update(dt)

    //FPS Show
    this.frame_calc++
  }
  update_camera(){
    if(this.activePlayer){
      this.camera.position=this.activePlayer!.position
      /*this.minimap.position=v2.duplicate(this.camera.position)
      this.minimap.update_grid(this.grid_gfx,gridSize,this.camera.position,v2.new(this.camera.width,this.camera.height),0.08)*/
      if(this.fake_crosshair.visible){
        this.fake_crosshair.position=v2.add(this.activePlayer.position,v2.scale(v2.from_RadAngle(this.activePlayer.rotation),2/this.camera.zoom))
        this.fake_crosshair.scale=v2.new(1/this.camera.zoom,1/this.camera.zoom)
      }
    }
  }
  planes:Map<number,Plane>=new Map()
  proccess_general(up:GeneralUpdate){
    for(const p of up.planes){
      if(!this.planes.has(p.id)){
        this.planes.set(p.id,new Plane(this))
      }
      const plane=this.planes.get(p.id)!
      plane.updateData(p)
    }
    if(up.dirty.living_count){
      this.living_count=up.living_count
    }
    if(up.deadzone!==undefined)this.dead_zone.update_from_data(up.deadzone)
    if(up.ambient){
      this.ambient.date=up.ambient.date
    }
  }
  wait_load(callback:()=>void){
    if(!this.menuManager.loaded){
      this.addTimeout(this.wait_load.bind(this,callback),100)
      return
    }
    callback()
  }
  async start(assets:string[]){
      await this.menuManager.game_start(assets)
      this.happening=true
      this.mainloop(true)
      this.sounds.listener_position.x=100000
      this.sounds.listener_position.y=100000
      this.camera.position.x=100000
      this.camera.position.y=100000
  }
  connect(playerName:string){
    if(!this.client)return
    const p=new JoinPacket(playerName)
    p.is_mobile=isMobile
    p.skin=Skins.getFromString(this.save.get_variable("cv_loadout_skin"))?.idNumber??0
    this.client.emit(p)
    this.ambient.reset()
  }
  connected(client:Client,playerName:string){
    this.client=client
    this.light_map.quality=this.save.get_variable("cv_graphics_lights")
    this.client.on("update",(up:UpdatePacket)=>{
      this.guiManager.update_gui(up.priv)
      this.scene.objects.proccess_list(up.objects!,true)
    })
    this.client.on("general_update",(up:GeneralUpdatePacket)=>{
      this.proccess_general(up.content)
    })
    this.client.on("killfeed",(kfp:KillFeedPacket)=>{
      this.guiManager.add_killfeed_message(kfp.message)
    })
    this.client.on("joined",(jp:JoinedPacket)=>{
      this.guiManager.start()
      this.guiManager.process_joined_packet(jp)
      this.ambient.date=jp.date

      this.tab.game_start()      
    })
    this.client.on("map",async(mp:MapPacket)=>{
      await this.terrain.process_map(mp.map)
      this.terrain.draw(this.terrain_gfx,1)
      await this.start(this.terrain.biome!.assets)
      this.wait_load(this.connect.bind(this,playerName))
      /*this.terrain.draw(this.minimap.terrain_gfx,1)
      this.minimap.init(mp.map)*/
    })
    this.client.on(DefaultSignals.DISCONNECT,()=>{
      this.running=false
    })
    if(!this.client.opened){
      console.log("not connected")
      return
    }
    this.activePlayer?.destroy()
    this.activePlayer=undefined
    
    this.activePlayerId=this.client.ID
    console.log("Joined As:",this.activePlayerId)

    this.fake_crosshair.frame=this.resources.get_sprite("crosshair_1")
    this.fake_crosshair.visible=false

    this.guiManager.players_name={}
    this.renderer.fullCanvas()
  }
  init_gui(gui:GuiManager){
    this.guiManager=gui
    this.guiManager.init(this)
    this.tab.toggle_tab_visibility()
  }
}
export async function getGame(server:string){
    return `api/${await(await fetch(`${server}/api/get-game`)).text()}/ws`
}