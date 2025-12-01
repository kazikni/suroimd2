import { random, SeededRandom } from "./random.ts"
import { Numeric } from "./utils.ts";
export interface Vec2{
    x:number
    y:number
}
export type Orientation=0|1|2|3
export type RadAngle=number
export type DegAngle=number
export const π = 3.141592
export const τ = 1.570796
function float32ToUint32(value: number): number {
    const floatView = new Float32Array(1)
    const intView = new Uint32Array(floatView.buffer)
    floatView[0] = value
    return intView[0]
}

const prime1 = BigInt("2654435761")
const prime2 = BigInt("2246822519")

export enum RotationMode{
    null,
    limited,
    full
}

export type HashVec2=bigint

export class Vec2M implements Vec2{
    on_set:()=>void
    _x:number
    _y:number

    get x():number{return this._x}
    set x(val:number){this._x=val;this.on_set()}
    get y():number{return this._y}
    set y(val:number){this._y=val;this.on_set()}

    set(x:number,y:number){
        this._x=x
        this._y=y
        this.on_set()
    }

    constructor(x:number,y:number,on_set:()=>void=()=>{}){
        this._x=x
        this._y=y
        this.on_set=on_set
    }
}
export class Vec4M{
    on_set:()=>void
    _x:number=0
    _y:number=0
    _z:number=0
    _w:number=1

    get r():number{return this._x}
    set r(val:number){this._x=val;this.on_set()}
    get g():number{return this._y}
    set g(val:number){this._y=val;this.on_set()}
    get b():number{return this._z}
    set b(val:number){this._z=val;this.on_set()}
    get a():number{return this._w}
    set a(val:number){this._w=val;this.on_set()}

    get x():number{return this._x}
    set x(val:number){this._x=val;this.on_set()}
    get y():number{return this._y}
    set y(val:number){this._y=val;this.on_set()}
    get z():number{return this._z}
    set z(val:number){this._z=val;this.on_set()}
    get w():number{return this._w}
    set w(val:number){this._w=val;this.on_set()}
    set(x:number,y:number,z:number,w:number){
        this._x=x
        this._y=y
        this._z=z
        this._w=w
        this.on_set()
    }

