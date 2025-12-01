import { zIndexes } from "common/scripts/others/constants.ts";
import { type Game } from "../others/game.ts";
import { random } from "common/scripts/engine/random.ts";
import { ABParticle2D, ClientParticle2D, RainParticle2D } from "../engine/particles.ts";
import { ParticlesEmitter2D } from "common/scripts/engine/particles.ts";
import { Angle, v2 } from "common/scripts/engine/geometry.ts";
import { BiomeDef } from "common/scripts/definitions/maps/base.ts";
import { ManipulativeSoundInstance } from "../engine/sounds.ts";
import { Tween } from "../engine/utils.ts";
import { Lights2D } from "../engine/container_2d.ts";
import { ColorM } from "../engine/renderer.ts";
import { KDate } from "common/scripts/engine/definitions.ts";

export class AmbientManager{
    game:Game
    rain_particles_emitter:ParticlesEmitter2D<ClientParticle2D>
    ambient_particles_emitter:ParticlesEmitter2D<ClientParticle2D>
    snow_particles_emitter:ParticlesEmitter2D<ClientParticle2D>

    biome!:BiomeDef
    music:ManipulativeSoundInstance
    ambience:ManipulativeSoundInstance

    fog_color:number=0
    fog_saturate:number=1
    fog_constrast:number=1
    fog_enabled:boolean=false

    date:KDate={
        second:0,
        minute:0,
        day:10,
        hour:4,
        month:3,
        year:2000
    }

