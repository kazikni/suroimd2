import { cloneDeep } from "common/scripts/engine/utils.ts";
import { InputAction, InputManager } from "./keys.ts";

/**
 * Represents a successful operation
 * @template Res The type of the successful operation's result
 */
export type ResultRes<Res> = { res: Res };
/**
 * Represents a failed operation
 * @template Err The type of the failed operation's result
 */
export type ResultErr<Err> = { err: Err };
/**
 * Represents a result whose state is unknown
 * @template Res The type of the successful operation's result
 * @template Err The type of the failed operation's result
 */
export type Result<Res, Err> = ResultRes<Res> | ResultErr<Err>;
export const Casters = Object.freeze({
    toString<T extends string>(val: T): ResultRes<T> {
        return { res: val };
    },
    toNumber(val: string): Result<number, string> {
        const num = +val;

        if (Number.isNaN(num)) {
            return { err: `'${val}' is not a valid numeric value` };
        }

        return { res: num };
    },
    toInt(val: string): Result<number, string> {
        const num = Casters.toNumber(val);

        if ("err" in num) return num;

        if (num.res % 1) {
            return { err: `'${val}' is not an integer value` };
        }

        return num;
    },
    toBoolean(val: string|boolean): Result<boolean, string> {
        if(typeof val==="boolean"){
            return {res:val}
        }else{
            val = val.toLowerCase();

            switch (true) {
                case ["1", "t", "true", "y", "yes"].includes(val): return { res: true };
                case ["0", "f", "false", "n", "no"].includes(val): return { res: false };
                default: {
                    return { err: `'${val}' is not a valid boolean value` };
                }
            }
        }
    },
    generateUnionCaster<const T extends string>(options: readonly T[]) {
        const errorStr = options.map((v, i, a) => `${i === a.length - 1 ? "or " : ""}'${v}'`).join(", ");

        return (val: string): Result<T, string> => {
            if (options.includes(val as T)) return { res: val as T };

            return {
                err: `Value must be either ${errorStr}; received ${val}`
            };
        };
    },
});
export type SettingInputConfig=({
    type:"select"
    options:{value:string,name:string}[]
})
export interface GameConsoleFile{
    settings:Record<string,any>
    actions:Record<string,InputAction>
}
export type SetCallback = (n:any,o:any)=>void
export class GameConsole{
    casters:Record<string,(val:any)=>Result<any,any>>={}
    default_values:Record<keyof typeof this.casters, any>={}
    content:Record<keyof typeof this.casters,any>={}

    variable_set_callbacks:Partial<Record<keyof typeof this.casters,(SetCallback)[]>>={}

    current_save?:string
    input_manager?:InputManager

    default_actions:Record<string,InputAction>={}

    set_action(name:string,action:InputAction){
        if(!this.input_manager)return
        this.input_manager.actions.set(name,action)
        if(this.current_save){
            this.save(this.current_save)
        }
    }
    constructor(){
        
    }
    get_variable(key:keyof typeof this.content):any{
        return this.content===undefined?this.default_values[key]:this.content[key]
    }
    set_variable(key:keyof typeof this.content,value:any):any{
        const old=this.content[key]
        this.content[key]=value
        if(this.variable_set_callbacks[key]){
            for(const cb of this.variable_set_callbacks[key]){
                cb(value,old)
            }
        }
        if(this.current_save){
            this.save(this.current_save)
        }
    }
    add_variables_set_callback(key:string,callback:SetCallback){
        if(!this.variable_set_callbacks[key])this.variable_set_callbacks[key]=[]
        this.variable_set_callbacks[key]!.push(callback)
    }
    load_save(js?:Record<string,any>){
        if(!js)return
        for(const o of Object.keys(js)){
            if(this.default_values[o]===undefined)continue
            const res=this.casters[o](js[o])
            // deno-lint-ignore ban-ts-comment
            //@ts-ignore
            if(res["err"]){
                this.content[o]=this.default_values[o]
            }else{
                this.content[o]=js[o]
            }
        }
    }
    save(save:string){
        this.current_save=save
        const s={
            settings:this.content,
            actions:this.input_manager?.saveConfig()
        }
        self.localStorage.setItem(save,JSON.stringify(s))
    }
    init(save:string){
        const s=self.localStorage.getItem(save)
        this.content=cloneDeep(this.default_values)
        if(this.input_manager){
            for(const a of Object.keys(this.default_actions)){
                this.input_manager.registerAction(a,this.default_actions[a])
            }
        }
        if(s){ 
            const f=JSON.parse(s) as GameConsoleFile
            this.load_save(f.settings)
            if(f.actions)this.input_manager?.loadConfig(f.actions)
        }
        this.save(save)
    }
}