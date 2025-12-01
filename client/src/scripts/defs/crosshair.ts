import { Crosshair } from "../managers/crosshairManager.ts";

export const DefaultCrosshair:Crosshair={
    code:'<svg width="64" height="64" viewBox="0 0 16.933 16.933" xmlns="http://www.w3.org/2000/svg"><path stroke="black" fill="white" stroke-width=".5" d="M 7.9378605,4.23325 V 7.936827 H 4.23325 V 8.9951395 H 7.9378605 V 12.69975 H 8.996173 V 8.9951395 H 12.69975 V 7.936827 H 8.996173 V 4.23325 Z"/></svg>',
    color:"#ffffff",
    cursor:"crosshair",
    size:1,
    stroke:0.5,
    stroke_color:"#66666f",
    dynamic:false,
}

export const AimCrosshair:Crosshair={
    code:'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 16.933 16.933"><path d="M7.693.215v1.471A6.829 6.829 0 0 0 1.69 7.693H.215V9.24h1.471a6.829 6.829 0 0 0 6.007 6.003v1.475H9.24v-1.47a6.829 6.829 0 0 0 6.003-6.008h1.475V7.693h-1.47A6.829 6.829 0 0 0 9.24 1.69V.215zm0 2.745v1.897H9.24V2.96a5.567 5.567 0 0 1 4.734 4.733h-1.897V9.24h1.896a5.567 5.567 0 0 1-4.733 4.734v-1.897H7.693v1.896A5.567 5.567 0 0 1 2.96 9.24h1.897V7.693H2.96A5.567 5.567 0 0 1 7.693 2.96z" fill="white" stroke="black" stroke-width=".5" stroke-linecap="square"/></svg>',
    color:"#ffffff",
    cursor:"crosshair",
    size:1,
    stroke:0.5,
    stroke_color:"#66666f",
    dynamic:false,
}

export function generateDynamicCross(def: Crosshair, spread: number): string {
    const armLength = 8 * Math.max(def.size, 1)
    const thickness = Math.max(def.stroke+(def.size*4), 1)
    const gap = (thickness) + spread
    const color = def.color

    const total = (armLength * 2 + gap * 2)
    const half = total / 2

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}">
  <g fill="${color}" stroke="${def.stroke_color}" stroke-width="${def.stroke}">
    <!-- Vertical -->
    <rect x="${half - thickness/2}" y="${half - gap - armLength}" width="${thickness}" height="${armLength}" />
    <rect x="${half - thickness/2}" y="${half + gap}" width="${thickness}" height="${armLength}" />
    <!-- Horizontal -->
    <rect x="${half - gap - armLength}" y="${half - thickness/2}" width="${armLength}" height="${thickness}" />
    <rect x="${half + gap}" y="${half - thickness/2}" width="${armLength}" height="${thickness}" />
    <!-- Center -->
    <rect x="${half - thickness/2}" y="${half - thickness/2}" width="${thickness}" height="${thickness}" />
  </g>
</svg>`;

    return `url('data:image/svg+xml,${encodeURIComponent(svg)}') ${half} ${half}, crosshair`;
}


export const DynamicCrosshair: Crosshair = {
    color: "#ffffff",
    size: 1,
    stroke: 1,
    stroke_color:"#66666f",
    code: "",
    cursor: "crosshair",
    dynamic:true,
    gen_callback: generateDynamicCross
};