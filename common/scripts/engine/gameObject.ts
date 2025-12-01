import { v2, v2m, Vec2 } from "./geometry.ts"
import { type Hitbox2D, NullHitbox2D } from "./hitbox.ts"
import { type ID } from "./utils.ts"
import { NetStream } from "./stream.ts";
import { random } from "./random.ts";
export type GameObjectID=ID
export abstract class BaseObject2D{
    public hb:Hitbox2D
    public destroyed:boolean
    public id!:GameObjectID
    public layer!:number
    public calldestroy:boolean=true
    public dirty:boolean=false
    public dirtyPart:boolean=false
    public is_new:boolean=true
    abstract numberType:number
    abstract stringType:string

    updatable=true
    // deno-lint-ignore no-explicit-any
    public manager!:GameObjectManager2D<any>
    public get position():Vec2{
        return this.hb.position
    }
    set position(val:Vec2){
        this.hb.translate(val)
    }
    constructor(){
        this.hb=new NullHitbox2D(v2.new(0,0))
        this.destroyed=false
    }
    encode(stream:NetStream,full:boolean):void{}
    decode(stream:NetStream,full:boolean):void{}
    abstract update(dt:number):void
    net_update():void{}
    // deno-lint-ignore no-explicit-any
    abstract create(args:Record<string,any>):void
    on_destroy():void{}
    destroy():void{
        if(this.destroyed)return
        this.destroyed=true
        this.manager.destroy_queue.push(this)
    }
    netSync={
        deletion:true,
        dirty:true,
        creation:true,
    }
    encodeObject(full:boolean,stream:NetStream,priv:boolean=false){
        const bools=[
            (full||this.dirtyPart)&&this.netSync.dirty,//Dirty Part
            (full||this.dirty)&&this.netSync.dirty,//Dirty Full
            this.destroyed&&this.netSync.deletion,//Dirty Deletion
            this.netSync.creation,//Dirty Creation
            this.is_new
        ]
        stream.writeBooleanGroup(bools[0],bools[1],bools[2],bools[3],bools[4])
        if(bools[0]||bools[1]||bools[2]){
            stream.writeID(this.id)
            stream.writeInt8(this.layer)
            stream.writeUint8(this.numberType)
            if(bools[0]||bools[1]){
                this.encode(stream,bools[1])
                /*const data=this.getData()
                const e=(encoders??this.manager.encoders)[this.stringType]
                if(!e)return
                e.encode(bools[1],data,stream)
                if(priv&&data.private&&e.encode_private)e.encode_private(data.private,stream)*/
            }
        }
    }
}

export interface Layer2D<GameObject extends BaseObject2D> {objects:Record<GameObjectID,GameObject>,orden:number[],updatables:number[]}
export class CellsManager2D<GameObject extends BaseObject2D = BaseObject2D> {
    cellSize: number;
    cells: Map<number, Map<string, Set<GameObject>>> = new Map();
    objectCells: Map<GameObject, { layer: number; keys: Set<string> }> = new Map();

    constructor(cellSize = 5) {
        this.cellSize = cellSize;
    }

    private key(x: number, y: number): string {
        return `${x}:${y}`;
    }

    private cellPos(pos: Vec2) {
        v2m.dscale(pos,pos,this.cellSize)
        v2m.floor(pos)
    }

    registry(obj: GameObject) {
        this.updateObject(obj);
    }

    unregistry(obj: GameObject) {
        this.removeObjectFromCells(obj);
    }

    clear() {
        this.cells.clear()
        this.objectCells.clear()
    }

    private getLayerMap(layer: number): Map<string, Set<GameObject>> {
        if (!this.cells.has(layer)) {
            this.cells.set(layer, new Map());
        }
        return this.cells.get(layer)!;
    }

    private removeObjectFromCells(obj: GameObject) {
        const entry = this.objectCells.get(obj);
        if (!entry) return;

        const layerMap = this.cells.get(entry.layer);
        if (layerMap) {
            for (const cellKey of entry.keys) {
                const set = layerMap.get(cellKey);
                if (set) {
                    set.delete(obj);
                    if (set.size === 0) layerMap.delete(cellKey);
                }
            }
        }
        this.objectCells.delete(obj)
    }

