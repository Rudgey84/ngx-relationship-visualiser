import { ElementRef, EventEmitter, OnInit } from '@angular/core';
import { VisualiserGraphService } from '../services/visualiser-graph.service';
import { DagreNodesOnlyLayout } from '../services/dagre-layout.service';
import { Data } from '../../models/data.interface';
import { DexieService } from '../../db/graphDatabase';
import * as i0 from "@angular/core";
export declare class VisualiserGraphComponent implements OnInit {
    readonly visualiserGraphService: VisualiserGraphService;
    readonly dagreNodesOnlyLayout: DagreNodesOnlyLayout;
    private dexieService;
    graphElement: ElementRef;
    saveGraphDataEvent: EventEmitter<any>;
    saveGraphData: any;
    width: any;
    savedGraphData: Data;
    buttonBarRightPosition: string;
    zoom: boolean;
    zoomToFit: boolean;
    constructor(visualiserGraphService: VisualiserGraphService, dagreNodesOnlyLayout: DagreNodesOnlyLayout, dexieService: DexieService);
    set data(data: Data);
    ngOnInit(): void;
    onResize(event: any): void;
    updateWidth(): void;
    onConfirmSave(): Promise<void>;
    private disableButtons;
    static ɵfac: i0.ɵɵFactoryDeclaration<VisualiserGraphComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<VisualiserGraphComponent, "visualiser-graph", never, { "zoom": { "alias": "zoom"; "required": false; }; "zoomToFit": { "alias": "zoomToFit"; "required": false; }; "data": { "alias": "data"; "required": false; }; }, { "saveGraphDataEvent": "saveGraphDataEvent"; }, never, never, false, never>;
}