    constructor(game:Game){
        this.game=game
        this.rain_particles_emitter=this.game.particles.add_emiter({
                delay:0.005,
                particle:()=>new RainParticle2D({
                frame:{
                    main:{
                    image:"raindrop_1",
                    },
                    wave:{
                    image:"raindrop_2",
                    }
                },
                zindex:{
                    main:zIndexes.Rain1,
                    wave:zIndexes.Rain2,
                },
                speed:25,
                lifetime:random.float(0.5,1.2),
                scale:{
                    main:random.float(0.7,1.5)
                },
                position:v2.random2(v2.sub(this.game.camera.visual_position,v2.new(7,7)),v2.add(this.game.camera.visual_position,v2.new(this.game.camera.width,this.game.camera.height))),
                rotation:Angle.deg2rad(45),
            }),
            enabled:false
        })
        this.ambient_particles_emitter=this.game.particles.add_emiter({
            delay:2.5,
            particle:()=>{
                const ang=random.rad()
                const dir=random.rad()
                const ret=new ABParticle2D({
                    frame:{
                        image:random.choose(this.biome!.ambient.particles)
                    },
                    life_time:10,
                    direction:dir,
                    position:v2.random2(this.game.camera.visual_position,v2.add(this.game.camera.visual_position,v2.new(this.game.camera.width,this.game.camera.height))),
                    speed:random.float(0.4,1),
                    angle:ang,
                    scale:random.float(0.5,1),
                    to:{
                        angle:ang+random.float(-6,6),
                        direction:dir+random.float(-3,3),
                        }
                })
                return ret
            },
            enabled:false
        })
        const snow_color1=ColorM.number(0xededff)
        snow_color1.a=0
        const snow_color2=ColorM.number(0xededff)
        this.snow_particles_emitter=this.game.particles.add_emiter({
            delay:0.05,
            particle:()=>{
                const ang=random.rad()
                const dir=random.rad()
                const ret=new ABParticle2D({
                    frame:{
                        image:"snow_particle"
                    },
                    life_time:random.float(5,10),
                    direction:dir,
                    zIndex:zIndexes.Particles,
                    position:v2.random2(this.game.camera.visual_position,v2.add(this.game.camera.visual_position,v2.new(this.game.camera.width,this.game.camera.height))),
                    speed:random.float(0.1,0.7),
                    angle:ang,
                    scale:random.float(0.4,0.7),
                    tint:snow_color1,
                    to:{
                        angle:ang+random.float(-6,6),
                        direction:dir+random.float(-3,3),
                        scale:0.01,
                        tint:snow_color2,
                    }
                })
                return ret
            },
            enabled:false
        })

        this.music=this.game.sounds.get_manipulative_si("music")??game.sounds.add_manipulative_si("music")
        this.ambience=game.sounds.add_manipulative_si("ambience")
    }
    reset(){
        this.end_game=false
        this.music.set(null)
        this.reload()
    }
    reload(){
        this.biome=this.game.terrain.biome!
        if(this.game.save.get_variable("cv_graphics_climate")){
            this.ambient_particles_emitter.enabled=(this.biome?.ambient.particles!=undefined&&this.biome.ambient.particles.length>0)
            this.rain_particles_emitter.enabled=(this.biome?.ambient.rain!)
            this.snow_particles_emitter.enabled=(this.biome?.ambient.snow!)
        }else{
            this.ambient_particles_emitter.enabled=false
            this.rain_particles_emitter.enabled=false
            this.snow_particles_emitter.enabled=false
        }
        if(this.biome.ambient.sound){
            this.ambience.set(this.game.resources.get_audio(this.biome.ambient.sound),true)
        }else{
            this.ambience.set(null)
        }

        this.game.light_map.ambient=0

        if(this.biome.ambient.snow){
            this.fog_enabled=true
            this.fog_color=5
            this.fog_saturate=0.8
            this.fog_constrast=0.75
        }

        if(this.fog_enabled){
            this.game.renderer.canvas.style.filter = `hue-rotate(${this.fog_color}deg) saturate(${this.fog_saturate}) contrast(${this.fog_constrast})`
        }else{
            this.game.renderer.canvas.style.filter="none"
        }
    }
    /*musics:string[]=[
        "game_normal_music_1",
        "game_normal_music_2",
        "game_normal_music_3",
        "game_normal_music_4",
        "game_normal_music_5",
    ]*/
   musics:string[]=[
        "game_snow_music_1",
        "game_snow_music_2",
    ]
    ending_music:string[]=[
        "game_campaing_ending_1",
        "game_campaing_ending_2"
    ]
    end_game=false
    grand_finale(){
        if(this.end_game)return
        /*this.end_game=true
        this.music.set(null)
        this.game.addTimeout(()=>{
            if(this.game.living_count[0]>2){
                this.end_game=false
                return
            }
            this.music.set(this.game.resources.get_audio(random.choose(this.ending_music)))
            this.game.guiManager.information_killbox_messages.push(`Grand Finale`)
        },3)*/
    }
    updateLightFromDate() {
        const { hour, minute } = this.date
        const time = hour + minute / 60

        let t = 0

        if (time >= 6 && time < 19) {
            t = (time - 6) / (19 - 6)
        } else {
            if (time >= 19) {
                t = 1 - ((time - 19) / (24 - 19))
            } else {
                t = 1 - (time / 6)
            }
        }
        const ambient = (1 - t) * 0.6
        this.game.light_map.ambient = ambient
    }

    update(dt:number){
        this.date.second+=dt
        if(this.date.second>=1){
            this.date.second=0
            this.date.minute++
            if(this.date.minute>=60){
                this.date.minute=0
                this.date.hour+=1
            }
            this.game.tab.update_header(this.date)
            this.updateLightFromDate()
        }

        if(!this.music.running){
            if(Math.random()<=0.0002){
                this.music.set(this.game.resources.get_audio(random.choose(this.musics)))
            }
        }

        if(this.biome.ambient.rain){
            if(Math.random()<=0.005){
                this.bolt()
            }
        }

        if(this.game.living_count&&this.game.living_count[0]<=2){
            this.grand_finale()
        }
    }
    bolt_tween?:Tween<Lights2D>
    bolt(){
        if(this.bolt_tween){
          //
        }else{
          this.game.sounds.play(this.game.resources.get_audio(`thunder_${random.int(1,3)}`),{
    
          },"ambience")
          this.bolt_tween=this.game.addTween({
            target: this.game.light_map,
            to: { ambient: 0 },
            duration: 0.1,
            yoyo: true,
            onComplete: () => {
              this.bolt_tween = undefined;
            },
          }) as unknown as Tween<Lights2D>
        }
    }
}