    updateObject(obj: GameObject) {
        this.removeObjectFromCells(obj)

        const rect = obj.hb.to_rect()
        this.cellPos(rect.min)
        this.cellPos(rect.max)

        const layer = obj.layer
        const layerMap = this.getLayerMap(layer)
        let entry = this.objectCells.get(obj)
        if (!entry){
            this.objectCells.set(obj, { layer, keys: new Set() })
            entry=this.objectCells.get(obj)
        }
        entry!.keys.clear()

        for (let y = rect.min.y; y <= rect.max.y; y++) {
            for (let x = rect.min.x; x <= rect.max.x; x++) {
                const key = this.key(x, y);
                if (!layerMap.has(key)) {
                    layerMap.set(key, new Set());
                }
                layerMap.get(key)!.add(obj);
                entry!.keys.add(key);
            }
        }
    }
    get_objects(hitbox: Hitbox2D, layer: number): GameObject[] {
        const rect = hitbox.to_rect()
        this.cellPos(rect.min)
        this.cellPos(rect.max)

        const results:GameObject[] = []
        const layerMap = this.cells.get(layer);
        if (!layerMap) return [];

        for (let y = rect.min.y; y <= rect.max.y; y++) {
            for (let x = rect.min.x; x <= rect.max.x; x++) {
                const set = layerMap.get(this.key(x, y));
                if (set) {
                    for (const obj of set) {
                        results.push(obj);
                    }
                }
            }
        }
        return results
    }
}
export class GameObjectManager2D<GameObject extends BaseObject2D>{
    cells:CellsManager2D<GameObject>
    objects:Record<number,Layer2D<GameObject>>={}
    layers:number[]=[]
    ondestroy:(obj:GameObject)=>void=(_)=>{}
    oncreate:(_id:number,_layer:number,_type:number)=>GameObject|undefined
    destroy_queue:GameObject[]=[]
    new_objects:GameObject[]=[]
    constructor(cellsSize?:number,oncreate?:((_id:number,_layer:number,_type:number)=>GameObject|undefined)){
        this.cells=new CellsManager2D(cellsSize)
        this.oncreate=oncreate??((_k,_t)=>{return undefined})
    }
    clear(){
        for(const l in this.objects){
            for(let j=0;j<this.objects[l].orden.length;j++){
                const o=this.objects[l].orden[j]
                this.objects[l].objects[o].on_destroy()
            }
            this.objects[l].orden.length=0
            this.objects[l].updatables.length=0
        }
        this.objects={}
        this.layers.length=0
        this.new_objects.length=0
        this.destroy_queue.length=0
        this.cells.clear()
    }

    add_object(
        obj: GameObject,
        layer: number,
        id?: number,
        // deno-lint-ignore no-explicit-any
        args?: Record<string, any>,
        // deno-lint-ignore no-explicit-any
        sv: Record<string, any> = {},
    ): GameObject {
        if (!this.objects[layer]) {
            this.add_layer(layer);
        }
        if (id === undefined) {
            do {
                id = random.id();
            } while (this.objects[layer].objects[id]);
        }
        obj.id = id;
        obj.layer = layer;
        obj.dirty = true;
        obj.dirtyPart = true;
        obj.manager = this;

        this.objects[layer].objects[obj.id] = obj;
        this.objects[layer].orden.push(obj.id);

        for (const key in sv) {
            // deno-lint-ignore ban-ts-comment
            // @ts-ignore
            obj[key] = sv[key];
        }
        this.new_objects.push(obj);
        obj.create(args ?? {});
        this.cells.registry(obj);

        if(obj.updatable){
            this.objects[layer].updatables.push(obj.id);
        }

        return obj;
    }

