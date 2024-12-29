import Dexie from 'dexie';
import { Data } from '../models/data.interface';
import * as i0 from "@angular/core";
export declare class DexieService extends Dexie {
    graphData: Dexie.Table<Data, string>;
    constructor();
    saveGraphData(data: Data): Promise<void>;
    getGraphData(dataId: string): Promise<Data>;
    deleteGraphData(dataId: string): Promise<void>;
    static ɵfac: i0.ɵɵFactoryDeclaration<DexieService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<DexieService>;
}
