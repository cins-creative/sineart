declare module "justified-layout" {
  export interface JustifiedBox {
    left: number;
    top: number;
    width: number;
    height: number;
    aspectRatio: number;
  }
  export interface JustifiedLayoutResult {
    containerHeight: number;
    widowCount: number;
    boxes: JustifiedBox[];
  }
  export interface JustifiedLayoutConfig {
    containerWidth: number;
    targetRowHeight: number;
    containerPadding?: number | Record<string, number>;
    boxSpacing?: number | { horizontal: number; vertical: number };
    targetRowHeightTolerance?: number;
    widowLayoutStyle?: string;
  }
  function justifiedLayout(
    aspectRatios: number[],
    config?: JustifiedLayoutConfig
  ): JustifiedLayoutResult;
  export default justifiedLayout;
}
