import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import * as i0 from "@angular/core";
export class DexieService extends Dexie {
    graphData;
    constructor() {
        super('GraphDatabase');
        this.version(1).stores({
            graphData: 'dataId'
        });
        this.graphData = this.table('graphData');
    }
    async saveGraphData(data) {
        await this.graphData.put(data);
    }
    async getGraphData(dataId) {
        return await this.graphData.get(dataId);
    }
    async deleteGraphData(dataId) {
        await this.graphData.delete(dataId);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DexieService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DexieService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DexieService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], ctorParameters: () => [] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGhEYXRhYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Byb2plY3RzL25neC1yZWxhdGlvbnNoaXAtdmlzdWFsaXNlci1saWIvbGliL2RiL2dyYXBoRGF0YWJhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUMzQyxPQUFPLEtBQUssTUFBTSxPQUFPLENBQUM7O0FBTTFCLE1BQU0sT0FBTyxZQUFhLFNBQVEsS0FBSztJQUM5QixTQUFTLENBQTRCO0lBRTVDO1FBQ0UsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1lBQ3JCLFNBQVMsRUFBRSxRQUFRO1NBQ3BCLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFVO1FBQzVCLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBYztRQUMvQixPQUFPLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBYztRQUNsQyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLENBQUM7d0dBckJVLFlBQVk7NEdBQVosWUFBWSxjQUZYLE1BQU07OzRGQUVQLFlBQVk7a0JBSHhCLFVBQVU7bUJBQUM7b0JBQ1YsVUFBVSxFQUFFLE1BQU07aUJBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IERleGllIGZyb20gJ2RleGllJztcbmltcG9ydCB7IERhdGEgfSBmcm9tICcuLi9tb2RlbHMvZGF0YS5pbnRlcmZhY2UnO1xuXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290J1xufSlcbmV4cG9ydCBjbGFzcyBEZXhpZVNlcnZpY2UgZXh0ZW5kcyBEZXhpZSB7XG4gIHB1YmxpYyBncmFwaERhdGE6IERleGllLlRhYmxlPERhdGEsIHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoJ0dyYXBoRGF0YWJhc2UnKTtcbiAgICB0aGlzLnZlcnNpb24oMSkuc3RvcmVzKHtcbiAgICAgIGdyYXBoRGF0YTogJ2RhdGFJZCdcbiAgICB9KTtcbiAgICB0aGlzLmdyYXBoRGF0YSA9IHRoaXMudGFibGUoJ2dyYXBoRGF0YScpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZUdyYXBoRGF0YShkYXRhOiBEYXRhKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5ncmFwaERhdGEucHV0KGRhdGEpO1xuICB9XG5cbiAgYXN5bmMgZ2V0R3JhcGhEYXRhKGRhdGFJZDogc3RyaW5nKTogUHJvbWlzZTxEYXRhPiB7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuZ3JhcGhEYXRhLmdldChkYXRhSWQpO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlR3JhcGhEYXRhKGRhdGFJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5ncmFwaERhdGEuZGVsZXRlKGRhdGFJZCk7XG4gIH1cbn1cbiJdfQ==