    get_object(id:number,layer:number):GameObject{
        return this.objects[layer].objects[id]
    }
    exist(id:number,layer:number):boolean{
        return Object.hasOwn(this.objects,layer)&&Object.hasOwn(this.objects[layer].objects,id)
    }
    exist_all(id:number,type:number):boolean{
        for(const l of Object.values(this.objects)){
            if(Object.hasOwn(l.objects,id)&&l.objects[id].numberType===type)return true
        }
        return false
    }
    alive_count(layer:keyof typeof this.objects):number{
        return this.objects[layer].orden.length
    }
    add_layer(layer: number) {
        if (this.objects[layer]) return;
        this.objects[layer] = { orden: [], objects: {},updatables:[] };
        this.layers.push(layer);
    }
    process_object(stream:NetStream,priv:boolean=false){
        const b=stream.readBooleanGroup()
        if(b[0]||b[1]||b[2]){
            const oid=stream.readID()
            const layer=stream.readInt8()
            if(!this.objects[layer]){
                this.add_layer(layer)
            }
            const tp=stream.readUint8()
            let obj=this.objects[layer].objects[oid]
            if(b[3]&&!obj&&!b[2]){
                const obb=this.oncreate(oid,layer,tp)
                if(!obb)return
                obj=obb
                this.add_object(obj,layer,oid,undefined,undefined)
            }
            obj.is_new=b[4]
            if(obj){
                if(b[0]||b[1]){
                    obj.decode(stream,b[1])
                    /*const enc=(encoders??this.encoders)[obj.stringType]
                    const data=enc.decode(b[1],stream)
                    if(priv&&enc.decode_private)data.private=enc.decode_private(stream)
                    obj.updateData(data)*/
                }
                if(b[2]){
                    if(obj.netSync.deletion)obj.destroy()
                    else obj.on_destroy()
                }
            }
        }
    }
    proccess_all(stream:NetStream,priv?:boolean){
        const ls=stream.readUint8()
        for(let l=0;l<ls;l++){
            const ee=stream.readUint16()
            for(let i=0;i<ee;i++){
                this.process_object(stream,priv)
            }
        }
    }
    proccess_list(stream:NetStream,process_deletion:boolean=false,priv?:boolean){
        let os=stream.readUint16()
        for(let i=0;i<os;i++){
            this.process_object(stream,priv)
        }
        os=stream.readUint16()
        for(let i=0;i<os;i++){
            const c=stream.readUint8()
            const id=stream.readID()
            if(process_deletion&&this.objects[c]&&this.objects[c].objects[id]){
                const obj=this.objects[c].objects[id]
                if(obj.netSync.deletion)obj.destroy()
                else obj.on_destroy()
            }
        }
    }
    encode_all(full:boolean=false,stream?:NetStream,priv?:boolean):NetStream{
        if(!stream)stream=new NetStream(new ArrayBuffer(1024*1024))
        stream.writeUint8(this.layers.length)
        for(const l of this.layers){
            stream.writeUint16(this.objects[l].orden.length)
            for(const o of this.objects[l].orden){
                const obj=this.objects[l].objects[o]
                obj.encodeObject(full,stream,priv)
            }
        }
        return stream
    }
    encode_list(l:GameObject[],last_list:GameObject[]=[],stream?:NetStream,priv?:boolean):{last:GameObject[],strm:NetStream}{
        if(!stream)stream=new NetStream(new ArrayBuffer(1024*1024))
        stream.writeUint16(l.length)
        for(let i=0;i<l.length;i++){
            l[i].encodeObject(!last_list.includes(l[i]),stream,priv)
        }
        const deletions: GameObject[] = []
        for (let i = 0; i < last_list.length; i++) {
            const obj = last_list[i]
            if (obj.netSync.deletion && l.indexOf(obj) === -1) deletions.push(obj)
        }

        stream.writeUint16(deletions.length)
        for(let i=0;i<deletions.length;i++){
            stream.writeUint8(deletions[i].layer)
            stream.writeID(deletions[i].id)
        }
        return {strm:stream,last:l}
    }
    update(dt:number){
        for(const l in this.objects){
            for(let j=0;j<this.objects[l].updatables.length;j++){
                const o=this.objects[l].updatables[j]
                const obj=this.objects[l].objects[o]
                if(obj.destroyed)continue
                obj.update(dt)
            }
        }
    }
    update_to_net(){
        for(const o of this.new_objects){
            o.is_new=false
        }
        for(const l of this.layers){
            for(let j=0;j<this.objects[l].orden.length;j++){
                const idx=this.objects[l].orden[j]
                this.objects[l].objects[idx].dirty=false
                this.objects[l].objects[idx].dirtyPart=false
                this.objects[l].objects[idx].net_update()
            }
        }
        this.new_objects.length=0
    }
    apply_destroy_queue(){
        for(const obj of this.destroy_queue){
            if(!this.objects[obj.layer]||!this.objects[obj.layer].objects[obj.id])continue
            this.unregister(obj,true)
            delete this.objects[obj.layer].objects[obj.id]
            this.objects[obj.layer].orden.splice(this.objects[obj.layer].orden.indexOf(obj.id),1)
        }
        this.destroy_queue.length=0
    }
    unregister(obj:GameObject,force_destroy:boolean=false){
        if(this.objects[obj.layer].objects[obj.id].calldestroy||force_destroy){
            this.ondestroy(this.objects[obj.layer].objects[obj.id])
            this.objects[obj.layer].objects[obj.id].on_destroy()
            const idx=this.objects[obj.layer].updatables.indexOf(obj.id)
            if(idx>=0)this.objects[obj.layer].updatables.splice(idx,1)
        }
        this.cells.unregistry(this.objects[obj.layer].objects[obj.id])
    }
}