import { Component, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import * as i0 from "@angular/core";
import * as i1 from "../services/visualiser-graph.service";
import * as i2 from "../services/dagre-layout.service";
import * as i3 from "../../db/graphDatabase";
import * as i4 from "@angular/common";
export class VisualiserGraphComponent {
    visualiserGraphService;
    dagreNodesOnlyLayout;
    dexieService;
    graphElement;
    saveGraphDataEvent = new EventEmitter();
    saveGraphData;
    width;
    savedGraphData;
    showConfirmation = false;
    zoom = true;
    zoomToFit = false;
    constructor(visualiserGraphService, dagreNodesOnlyLayout, dexieService) {
        this.visualiserGraphService = visualiserGraphService;
        this.dagreNodesOnlyLayout = dagreNodesOnlyLayout;
        this.dexieService = dexieService;
    }
    set data(data) {
        if (!data || !data.dataId) {
            console.error('Invalid data input');
            return;
        }
        this.savedGraphData = data;
        // Timeout: The input arrives before the svg is rendered, therefore the nativeElement does not exist
        setTimeout(async () => {
            this.dagreNodesOnlyLayout.renderLayout(data);
            // Take a copy of input for reset
            await this.dexieService.saveGraphData(data);
            this.visualiserGraphService.update(data, this.graphElement.nativeElement, this.zoom, this.zoomToFit);
        }, 500);
    }
    ngOnInit() {
        this.updateWidth();
        // Initialize with default empty data if no data is provided
        if (!this.savedGraphData) {
            console.warn('No data provided, using empty data set');
            this.data = {
                dataId: '1',
                nodes: [],
                links: [],
            };
        }
    }
    onResize(event) {
        this.updateWidth();
    }
    updateWidth() {
        this.width = document.getElementById('pageId').offsetWidth;
    }
    async onConfirmSave() {
        if (!this.savedGraphData) {
            console.error('savedGraphData is not set');
            return;
        }
        bootbox.confirm({
            title: "Save Graph",
            centerVertical: true,
            message: "Are you sure you want to save the graph?",
            buttons: {
                confirm: {
                    label: 'Yes',
                    className: 'btn-success'
                },
                cancel: {
                    label: 'No',
                    className: 'btn-danger'
                }
            },
            callback: async (result) => {
                if (result) {
                    this.visualiserGraphService.saveGraphData.subscribe((saveGraphData) => {
                        this.saveGraphData = saveGraphData;
                    });
                    this.saveGraphDataEvent.emit(this.saveGraphData);
                    this.disableButtons(true);
                    this.data = this.saveGraphData;
                    this.showConfirmationMessage();
                }
            }
        });
    }
    disableButtons(disabled) {
        document.querySelectorAll('#save_graph, #reset_graph').forEach(btn => {
            btn.setAttribute('disabled', String(disabled));
        });
    }
    showConfirmationMessage() {
        this.showConfirmation = true;
        setTimeout(() => {
            this.showConfirmation = false;
        }, 3000);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphComponent, deps: [{ token: i1.VisualiserGraphService }, { token: i2.DagreNodesOnlyLayout }, { token: i3.DexieService }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: VisualiserGraphComponent, selector: "visualiser-graph", inputs: { zoom: "zoom", zoomToFit: "zoomToFit", data: "data" }, outputs: { saveGraphDataEvent: "saveGraphDataEvent" }, viewQueries: [{ propertyName: "graphElement", first: true, predicate: ["svgId"], descendants: true }], ngImport: i0, template: "<div class=\"page\" id=\"pageId\" (window:resize)=\"onResize($event)\">\n  <div class=\"d-flex justify-content-end\">\n    <div class=\"btn-group\" role=\"group\" aria-label=\"Controls\">\n      <button type=\"button\" id=\"save_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n        title=\"Save data\" (click)=\"onConfirmSave()\">\n        <i class=\"bi bi-save\"></i>\n      </button>\n    </div>\n  </div>\n  <!-- Zoom indicator-->\n  <div *ngIf=\"zoom\" class=\"zoomIndicator\">\n    <span id=\"zoom_level\"></span>\n  </div>\n  <!-- Save confirmation-->\n  <div *ngIf=\"showConfirmation\" class=\"confirmation-message-container\">\n    <div class=\"alert alert-success confirmation-message\" role=\"alert\" [ngClass]=\"{ 'fade-out': !showConfirmation }\">\n      Saved <i class=\"bi bi-check-circle\"></i>\n    </div>\n  </div>\n  <svg #svgId [attr.width]=\"width\" height=\"780\"></svg>\n</div>", styles: ["#zoom_level{position:relative;background-color:#000c;color:#fff;padding:5px;border-radius:5px;opacity:0;transition:opacity 1s ease-in-out}.zoomIndicator{position:absolute;left:0;padding:10px}.confirmation-message-container{position:absolute;left:50%;transform:translate(-50%)}.confirmation-message{position:relative;top:60px;opacity:0;animation:fade-in .5s ease-in-out forwards}@keyframes fade-in{0%{opacity:0}to{opacity:1}}.fade-out{animation:fade-out .5s ease-in-out forwards}@keyframes fade-out{0%{opacity:1}to{opacity:0}}\n"], dependencies: [{ kind: "directive", type: i4.NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }, { kind: "directive", type: i4.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphComponent, decorators: [{
            type: Component,
            args: [{ selector: 'visualiser-graph', template: "<div class=\"page\" id=\"pageId\" (window:resize)=\"onResize($event)\">\n  <div class=\"d-flex justify-content-end\">\n    <div class=\"btn-group\" role=\"group\" aria-label=\"Controls\">\n      <button type=\"button\" id=\"save_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n        title=\"Save data\" (click)=\"onConfirmSave()\">\n        <i class=\"bi bi-save\"></i>\n      </button>\n    </div>\n  </div>\n  <!-- Zoom indicator-->\n  <div *ngIf=\"zoom\" class=\"zoomIndicator\">\n    <span id=\"zoom_level\"></span>\n  </div>\n  <!-- Save confirmation-->\n  <div *ngIf=\"showConfirmation\" class=\"confirmation-message-container\">\n    <div class=\"alert alert-success confirmation-message\" role=\"alert\" [ngClass]=\"{ 'fade-out': !showConfirmation }\">\n      Saved <i class=\"bi bi-check-circle\"></i>\n    </div>\n  </div>\n  <svg #svgId [attr.width]=\"width\" height=\"780\"></svg>\n</div>", styles: ["#zoom_level{position:relative;background-color:#000c;color:#fff;padding:5px;border-radius:5px;opacity:0;transition:opacity 1s ease-in-out}.zoomIndicator{position:absolute;left:0;padding:10px}.confirmation-message-container{position:absolute;left:50%;transform:translate(-50%)}.confirmation-message{position:relative;top:60px;opacity:0;animation:fade-in .5s ease-in-out forwards}@keyframes fade-in{0%{opacity:0}to{opacity:1}}.fade-out{animation:fade-out .5s ease-in-out forwards}@keyframes fade-out{0%{opacity:1}to{opacity:0}}\n"] }]
        }], ctorParameters: () => [{ type: i1.VisualiserGraphService }, { type: i2.DagreNodesOnlyLayout }, { type: i3.DexieService }], propDecorators: { graphElement: [{
                type: ViewChild,
                args: ['svgId']
            }], saveGraphDataEvent: [{
                type: Output
            }], zoom: [{
                type: Input
            }], zoomToFit: [{
                type: Input
            }], data: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL3Zpc3VhbGlzZXItZ3JhcGgvdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL3Zpc3VhbGlzZXItZ3JhcGgvdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUNULFNBQVMsRUFFVCxLQUFLLEVBQ0wsTUFBTSxFQUNOLFlBQVksRUFFYixNQUFNLGVBQWUsQ0FBQzs7Ozs7O0FBWXZCLE1BQU0sT0FBTyx3QkFBd0I7SUFZeEI7SUFDQTtJQUNEO0lBYlUsWUFBWSxDQUFhO0lBQ25DLGtCQUFrQixHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7SUFDaEQsYUFBYSxDQUFDO0lBRWQsS0FBSyxDQUFDO0lBQ04sY0FBYyxDQUFPO0lBQ3JCLGdCQUFnQixHQUFZLEtBQUssQ0FBQztJQUVoQyxJQUFJLEdBQVksSUFBSSxDQUFDO0lBQ3JCLFNBQVMsR0FBWSxLQUFLLENBQUM7SUFDcEMsWUFDVyxzQkFBOEMsRUFDOUMsb0JBQTBDLEVBQzNDLFlBQTBCO1FBRnpCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFDOUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUMzQyxpQkFBWSxHQUFaLFlBQVksQ0FBYztJQUNoQyxDQUFDO0lBRUwsSUFDSSxJQUFJLENBQUMsSUFBVTtRQUNqQixJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFCLE9BQU8sQ0FB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LENBQUM7SUFFTyx1QkFBdUI7UUFDN0IsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztRQUM3QixVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2QsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztRQUNoQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDWCxDQUFDO3dHQTdHVSx3QkFBd0I7NEZBQXhCLHdCQUF3QixzUkNwQnJDLDQ2QkFvQk07OzRGREFPLHdCQUF3QjtrQkFMcEMsU0FBUzsrQkFDRSxrQkFBa0I7eUpBS1IsWUFBWTtzQkFBL0IsU0FBUzt1QkFBQyxPQUFPO2dCQUNSLGtCQUFrQjtzQkFBM0IsTUFBTTtnQkFPRSxJQUFJO3NCQUFaLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFRRixJQUFJO3NCQURQLEtBQUsiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDb21wb25lbnQsXG4gIFZpZXdDaGlsZCxcbiAgRWxlbWVudFJlZixcbiAgSW5wdXQsXG4gIE91dHB1dCxcbiAgRXZlbnRFbWl0dGVyLFxuICBPbkluaXRcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBWaXN1YWxpc2VyR3JhcGhTZXJ2aWNlIH0gZnJvbSAnLi4vc2VydmljZXMvdmlzdWFsaXNlci1ncmFwaC5zZXJ2aWNlJztcbmltcG9ydCB7IERhZ3JlTm9kZXNPbmx5TGF5b3V0IH0gZnJvbSAnLi4vc2VydmljZXMvZGFncmUtbGF5b3V0LnNlcnZpY2UnO1xuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uLy4uL21vZGVscy9kYXRhLmludGVyZmFjZSc7XG5pbXBvcnQgeyBEZXhpZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9kYi9ncmFwaERhdGFiYXNlJztcbmRlY2xhcmUgdmFyIGJvb3Rib3g6IGFueTtcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAndmlzdWFsaXNlci1ncmFwaCcsXG4gIHRlbXBsYXRlVXJsOiBcIi4vdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuaHRtbFwiLFxuICBzdHlsZVVybHM6IFtcIi4vdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuc2Nzc1wiXSxcbn0pXG5leHBvcnQgY2xhc3MgVmlzdWFsaXNlckdyYXBoQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0IHtcbiAgQFZpZXdDaGlsZCgnc3ZnSWQnKSBncmFwaEVsZW1lbnQ6IEVsZW1lbnRSZWY7XG4gIEBPdXRwdXQoKSBzYXZlR3JhcGhEYXRhRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgcHVibGljIHNhdmVHcmFwaERhdGE7XG5cbiAgcHVibGljIHdpZHRoO1xuICBwdWJsaWMgc2F2ZWRHcmFwaERhdGE6IERhdGE7XG4gIHB1YmxpYyBzaG93Q29uZmlybWF0aW9uOiBib29sZWFuID0gZmFsc2U7XG5cbiAgQElucHV0KCkgem9vbTogYm9vbGVhbiA9IHRydWU7XG4gIEBJbnB1dCgpIHpvb21Ub0ZpdDogYm9vbGVhbiA9IGZhbHNlO1xuICBjb25zdHJ1Y3RvcihcbiAgICByZWFkb25seSB2aXN1YWxpc2VyR3JhcGhTZXJ2aWNlOiBWaXN1YWxpc2VyR3JhcGhTZXJ2aWNlLFxuICAgIHJlYWRvbmx5IGRhZ3JlTm9kZXNPbmx5TGF5b3V0OiBEYWdyZU5vZGVzT25seUxheW91dCxcbiAgICBwcml2YXRlIGRleGllU2VydmljZTogRGV4aWVTZXJ2aWNlXG4gICkgeyB9XG5cbiAgQElucHV0KClcbiAgc2V0IGRhdGEoZGF0YTogRGF0YSkge1xuICAgIGlmICghZGF0YSB8fCAhZGF0YS5kYXRhSWQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgZGF0YSBpbnB1dCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2F2ZWRHcmFwaERhdGEgPSBkYXRhO1xuXG4gICAgLy8gVGltZW91dDogVGhlIGlucHV0IGFycml2ZXMgYmVmb3JlIHRoZSBzdmcgaXMgcmVuZGVyZWQsIHRoZXJlZm9yZSB0aGUgbmF0aXZlRWxlbWVudCBkb2VzIG5vdCBleGlzdFxuICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgdGhpcy5kYWdyZU5vZGVzT25seUxheW91dC5yZW5kZXJMYXlvdXQoZGF0YSk7XG4gICAgICAvLyBUYWtlIGEgY29weSBvZiBpbnB1dCBmb3IgcmVzZXRcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLnNhdmVHcmFwaERhdGEoZGF0YSk7XG5cbiAgICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS51cGRhdGUoXG4gICAgICAgIGRhdGEsXG4gICAgICAgIHRoaXMuZ3JhcGhFbGVtZW50Lm5hdGl2ZUVsZW1lbnQsXG4gICAgICAgIHRoaXMuem9vbSxcbiAgICAgICAgdGhpcy56b29tVG9GaXRcbiAgICAgICk7XG4gICAgfSwgNTAwKTtcbiAgfVxuXG4gIHB1YmxpYyBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLnVwZGF0ZVdpZHRoKCk7XG5cbiAgICAvLyBJbml0aWFsaXplIHdpdGggZGVmYXVsdCBlbXB0eSBkYXRhIGlmIG5vIGRhdGEgaXMgcHJvdmlkZWRcbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUud2FybignTm8gZGF0YSBwcm92aWRlZCwgdXNpbmcgZW1wdHkgZGF0YSBzZXQnKTtcbiAgICAgIHRoaXMuZGF0YSA9IHtcbiAgICAgICAgZGF0YUlkOiAnMScsXG4gICAgICAgIG5vZGVzOiBbXSxcbiAgICAgICAgbGlua3M6IFtdLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgb25SZXNpemUoZXZlbnQpOiB2b2lkIHtcbiAgICB0aGlzLnVwZGF0ZVdpZHRoKCk7XG4gIH1cblxuICBwdWJsaWMgdXBkYXRlV2lkdGgoKTogdm9pZCB7XG4gICAgdGhpcy53aWR0aCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYWdlSWQnKS5vZmZzZXRXaWR0aDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBvbkNvbmZpcm1TYXZlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5zYXZlZEdyYXBoRGF0YSkge1xuICAgICAgY29uc29sZS5lcnJvcignc2F2ZWRHcmFwaERhdGEgaXMgbm90IHNldCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGJvb3Rib3guY29uZmlybSh7XG4gICAgICB0aXRsZTogXCJTYXZlIEdyYXBoXCIsXG4gICAgICBjZW50ZXJWZXJ0aWNhbDogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6IFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHNhdmUgdGhlIGdyYXBoP1wiLFxuICAgICAgYnV0dG9uczoge1xuICAgICAgICBjb25maXJtOiB7XG4gICAgICAgICAgbGFiZWw6ICdZZXMnLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ2J0bi1zdWNjZXNzJ1xuICAgICAgICB9LFxuICAgICAgICBjYW5jZWw6IHtcbiAgICAgICAgICBsYWJlbDogJ05vJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICdidG4tZGFuZ2VyJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY2FsbGJhY2s6IGFzeW5jIChyZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS5zYXZlR3JhcGhEYXRhLnN1YnNjcmliZSgoc2F2ZUdyYXBoRGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zYXZlR3JhcGhEYXRhID0gc2F2ZUdyYXBoRGF0YTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHRoaXMuc2F2ZUdyYXBoRGF0YUV2ZW50LmVtaXQodGhpcy5zYXZlR3JhcGhEYXRhKTtcblxuICAgICAgICAgIHRoaXMuZGlzYWJsZUJ1dHRvbnModHJ1ZSk7XG4gICAgICAgICAgdGhpcy5kYXRhID0gdGhpcy5zYXZlR3JhcGhEYXRhO1xuICAgICAgICAgIHRoaXMuc2hvd0NvbmZpcm1hdGlvbk1lc3NhZ2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHByaXZhdGUgZGlzYWJsZUJ1dHRvbnMoZGlzYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcjc2F2ZV9ncmFwaCwgI3Jlc2V0X2dyYXBoJykuZm9yRWFjaChidG4gPT4ge1xuICAgICAgYnRuLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCBTdHJpbmcoZGlzYWJsZWQpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2hvd0NvbmZpcm1hdGlvbk1lc3NhZ2UoKTogdm9pZCB7XG4gICAgdGhpcy5zaG93Q29uZmlybWF0aW9uID0gdHJ1ZTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuc2hvd0NvbmZpcm1hdGlvbiA9IGZhbHNlO1xuICAgIH0sIDMwMDApO1xuICB9XG59IiwiPGRpdiBjbGFzcz1cInBhZ2VcIiBpZD1cInBhZ2VJZFwiICh3aW5kb3c6cmVzaXplKT1cIm9uUmVzaXplKCRldmVudClcIj5cbiAgPGRpdiBjbGFzcz1cImQtZmxleCBqdXN0aWZ5LWNvbnRlbnQtZW5kXCI+XG4gICAgPGRpdiBjbGFzcz1cImJ0bi1ncm91cFwiIHJvbGU9XCJncm91cFwiIGFyaWEtbGFiZWw9XCJDb250cm9sc1wiPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJzYXZlX2dyYXBoXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgdGl0bGU9XCJTYXZlIGRhdGFcIiAoY2xpY2spPVwib25Db25maXJtU2F2ZSgpXCI+XG4gICAgICAgIDxpIGNsYXNzPVwiYmkgYmktc2F2ZVwiPjwvaT5cbiAgICAgIDwvYnV0dG9uPlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cbiAgPCEtLSBab29tIGluZGljYXRvci0tPlxuICA8ZGl2ICpuZ0lmPVwiem9vbVwiIGNsYXNzPVwiem9vbUluZGljYXRvclwiPlxuICAgIDxzcGFuIGlkPVwiem9vbV9sZXZlbFwiPjwvc3Bhbj5cbiAgPC9kaXY+XG4gIDwhLS0gU2F2ZSBjb25maXJtYXRpb24tLT5cbiAgPGRpdiAqbmdJZj1cInNob3dDb25maXJtYXRpb25cIiBjbGFzcz1cImNvbmZpcm1hdGlvbi1tZXNzYWdlLWNvbnRhaW5lclwiPlxuICAgIDxkaXYgY2xhc3M9XCJhbGVydCBhbGVydC1zdWNjZXNzIGNvbmZpcm1hdGlvbi1tZXNzYWdlXCIgcm9sZT1cImFsZXJ0XCIgW25nQ2xhc3NdPVwieyAnZmFkZS1vdXQnOiAhc2hvd0NvbmZpcm1hdGlvbiB9XCI+XG4gICAgICBTYXZlZCA8aSBjbGFzcz1cImJpIGJpLWNoZWNrLWNpcmNsZVwiPjwvaT5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG4gIDxzdmcgI3N2Z0lkIFthdHRyLndpZHRoXT1cIndpZHRoXCIgaGVpZ2h0PVwiNzgwXCI+PC9zdmc+XG48L2Rpdj4iXX0=