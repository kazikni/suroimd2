
export interface Crosshair {
    color: string;
    size: number;
    code: string;
    stroke: number;
    stroke_color:string;
    cursor: string;
    dynamic:boolean
    gen_callback?:(crosshair:Crosshair,spread:number)=>string
}

function getCrosshairDims(def: Crosshair) {
    const base = 64;
    const size = Math.round((base * Number(def.size)) / 4) * 4;
    return { width: size, height: size };
}

function makeSVGDataURL(def: Crosshair): string {
    const { width, height } = getCrosshairDims(def);
    const color = def.color
    const stroke = def.stroke;

    const svg = def.code
        .replace(/fill="white"/g, `fill="${color}"`)
        .replace(/stroke-width=".5"/g, `stroke-width="${stroke}"`)
        .replace(/stroke="black"/g, `stroke="${def.stroke_color}"`)
        .replace(/width="64"/g, `width="${width}"`)
        .replace(/height="64"/g, `height="${height}"`)
        .replace(/#/g, "%23");

    return `url('data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}')`;
}

function makeCursorCSS(def: Crosshair): string {
    const { width, height } = getCrosshairDims(def);
    return `${makeSVGDataURL(def)} ${width / 2} ${height / 2}, crosshair`;
}

export const CrosshairManager = {
    current: null as Crosshair | null,

    setCursor(elem: HTMLElement, def: Crosshair) {
        this.current = def;
        const css = this.current.gen_callback?this.current.gen_callback(this.current,0):makeCursorCSS(def);
        elem.style.cursor = css;
    },

    updateCrosshair(elem: HTMLElement, spread: number) {
        if (!this.current||!this.current.dynamic) return;

        const css = this.current.gen_callback?this.current.gen_callback(this.current,spread):makeCursorCSS(this.current)
        elem.style.cursor = css;
    },

    regenerate(elem: HTMLElement) {
        if (!this.current) return;
        elem.style.cursor = makeCursorCSS(this.current);
    }
};
