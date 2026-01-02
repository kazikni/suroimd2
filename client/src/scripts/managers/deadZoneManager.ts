import { v2, Vec2 } from "common/scripts/engine/geometry.ts"
import { type Game } from "../others/game.ts"
import { zIndexes } from "common/scripts/others/constants.ts"
import { Graphics2D } from "../engine/mod.ts"
import { model2d } from "common/scripts/engine/models.ts"
import { Color, ColorM } from "../engine/renderer.ts"
import { Numeric } from "common/scripts/engine/utils.ts"
import { ParticlesEmitter2D } from "common/scripts/engine/particles.ts"
import { CircleHitbox2D } from "common/scripts/engine/hitbox.ts"
import { random } from "common/scripts/engine/random.ts"
import { GraphicsDConfig } from "../others/config.ts"
import { ABParticle2D, ClientParticle2D } from "../engine/particles.ts"
import { DeadZoneUpdate } from "common/scripts/packets/general_update.ts"
export class DeadZoneManager{
    radius:number=5
    position:Vec2=v2.new(0,0)
    sprite:Graphics2D=new Graphics2D()
    map_sprite:Graphics2D=new Graphics2D()
    game:Game
    pa!:ParticlesEmitter2D<ClientParticle2D>
    constructor(game:Game){
        this.game=game
        this.sprite.zIndex=zIndexes.DeadZone
        this.sprite.scale=v2.new(1,1)
        this.game.camera.addObject(this.sprite)
    }
    hitbox:CircleHitbox2D=new CircleHitbox2D(v2.new(0,0),1)
    append(){
        const model=model2d.outlineCircle(1,100*1000,200)
        this.sprite.fill_color(this.color)
        this.sprite.drawModel(model)
        const model2=model2d.outlineCircle(0.997,0.003,200)
        this.sprite.fill_color(ColorM.rgba(255,255,255,40))
        this.sprite.drawModel(model2)
        this.set_current(v2.new(20,20),10)
        this.pa=this.game.particles.add_emiter({
            delay:0.3,
            particle:()=>{
                const pos=v2.random2(this.game.camera.visual_position,v2.add(this.game.camera.visual_position,v2.new(this.game.camera.width,this.game.camera.height)))
                if(this.hitbox.pointInside(pos))return undefined
                return new ABParticle2D({
                    frame:{
                        image:"deadzone_particle"
                    },
                    position:pos,
                    tint:this.color,
                    speed:random.float(0.1,0.4),
                    angle:random.float(-3.1415,3.1415),
                    direction:random.float(-3.1415,3.1415),
                    life_time:random.float(5,6),
                    zIndex:zIndexes.DeadZone,
                    scale:random.float(2,4),
                    to:{
                        speed:random.float(0.1,0.6),
                        angle:random.float(-3.1415*2,3.1415*2),
                    }
                })
            },
            enabled:this.game.save.get_variable("cv_graphics_particles")>=GraphicsDConfig.Advanced
        })
    }
    color:Color=ColorM.hex("#21f2")
    tick(dt:number){
    }
    update_from_data(data:DeadZoneUpdate){
        this.set_current(data.position,data.radius)
    }
    set_current(position:Vec2,radius:number){
        this.position=position
        this.radius=radius

        this.sprite.scale=v2.new(radius,radius)
        this.sprite.position=position

        this.hitbox.position=position
        this.hitbox.radius=radius

        if(!this.game.terrain.map)return
        const rm=Numeric.clamp(radius/this.game.terrain.map.size.x,0,1)
        const dd=ColorM.lerp(ColorM.hex("#f125"),ColorM.hex("#21f4"),rm)
        this.color.r=dd.r
        this.color.g=dd.g
        this.color.b=dd.b
        this.color.a=dd.a
    }
}