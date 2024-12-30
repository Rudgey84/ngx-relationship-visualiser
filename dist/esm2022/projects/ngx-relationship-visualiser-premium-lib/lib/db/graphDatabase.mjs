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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGhEYXRhYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Byb2plY3RzL25neC1yZWxhdGlvbnNoaXAtdmlzdWFsaXNlci1wcmVtaXVtLWxpYi9saWIvZGIvZ3JhcGhEYXRhYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzNDLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQzs7QUFNMUIsTUFBTSxPQUFPLFlBQWEsU0FBUSxLQUFLO0lBQzlCLFNBQVMsQ0FBNEI7SUFFNUM7UUFDRSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFDckIsU0FBUyxFQUFFLFFBQVE7U0FDcEIsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLElBQVU7UUFDNUIsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFjO1FBQy9CLE9BQU8sTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFjO1FBQ2xDLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEMsQ0FBQzt3R0FyQlUsWUFBWTs0R0FBWixZQUFZLGNBRlgsTUFBTTs7NEZBRVAsWUFBWTtrQkFIeEIsVUFBVTttQkFBQztvQkFDVixVQUFVLEVBQUUsTUFBTTtpQkFDbkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgRGV4aWUgZnJvbSAnZGV4aWUnO1xuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL21vZGVscy9kYXRhLmludGVyZmFjZSc7XG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0IGNsYXNzIERleGllU2VydmljZSBleHRlbmRzIERleGllIHtcbiAgcHVibGljIGdyYXBoRGF0YTogRGV4aWUuVGFibGU8RGF0YSwgc3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcignR3JhcGhEYXRhYmFzZScpO1xuICAgIHRoaXMudmVyc2lvbigxKS5zdG9yZXMoe1xuICAgICAgZ3JhcGhEYXRhOiAnZGF0YUlkJ1xuICAgIH0pO1xuICAgIHRoaXMuZ3JhcGhEYXRhID0gdGhpcy50YWJsZSgnZ3JhcGhEYXRhJyk7XG4gIH1cblxuICBhc3luYyBzYXZlR3JhcGhEYXRhKGRhdGE6IERhdGEpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmdyYXBoRGF0YS5wdXQoZGF0YSk7XG4gIH1cblxuICBhc3luYyBnZXRHcmFwaERhdGEoZGF0YUlkOiBzdHJpbmcpOiBQcm9taXNlPERhdGE+IHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5ncmFwaERhdGEuZ2V0KGRhdGFJZCk7XG4gIH1cblxuICBhc3luYyBkZWxldGVHcmFwaERhdGEoZGF0YUlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmdyYXBoRGF0YS5kZWxldGUoZGF0YUlkKTtcbiAgfVxufVxuIl19