// subset-font 没有自带类型声明（scripts/fonts-subset.ts 用到的部分）
declare module 'subset-font' {
  interface SubsetOptions {
    targetFormat?: 'woff2' | 'woff' | 'truetype' | 'sfnt';
    preserveNameIds?: number[];
    variationAxes?: Record<string, number | { min: number; max: number; default?: number }>;
    noLayoutClosure?: boolean;
  }
  export default function subsetFont(font: Buffer | Uint8Array, text: string, options?: SubsetOptions): Promise<Buffer>;
}
