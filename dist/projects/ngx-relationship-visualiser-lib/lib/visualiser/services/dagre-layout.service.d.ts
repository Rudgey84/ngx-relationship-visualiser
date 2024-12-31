import * as i0 from "@angular/core";
export declare enum Orientation {
    LEFT_TO_RIGHT = "LR",
    RIGHT_TO_LEFT = "RL",
    TOP_TO_BOTTOM = "TB",
    BOTTOM_TO_TOP = "BT"
}
export declare enum Alignment {
    CENTER = "C",
    UP_LEFT = "UL",
    UP_RIGHT = "UR",
    DOWN_LEFT = "DL",
    DOWN_RIGHT = "DR"
}
export interface DagreSettings {
    orientation?: Orientation;
    marginX?: number;
    marginY?: number;
    edgePadding?: number;
    rankPadding?: number;
    nodePadding?: number;
    align?: Alignment;
    acyclicer?: 'greedy';
    ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
    multigraph?: boolean;
    compound?: boolean;
}
export declare class DagreNodesOnlyLayout {
    defaultSettings: {
        orientation: Orientation;
        marginX: number;
        marginY: number;
        edgePadding: number;
        rankPadding: number;
        nodePadding: number;
        curveDistance: number;
        multigraph: boolean;
        compound: boolean;
        align: Alignment;
        acyclicer: any;
        ranker: string;
    };
    dagreGraph: any;
    dagreNodes: any;
    dagreEdges: any;
    renderLayout(graph: any): any;
    initRenderLayout(graph: any): any;
    createDagreGraph(graph: any): any;
    static ɵfac: i0.ɵɵFactoryDeclaration<DagreNodesOnlyLayout, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<DagreNodesOnlyLayout>;
}
