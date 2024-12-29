import { Subject, ReplaySubject } from 'rxjs';
import { DexieService } from '../../db/graphDatabase';
import * as i0 from "@angular/core";
export declare class VisualiserGraphService {
    private dexieService;
    constructor(dexieService: DexieService);
    links: any[];
    nodes: any[];
    gBrush: any;
    brushMode: boolean;
    brushing: boolean;
    shiftKey: any;
    extent: any;
    zoom: boolean;
    zoomToFit: boolean;
    resetSearch: any;
    /** RxJS subject to listen for updates of the selection */
    selectedNodesArray: Subject<any[]>;
    dblClickNodePayload: Subject<unknown>;
    dblClickLinkPayload: Subject<unknown>;
    selectedLinkArray: Subject<unknown>;
    saveGraphData: ReplaySubject<unknown>;
    update(data: any, element: any, zoom: any, zoomToFit: any): Promise<void>;
    private ticked;
    private initDefinitions;
    private forceSimulation;
    private compareAndMarkNodesNew;
    private removeNewItem;
    private randomiseNodePositions;
    _update(_d3: any, svg: any, data: any): Promise<void>;
    resetGraph(initialData: any, element: any, zoom: any, zoomToFit: any): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<VisualiserGraphService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<VisualiserGraphService>;
}