    constructor(x:number,y:number,z:number,w:number,on_set:()=>void=()=>{}){
        this._x=x
        this._y=y
        this._z=z
        this._w=w
        this.on_set=on_set
    }
}
export const v2m=Object.freeze({
    single(out:Vec2,val:number){out.x=val;out.y=val;return out},
    zero(out:Vec2){out.x=0;out.y=0},
    add(out:Vec2,a:Vec2, b:Vec2){ out.x = a.x+b.x; out.y = a.y+b.y; },
    sub(out:Vec2,a:Vec2, b:Vec2){ out.x = a.x-b.x; out.y = a.y-b.y; },
    mul(out:Vec2,a:Vec2, b:Vec2){ out.x = a.x*b.x; out.y = a.y*b.y; },
    div(out:Vec2,a:Vec2, b:Vec2){ out.x = a.x/b.x; out.y = a.y/b.y; },
    scale(out:Vec2,a:Vec2, b:number){ out.x = a.x*b; out.y = a.y*b; },
    dscale(out:Vec2,a:Vec2, b:number){ out.x = a.x/b; out.y = a.y/b; },

    set(out:Vec2,x:number,y:number){out.x=x;out.y=y},
    add_component(out:Vec2,x:number,y:number){out.x+=x;out.y+=y},
    sub_component(out:Vec2,x:number,y:number){out.x-=x;out.y-=y},
    mul_component(out:Vec2,x:number,y:number){out.x*=x;out.y*=y},
    div_component(out:Vec2,x:number,y:number){out.x/=x;out.y/=y},

    scale_component(out:Vec2,x:number){out.x*=x;out.y*=x},

    min1(v:Vec2,min:number){v.x=Math.max(v.x,min);v.y=Math.max(v.y,min)},
    min2(x:Vec2,y:Vec2){x.x=Math.max(x.x,y.x);x.y=Math.max(x.y,y.y)},
    max1(v:Vec2,max:number){v.x=Math.min(v.x,max);v.y=Math.min(v.y,max)},
    max2(x:Vec2,y:Vec2){x.x=Math.min(x.x,y.x);x.y=Math.min(x.y,y.y)},

    clamp1(v:Vec2,min:number,max:number){v.x=Math.max(Math.min(v.x,max),min);v.y=Math.max(Math.min(v.y,max),min)},
    clamp2(v:Vec2,min:Vec2,max:Vec2){v.x=Math.max(Math.min(v.x,max.x),min.x);v.y=Math.max(Math.min(v.y,max.y),min.y)},
    normalizeSafe(v:Vec2,fallback?:Vec2) {
        const eps = 0.000001
        const len = v2.length(v)
        if(len>eps){
            v.x/=len
            v.y/=len
        }else{
            v.x=fallback?.x??1
            v.y=fallback?.x??0
        }
    },
    lerp(a: Vec2, b: Vec2,interpolation: number) {a.x+=(b.x-a.x)*interpolation;a.y+=(b.y-a.y)*interpolation},
    abs(a: Vec2){a.x=Math.abs(a.x);a.y=Math.abs(a.y)},
    floor(a: Vec2) {a.x=Math.floor(a.x);a.y=Math.floor(a.y)},
    ceil(a: Vec2) {a.x=Math.ceil(a.x);a.y=Math.ceil(a.y)},

    rotate_RadAngle(vec: Vec2, angle: RadAngle) {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const x = vec.x
        const y = vec.y
        vec.x = x * cos - y * sin
        vec.y = x * sin + y * cos
    },
    rotate_DegAngle(vec:Vec2,angle:DegAngle) {
        const a=Angle.deg2rad(angle)
        const cos = Math.cos(a)
        const sin = Math.sin(a)
        const x = vec.x
        const y = vec.y
        vec.x=x * cos - y * sin
        vec.y=x * sin + y * cos
    },

    neg(vec:Vec2){
        vec.x=-vec.x
        vec.y=-vec.y
    }
})
export const v2_sides:Array<Vec2>=[
    {
        x:1,
        y:1,
    },
    {
        x:-1,
        y:1,
    },
    {
        x:-1,
        y:-1,
    },
    {
        x:1,
        y:-1,
    }
]
export const v2 = Object.freeze({
    /**
     * Creates a new `Vec2`
     * @param x The horizontal (x-axis) coordinate
     * @param y The vertical (y-axis) coordinate
     * @returns A new `Vec2` With X and Y Cords
     */
    new(x:number, y:number): Vec2 {
        return {x, y}
    },
    sided(side:Orientation):Vec2{
        switch(side){
            case 0:
                return v2.new(1,1)
            case 1:
                return v2.new(-1,1)
            case 2:
                return v2.new(-1,-1)
            case 3:
                return v2.new(1,-1)
        }
    },
    orientation_random(side:Orientation,min:Vec2,max:Vec2,expansion:number,random:SeededRandom):Vec2{
        switch(side){
            case 0:
                return v2.new(max.x+expansion,random.float(min.y,max.y))
            case 1:
                return v2.new(random.float(min.x,max.x),max.y+expansion)
            case 2:
                return v2.new(min.x-expansion,random.float(min.y,max.y))
            case 3:
                return v2.new(random.float(min.x,max.x),min.y-expansion)
        }
    },
    /**
     * Return Random Vec2
     */
    random(min:number, max:number):Vec2 {
        return {x:random.float(min,max),y:random.float(min,max)}
    },
    random2(min:Vec2, max:Vec2):Vec2 {
        return {x:random.float(min.x,max.x),y:random.float(min.y,max.y)}
    },
    
    /**
     * Return Random Vec2
     */
    random_s(min:number, max:number,random:SeededRandom):Vec2 {
        return {x:random.float(min,max),y:random.float(min,max)}
    },
    random2_s(min:Vec2, max:Vec2,random:SeededRandom):Vec2 {
        return {x:random.float(min.x,max.x),y:random.float(min.y,max.y)}
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns A new `Vec2` With `x`+`y`
     */
    add(x:Vec2, y:Vec2):Vec2 {
        return this.new(x.x+y.x,x.y+y.y)
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns A new `Vec2` With `x`+`y`
     */
    add_with_orientation(x:Vec2, y:Vec2,side:Orientation):Vec2 {
        if (side === 0) return this.add(x, y);
        let xOffset: number, yOffset: number;
        switch (side) {
            case 1:
                xOffset = y.y;
                yOffset = -y.x;
                break;
            case 2:
                xOffset = -y.x;
                yOffset = -y.y;
                break;
            case 3:
                xOffset = -y.y;
                yOffset = y.x;
                break;
        }
        return this.add(x, v2.new(xOffset, yOffset));
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns A new `Vec2` With `x`-`y`
     */
    sub(x:Vec2, y:Vec2):Vec2 {
        return this.new(x.x-y.x,x.y-y.y)
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns A new `Vec2` With `x`*`y`
     */
    mult(x:Vec2, y:Vec2):Vec2 {
        return this.new(x.x*y.x,x.y*y.y)
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns A new `Vec2` With `x`/`y`
     */
    div(x:Vec2, y:Vec2):Vec2 {
        return this.new(x.x/y.x,x.y/y.y)
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns `boolean` of operation `x`>`y`
     */
    greater(x:Vec2, y:Vec2):boolean {
        return x.x>y.x&&x.y>y.y
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns `boolean` of operation `x`<`y`
     */
    less(x:Vec2, y:Vec2):boolean {
        return x.x<y.x&&x.y<y.y
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns `boolean` of operation `x`==`y`
     */
    is(x:Vec2, y:Vec2):boolean {
        return x.x==y.x&&x.y==y.y
    },
    /**
     * @param Vec2 `Vec2`
     * @param scale `Scale`
     * @returns A new `Vec2` With `Vec2`*`scale`
     */
    scale(Vec2:Vec2, scale:number):Vec2 {
        return this.new(Vec2.x*scale,Vec2.y*scale)
    },
    /**
     * @param Vec2 `Vec2`
     * @param dscale `DeScale`
     * @returns A new `Vec2` With `Vec2`/`dscale`
     */
    dscale(Vec2:Vec2, dscale:number):Vec2 {
        return this.new(Vec2.x/dscale,Vec2.y/dscale)
    },
    /**
     * 
     * @param Vec2 `Vec2`
     * @param min `Limit`
     * @returns A new `Vec2` With Limit down 
     */
    min1(Vec2:Vec2,min:number):Vec2{
        return this.new(Math.max(Vec2.x,min),Math.max(Vec2.y,min))
    },
    /**
     * 
     * @param x `Vec2`
     * @param y `Limit`
     * @returns A new `Vec2` With Limit down
     */
    min2(x:Vec2,y:Vec2):Vec2{
        return this.new(Math.max(x.x,y.x),Math.max(x.y,y.y))
    },
    /**
     * 
     * @param Vec2 `Vec2`
     * @param max `Limit`
     * @returns A new `Vec2` With Limit down 
     */
    max1(Vec2:Vec2,max:number):Vec2{
        return this.new(Math.min(Vec2.x,max),Math.min(Vec2.y,max))
    },
    /**
     * 
     * @param x `Vec2`
     * @param y `Limit`
     * @returns A new `Vec2` With Limit up
     */
    max2(x:Vec2,y:Vec2):Vec2{
        return this.new(Math.min(x.x,y.x),Math.min(x.y,y.y))
    },

    /**
     * 
     * @param Vec2 `Vec2`
     * @param min `Min Limit`
     * @param max `Max Limit`
     * @returns A new `Vec2` With Limit
     */
    clamp1(Vec2:Vec2,min:number,max:number):Vec2{
        return this.new(Math.max(Math.min(Vec2.x,max),min),Math.max(Math.min(Vec2.y,max),min))
    },
    /**
     * 
     * @param Vec2 `Vec2`
     * @param min `Min Limit`
     * @param max `Max Limit`
     * @returns A new `Vec2` With Limit
     */
    clamp2(Vec2:Vec2,min:Vec2,max:Vec2):Vec2{
        return this.new(Math.max(Math.min(Vec2.x,max.x),min.x),Math.max(Math.min(Vec2.y,max.y),min.y))
    },
    /**
     * 
     * @param vec The Vector
     * @param decimalPlaces `number of max decimals`
     * @returns max decimal `Vec2`
     */
    maxDecimal(vec:Vec2,decimalPlaces:number=3):Vec2{
        const factor = Math.pow(10, decimalPlaces)
        return this.new(Math.round(vec.x * factor) / factor,Math.round(vec.y * factor) / factor)
    },
    /**
     * 
     * @param vec `Vec2`
     * @returns Rounded`Vec2`
     */
    round(vec:Vec2):Vec2{
        return this.new(Math.round(vec.x),Math.round(vec.y))
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns A `RadAngle` of 2 Vec2s
     */
    lookTo(x:Vec2, y:Vec2):RadAngle {
        return Math.atan2(y.y-x.y,y.x-x.x)
    },
    /**
     * 
     * @param angle `Radians Angle`
     * @returns A new `Vec2` With angle pos
     */
    from_RadAngle(angle:RadAngle):Vec2 {
        return this.new(Math.cos(angle),Math.sin(angle) )
    },
    /**
     * 
     * @param angle `Degrese Angle`
     * @returns A new `Vec2` With angle pos
     */
    from_DegAngle(angle:DegAngle):Vec2 {
        const a=Angle.deg2rad(angle)
        return this.new(Math.cos(a),Math.sin(a))
    },
    /**
     * 
     * @param angle `Radians Angle`
     * @returns A new `Vec2` With angle pos
     */
    rotate_RadAngle(vec:Vec2,angle:RadAngle):Vec2 {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return this.new(vec.x * cos - vec.y * sin, vec.x * sin + vec.y * cos)
    },
    /**
     * 
     * @param angle `Degrese Angle`
     * @returns A new `Vec2` With angle pos
     */
    rotate_DegAngle(vec:Vec2,angle:DegAngle):Vec2 {
        const a=Angle.deg2rad(angle)
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        return this.new(vec.x * cos - vec.y * sin, vec.x * sin + vec.y * cos)
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns A new `Vec2` With distance of `Vec21` and `Vec22`
     */
    distanceSquared(x:Vec2,y:Vec2):number{
        const dx=x.x-y.x
        const dy=x.y-y.y
        return dx*dx+dy*dy
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns A new `Vec2` With distance squared of `Vec21` and `Vec22`
     */
    distance(x:Vec2,y:Vec2):number{
        const dx=x.x-y.x
        const dy=x.y-y.y
        return Math.sqrt(dx*dx+dy*dy)
    },
    /**
     * @param Vec2 `Vec2`
     * @returns A new `Vec2` With squared of `Vec21`
     */
    squared(Vec:Vec2):number{
        return Vec.x*Vec.x+Vec.y*Vec.y
    },
    dot(x: Vec2, y: Vec2): number {
        return x.x * y.x + x.y * y.y;
    },
    /**
     * @param Vec2 The `Vec2` used in lenght
     * @returns 
     */
    length(Vec2: Vec2): number {
        return Math.sqrt(v2.squared(Vec2))
    },
    
    /**
     * 
     * @param Vec2 `Vec2`
     * @returns A new Absolute `Vec2`
     */
    absolute(Vec2:Vec2):Vec2{
        return this.new(Math.abs(Vec2.x),Math.abs(Vec2.y))
    },
    /**
     * 
     * @param Vec2 `Vec3`
     * @returns A new Interger `Vec3`
     */
    floor(Vec2:Vec2):Vec2{
        return this.new(Math.floor(Vec2.x),Math.floor(Vec2.y))
    },
    /**
     * 
     * @param Vec2 `Vec3`
     * @returns A new Ceil `Vec3`
     */
    ceil(Vec2:Vec2):Vec2{
        return this.new(Math.ceil(Vec2.x),Math.ceil(Vec2.y))
    },
    neg(vec:Vec2):Vec2{
        return this.new(-vec.x,-vec.y)
    },
    /**
     * 
     * @param current The current `Vec2` Position
     * @param end The Final `Vec2` Position
     * @param interpolation 
     * @returns 
     */
    lerp(current: Vec2, end: Vec2,interpolation: number): Vec2 {
        return this.add(v2.scale(current,1-interpolation), this.scale(end,interpolation))
    },
    /**
     * @param Vec2 The `Vec2` to normalize
     * @param fallback A `Vec2` to clone and return in case the normalization operation fails
     * @returns A `Vec2` whose length is 1 and is parallel to the original Vec2
     */
    normalizeSafe(Vec2:Vec2,fallback?:Vec2):Vec2 {
        const eps = 0.000001
        const len = this.length(Vec2)
        fallback??=this.new(1,0)
        return len > eps
            ? {
                x:Vec2.x/len,
                y:Vec2.y/len
            }:this.duplicate(fallback)
    },
    /**
     * @param Vec2 The `Vec2` to normalize
     * @returns A `Vec2` whose length is 1 and is parallel to the original Vec2
     */
    normalize(Vec2:Vec2): Vec2 {
        const eps = 0.000001
        const len = v2.length(Vec2)
        return eps
            ? {
                x:Vec2.x/len,
                y:Vec2.y/len
            }: v2.duplicate(Vec2)
    },
    /**
     * 
     * @param Vec2 The `Vec2` To Duplication
     * @returns The Duplicated Vec2
     */
    duplicate(Vec2:Vec2):Vec2{
        return this.new(Vec2.x,Vec2.y)
    },
    /**
     * 
     * @param Vec2 The `Vec2` To hash
     * @returns Hashed Vec2
     */
    hash(Vec2:Vec2):HashVec2{
        let hash = BigInt(float32ToUint32(Vec2.x))
        hash = (hash * prime1) & BigInt("4294967295")
        hash ^= BigInt(float32ToUint32(Vec2.y))
        hash = (hash * prime2) & BigInt("4294967295")
        return hash
    },
    toString(Vec2:Vec2):string{
        return `{${Vec2.x},${Vec2.y}}`
    },
})
export interface Vec3{
    x:number
    y:number
    z:number
}
export const v3 = Object.freeze({
    /**
     * Creates a new `Vec3`
     * @param x The horizontal (x-axis) coordinate
     * @param y The vertical (y-axis) coordinate
     * @param z The depth (z-axis) coordinate
     * @returns A new `Vec2` With X and Y Cords
     */
    new(x:number, y:number,z:number): Vec3 {
        return {x, y,z}
    },
    /**
     * Return Random Vec2
     */
    random(min:number, max:number):Vec3 {
        return {x:random.float(min,max),y:random.float(min,max),z:random.float(min,max)}
    },
    random2(min:Vec3, max:Vec3):Vec3 {
        return {x:random.float(min.x,max.x),y:random.float(min.y,max.y),z:random.float(min.z,max.z)}
    },
    
    /**
     * Return Random Vec2
     */
    random_s(min:number, max:number,random:SeededRandom):Vec3 {
        return {x:random.float(min,max),y:random.float(min,max),z:random.float(min,max)}
    },
    random2_s(min:Vec3, max:Vec3,random:SeededRandom):Vec3 {
        return {x:random.float(min.x,max.x),y:random.float(min.y,max.y),z:random.float(min.z,max.z)}
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns A new `Vec3` With `x`+`y`
     */
    add(x:Vec3, y:Vec3):Vec3 {
        return this.new(x.x+y.x,x.y+y.y,x.z+y.z)
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns A new `Vec3` With `x`-`y`
     */
    sub(x:Vec3, y:Vec3):Vec3 {
        return this.new(x.x-y.x,x.y-y.y,x.z-y.z)
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns A new `Vec3` With `x`*`y`
     */
    mult(x:Vec3, y:Vec3):Vec3 {
        return this.new(x.x*y.x,x.y*y.y,x.z*y.z)
    },
    /**
     * @param x `Vec21`
     * @param y `Vec22`
     * @returns A new `Vec2` With `x`/`y`
     */
    div(x:Vec3, y:Vec3):Vec3 {
        return this.new(x.x/y.x,x.y/y.y,x.z/y.z)
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns `boolean` of operation `x`>`y`
     */
    greater(x:Vec3, y:Vec3):boolean {
        return x.x>y.x&&x.y>y.y&&x.z>y.z
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns `boolean` of operation `x`<`y`
     */
    less(x:Vec3, y:Vec3):boolean {
        return x.x<y.x&&x.y<y.y&&x.z<y.z
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns `boolean` of operation `x`==`y`
     */
    is(x:Vec3, y:Vec3):boolean {
        return x.x==y.x&&x.y==y.y&&x.z==y.z
    },
    /**
     * @param v `Vec3`
     * @param scale `Scale`
     * @returns A new `Vec3` With `v`*`scale`
     */
    scale(v:Vec3, scale:number):Vec3 {
        return this.new(v.x*scale,v.y*scale,v.z*scale)
    },
    /**
     * @param v `Vec3`
     * @param dscale `DeScale`
     * @returns A new `Vec3` With `v`/`dscale`
     */
    dscale(v:Vec3, dscale:number):Vec3 {
        return this.new(v.x/dscale,v.y/dscale,v.z/dscale)
    },
    /**
     * 
     * @param v `Vec3`
     * @param min `Limit`
     * @returns A new `Vec3` With Limit down 
     */
    min1(v:Vec3,min:number):Vec3{
        return this.new(Math.max(v.x,min),Math.max(v.y,min),Math.max(v.z,min))
    },
    /**
     * 
     * @param v `Vec3`
     * @param min `Limit`
     * @returns A new `Vec3` With Limit down 
     */
    min3(v:Vec3,min:Vec3):Vec3{
        return this.new(Math.max(v.x,min.x),Math.max(v.y,min.y),Math.max(v.z,min.z))
    },
    /**
     * 
     * @param v `Vec3`
     * @param max `Limit`
     * @returns A new `Vec3` With Limit down 
     */
    max1(v:Vec3,max:number):Vec3{
        return this.new(Math.min(v.x,max),Math.min(v.y,max),Math.min(v.z,max))
    },
    /**
     * 
     * @param v `Vec3`
     * @param max `Limit`
     * @returns A new `Vec3` With Limit down 
     */
    max3(v:Vec3,max:Vec3):Vec3{
        return this.new(Math.min(v.x,max.x),Math.min(v.y,max.y),Math.min(v.z,max.z))
    },
    /**
     * 
     * @param v `Vec3`
     * @param min `Min Limit`
     * @param max `Max Limit`
     * @returns A new `Vec3` With Limit
     */
    clamp1(v:Vec3,min:number,max:number):Vec3{
        return this.new(Math.max(Math.min(v.x,max),min),Math.max(Math.min(v.y,max),min),Math.max(Math.min(v.z,max),min))
    },
    /**
     * 
     * @param v `Vec3`
     * @param min `Min Limit`
     * @param max `Max Limit`
     * @returns A new `Vec3` With Limit
     */
    clamp3(v:Vec3,min:Vec3,max:Vec3):Vec3{
        return this.new(Math.max(Math.min(v.x,max.x),min.x),Math.max(Math.min(v.y,max.y),min.y),Math.max(Math.min(v.z,max.z),min.y))
    },
    /**
     * 
     * @param vec The Vector
     * @param decimalPlaces `number of max decimals`
     * @returns max decimal `Vec3`
     */
    maxDecimal(vec:Vec3,decimalPlaces:number=3):Vec3{
        const factor = Math.pow(10, decimalPlaces)
        return this.new(Math.round(vec.x * factor) / factor,Math.round(vec.y * factor) / factor,Math.round(vec.z * factor) / factor)
    },
    /**
     * 
     * @param vec `Vec3`
     * @returns Rounded`Vec3`
     */
    round(vec:Vec3):Vec3{
        return this.new(Math.round(vec.x),Math.round(vec.y),Math.round(vec.z))
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns A new `Vec3` With distance of `Vec3a` and `Vec3b`
     */
    distanceSquared(x:Vec3,y:Vec3):number{
        const dx=x.x-y.x
        const dy=x.y-y.y
        const dz=x.z-y.z
        return dx*dx+dy*dy+dz*dz
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns A new `Vec3` With distance squared of `Vec3a` and `Vec3b`
     */
    distance(x:Vec3,y:Vec3):number{
        const dx=x.x-y.x
        const dy=x.y-y.y
        const dz=x.z-y.z
        return Math.sqrt(dx*dx+dy*dy+dz*dz)
    },
    /**
     * @param Vec `Vec3`
     * @returns A new `Vec3` With squared of `Vec`
     */
    squared(Vec:Vec3):number{
        return Vec.x*Vec.x+Vec.y*Vec.y+Vec.z*Vec.z
    },
    dot(x: Vec3, y: Vec3): number {
        return x.x * y.x + x.y * y.y + x.z * y.z;
    },
    /**
     * @param v The `Vec3` used in lenght
     * @returns 
     */
    length(v: Vec3): number {
        return Math.sqrt(this.squared(v))
    },
    
    /**
     * 
     * @param v `Vec3`
     * @returns A new Absolute `Vec3`
     */
    absolute(v:Vec3):Vec3{
        return this.new(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))
    },
    /**
     * 
     * @param v `Vec3`
     * @returns A new Interger `Vec3`
     */
    floor(v:Vec3):Vec3{
        return this.new(Math.floor(v.x),Math.floor(v.y),Math.floor(v.z))
    },
    /**
     * 
     * @param v `Vec3`
     * @returns A new Ceil `Vec3`
     */
    ceil(v:Vec3):Vec3{
        return this.new(Math.ceil(v.x),Math.ceil(v.y),Math.ceil(v.z))
    },
    neg(vec:Vec3):Vec3{
        return this.new(-vec.x,-vec.y,-vec.z)
    },
    /**
     * 
     * @param current The current `Vec2` Position
     * @param end The Final `Vec2` Position
     * @param interpolation 
     * @returns 
     */
    lerp(current: Vec3, end: Vec3,interpolation: number): Vec3 {
        return this.add(this.scale(current,1-interpolation), this.scale(end,interpolation))
    },
    /**
     * @param v The `Vec3` to normalize
     * @param fallback A `Vec3` to clone and return in case the normalization operation fails
     * @returns A `Vec3` whose length is 1 and is parallel to the original v
     */
    normalizeSafe(v:Vec3,fallback?:Vec3):Vec3 {
        const eps = 0.000001
        const len = this.length(v)
        fallback??=this.new(1,0,0)
        return len > eps
            ? {
                x:v.x/len,
                y:v.y/len,
                z:v.z/len,
            }:this.duplicate(fallback)
    },
    /**
     * @param v The `Vec3` to normalize
     * @returns A `Vec3` whose length is 1 and is parallel to the original v
     */
    normalize(v:Vec3): Vec3 {
        const eps = 0.000001
        const len = v2.length(v)
        return eps
            ? {
                x:v.x/len,
                y:v.y/len,
                z:v.z/len,
            }: this.duplicate(v)
    },
    /**
     * 
     * @param v The `Vec3` To Duplication
     * @returns The Duplicated Vec3
     */
    duplicate(v:Vec3):Vec3{
        return this.new(v.x,v.y,v.z)
    },
    toString(v:Vec3):string{
        return `{${v.x},${v.y},${v.z}}`
    },
})
export const NullVec2:Vec2=v2.new(0,0)
export const OneVec2:Vec2=v2.new(1,1)
export const Angle=Object.freeze({
    deg2rad(angle:DegAngle):RadAngle{
        return angle* Math.PI / 180
    },
    rad2deg(angle:RadAngle):DegAngle {
        return angle * 180 / Math.PI
    },
    normalize(a: RadAngle): number {
        return Numeric.abs_module(a - π, τ) - π
    },
    side_rad(side:Orientation){
        switch(side){
            case 0:
                return 0
            case 1:
                return τ
            case 2:
                return π
            case 3:
                return -τ
        }
    },
    side_deg(side:Orientation){
        switch(side){
            case 0:
                return 0
            case 1:
                return 90
            case 2:
                return 180
            case 3:
                return -90
        }
    },
    random_rotation_modded(mode:RotationMode):RadAngle{
        switch(mode){
            case RotationMode.null:
                return 0
            case RotationMode.limited:
                return random.choose([rotationFull.left,rotationFull.right,rotationFull.bottom,rotationFull.top])
            case RotationMode.full:
                return random.float(-3.141592,3.141592)
        }
    }
})

export const rotationFull={
    right:0,
    left:Angle.deg2rad(-180),
    bottom:Angle.deg2rad(90),
    top:Angle.deg2rad(-90),
}
/**
 * Suaviza um polígono usando Catmull–Rom spline
 * @param polygon - Lista de pontos do polígono (fechado)
 * @param subdivisions - Número de subdivisões por segmento (maior = mais suave)
 */
export function SmoothShape2D(polygon: Vec2[], subdivisions: number = 8): Vec2[] {
    if (polygon.length < 3) return polygon;

    const result: Vec2[] = [];
    const n = polygon.length;

    // Garante que é fechado
    const points = [...polygon, polygon[0], polygon[1], polygon[2]];

    // Catmull–Rom: gera pontos suaves
    for (let i = 0; i < n; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const p2 = points[i + 2];
        const p3 = points[i + 3];

        for (let t = 0; t < subdivisions; t++) {
            const tt = t / subdivisions;
            const tt2 = tt * tt;
            const tt3 = tt2 * tt;

            const x = 0.5 * (
                (2 * p1.x) +
                (-p0.x + p2.x) * tt +
                (2*p0.x - 5*p1.x + 4*p2.x - p3.x) * tt2 +
                (-p0.x + 3*p1.x - 3*p2.x + p3.x) * tt3
            );

            const y = 0.5 * (
                (2 * p1.y) +
                (-p0.y + p2.y) * tt +
                (2*p0.y - 5*p1.y + 4*p2.y - p3.y) * tt2 +
                (-p0.y + 3*p1.y - 3*p2.y + p3.y) * tt3
            );

            result.push(v2.new(x, y));
        }
    }

    return result;
}

export type OverlapCollision2D={
    dir:Vec2
    pen:number
}
export const Collision=Object.freeze({
    circle_with_circle(circle_1_radius:number,circle_2_radius:number,circle_1_position:Vec2,circle_2_position:Vec2){
        return v2.distance(circle_1_position,circle_2_position)<circle_1_radius+circle_2_radius
    },
    rect_with_rect(rect_1_min:Vec2,rect_2_min:Vec2,rect_1_max:Vec2,rect_2_max:Vec2){
        return v2.greater(rect_1_max,rect_2_min)&&v2.less(rect_1_min,rect_2_max)
    },
    circle_with_rect(circle_position: Vec2, circle_radius: number, rect_min: Vec2, rect_max: Vec2): boolean {
        const closest = v2.clamp2(circle_position, rect_min, rect_max);
        const distSq = v2.distanceSquared(circle_position, closest);
        return distSq <= (circle_radius * circle_radius);
    },
    circle_with_rect_ov(circle_pos: Vec2, radius: number, rect_min: Vec2, rect_max: Vec2) {
        const closest = v2.clamp2(circle_pos, rect_min, rect_max);

        const diff = v2.sub(circle_pos, closest);
        const distSq = v2.squared(diff);
        const radiusSq = radius * radius;

        if (distSq <= radiusSq) {
            const dist = Math.sqrt(distSq) || 0.000001;
            const penetration = radius - dist;

            const normal = v2.scale(diff, -(1 / dist));

            return {
                dir: normal,
                pen: penetration
            };
        }
        if (circle_pos.x >= rect_min.x && circle_pos.x <= rect_max.x &&
            circle_pos.y >= rect_min.y && circle_pos.y <= rect_max.y) {

            const left = circle_pos.x - rect_min.x;
            const right = rect_max.x - circle_pos.x;
            const top = circle_pos.y - rect_min.y;
            const bottom = rect_max.y - circle_pos.y;

            const minDist = Math.min(left, right, top, bottom);

            if (minDist === left) return { dir: v2.new(1, 0), pen: radius - left };
            if (minDist === right) return { dir: v2.new(-1, 0), pen: radius - right };
            if (minDist === top) return { dir: v2.new(0, 1), pen: radius - top };
            return { dir: v2.new(0, -1), pen: radius - bottom };
        }

        return undefined;
    },
    distToSegmentSq(p: Vec2, a: Vec2, b: Vec2) {
        const ab = v2.sub(b, a);
        const c = v2.dot(v2.sub(p, a), ab) / v2.dot(ab, ab);
        const d = v2.add(a, v2.scale(ab, Math.max(0, Math.min(1, c))));
        const e = v2.sub(d, p);
        return v2.dot(e, e);
    },

    distToPolygonSq(p: Vec2, poly: Vec2[]) {
        let closestDistSq = Number.MAX_VALUE;
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = (i === poly.length - 1) ? poly[0] : poly[i + 1];
            const distSq = Collision.distToSegmentSq(p, a, b);
            if (distSq < closestDistSq) {
                closestDistSq = distSq;
            }
        }
        return closestDistSq;
    },

    distToPolygon(p: Vec2, poly: Vec2[]) {
        return Math.sqrt(Collision.distToPolygonSq(p, poly));
    },

    rayIntersectsLine(origin: Vec2, direction: Vec2, a: Vec2, b: Vec2): number | null {
        const ab = v2.sub(b, a);
        const perp = v2.new(ab.y, -ab.x);
        const perpDotDir = v2.dot(direction, perp);

        if (Math.abs(perpDotDir) <= 1e-7) return null; // paralelo

        const d = v2.sub(a, origin);
        const distAlongRay = v2.dot(perp, d) / perpDotDir;
        const distAlongLine = v2.dot(v2.new(direction.y, -direction.x), d) / perpDotDir;

        return distAlongRay >= 0 && distAlongLine >= 0 && distAlongLine <= 1
            ? distAlongRay
            : null;
    },

    rayIntersectsPolygon(origin: Vec2, direction: Vec2, poly: Vec2[]): number | null {
        let t = Number.MAX_VALUE;
        let hit = false;

        for (let i = 0, len = poly.length, j = len - 1; i < len; j = i++) {
            const dist = Collision.rayIntersectsLine(origin, direction, poly[j], poly[i]);
            if (dist !== null && dist < t) {
                hit = true;
                t = dist;
            }
        }
        return hit ? t : null;
    },

    pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;

            const intersect = ((yi > p.y) !== (yj > p.y)) &&
                            (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    },
    polygon_with_point(poly: Vec2[], point: Vec2) {
        return Collision.pointInPolygon(point, poly);
    },

    polygon_with_circle(poly: Vec2[], circlePos: Vec2, radius: number) {
        if (Collision.pointInPolygon(circlePos, poly)) return true;

        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = (i === poly.length - 1) ? poly[0] : poly[i + 1];
            if (Collision.distToSegmentSq(circlePos, a, b) <= radius * radius) {
                return true;
            }
        }
        return false;
    },

    polygon_with_polygon(polyA: Vec2[], polyB: Vec2[]) {
        for (const p of polyA) if (Collision.pointInPolygon(p, polyB)) return true;
        for (const p of polyB) if (Collision.pointInPolygon(p, polyA)) return true;

        for (let i = 0; i < polyA.length; i++) {
            const a1 = polyA[i];
            const a2 = polyA[(i + 1) % polyA.length];
            for (let j = 0; j < polyB.length; j++) {
                const b1 = polyB[j];
                const b2 = polyB[(j + 1) % polyB.length];
                if (Collision.segmentsIntersect(a1, a2, b1, b2)) return true;
            }
        }
        return false;
    },

    segmentsIntersect(p1: Vec2, p2: Vec2, q1: Vec2, q2: Vec2) {
        function ccw(a: Vec2, b: Vec2, c: Vec2) {
            return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
        }
        return ccw(p1, q1, q2) !== ccw(p2, q1, q2) &&
            ccw(p1, p2, q1) !== ccw(p1, p2, q2);
    },
})
export interface Rect{
    min:Vec2
    max:Vec2
}