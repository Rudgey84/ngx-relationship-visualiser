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
    buttonBarRightPosition;
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
        this.buttonBarRightPosition = '0';
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
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: VisualiserGraphComponent, selector: "visualiser-graph", inputs: { zoom: "zoom", zoomToFit: "zoomToFit", data: "data" }, outputs: { saveGraphDataEvent: "saveGraphDataEvent" }, viewQueries: [{ propertyName: "graphElement", first: true, predicate: ["svgId"], descendants: true }], ngImport: i0, template: "<div class=\"page\" id=\"pageId\" (window:resize)=\"onResize($event)\">\n  <div class=\"buttonBar\" [style.right]=\"buttonBarRightPosition\">\n    <div class=\"d-flex justify-content-end\">\n      <div class=\"btn-group\" role=\"group\" aria-label=\"Controls\">\n        <button type=\"button\" id=\"save_graph\" class=\"m-3 btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n          title=\"Save data\" (click)=\"onConfirmSave()\">\n          <i class=\"bi bi-save\"></i>\n        </button>\n      </div>\n    </div>\n  </div>\n  <!-- Zoom indicator-->\n  <div *ngIf=\"zoom\" class=\"zoomIndicator\">\n    <span id=\"zoom_level\"></span>\n  </div>\n  <!-- Save confirmation-->\n  <div *ngIf=\"showConfirmation\" class=\"confirmation-message-container\">\n    <div class=\"alert alert-success confirmation-message\" role=\"alert\" [ngClass]=\"{ 'fade-out': !showConfirmation }\">\n      Saved <i class=\"bi bi-check-circle\"></i>\n    </div>\n  </div>\n  <svg #svgId [attr.width]=\"width\" height=\"780\"></svg>\n</div>", styles: ["#zoom_level{position:relative;background-color:#000c;color:#fff;padding:5px;border-radius:5px;opacity:0;transition:opacity 1s ease-in-out}.zoomIndicator{position:absolute;left:0;padding:10px}.buttonBar{position:absolute;padding:10px}.confirmation-message-container{position:absolute;left:50%;transform:translate(-50%)}.confirmation-message{position:relative;top:60px;opacity:0;animation:fade-in .5s ease-in-out forwards}@keyframes fade-in{0%{opacity:0}to{opacity:1}}.fade-out{animation:fade-out .5s ease-in-out forwards}@keyframes fade-out{0%{opacity:1}to{opacity:0}}\n"], dependencies: [{ kind: "directive", type: i4.NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }, { kind: "directive", type: i4.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphComponent, decorators: [{
            type: Component,
            args: [{ selector: 'visualiser-graph', template: "<div class=\"page\" id=\"pageId\" (window:resize)=\"onResize($event)\">\n  <div class=\"buttonBar\" [style.right]=\"buttonBarRightPosition\">\n    <div class=\"d-flex justify-content-end\">\n      <div class=\"btn-group\" role=\"group\" aria-label=\"Controls\">\n        <button type=\"button\" id=\"save_graph\" class=\"m-3 btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n          title=\"Save data\" (click)=\"onConfirmSave()\">\n          <i class=\"bi bi-save\"></i>\n        </button>\n      </div>\n    </div>\n  </div>\n  <!-- Zoom indicator-->\n  <div *ngIf=\"zoom\" class=\"zoomIndicator\">\n    <span id=\"zoom_level\"></span>\n  </div>\n  <!-- Save confirmation-->\n  <div *ngIf=\"showConfirmation\" class=\"confirmation-message-container\">\n    <div class=\"alert alert-success confirmation-message\" role=\"alert\" [ngClass]=\"{ 'fade-out': !showConfirmation }\">\n      Saved <i class=\"bi bi-check-circle\"></i>\n    </div>\n  </div>\n  <svg #svgId [attr.width]=\"width\" height=\"780\"></svg>\n</div>", styles: ["#zoom_level{position:relative;background-color:#000c;color:#fff;padding:5px;border-radius:5px;opacity:0;transition:opacity 1s ease-in-out}.zoomIndicator{position:absolute;left:0;padding:10px}.buttonBar{position:absolute;padding:10px}.confirmation-message-container{position:absolute;left:50%;transform:translate(-50%)}.confirmation-message{position:relative;top:60px;opacity:0;animation:fade-in .5s ease-in-out forwards}@keyframes fade-in{0%{opacity:0}to{opacity:1}}.fade-out{animation:fade-out .5s ease-in-out forwards}@keyframes fade-out{0%{opacity:1}to{opacity:0}}\n"] }]
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL3Zpc3VhbGlzZXItZ3JhcGgvdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL3Zpc3VhbGlzZXItZ3JhcGgvdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUNULFNBQVMsRUFFVCxLQUFLLEVBQ0wsTUFBTSxFQUNOLFlBQVksRUFFYixNQUFNLGVBQWUsQ0FBQzs7Ozs7O0FBWXZCLE1BQU0sT0FBTyx3QkFBd0I7SUFheEI7SUFDQTtJQUNEO0lBZFUsWUFBWSxDQUFhO0lBQ25DLGtCQUFrQixHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7SUFDaEQsYUFBYSxDQUFDO0lBRWQsS0FBSyxDQUFDO0lBQ04sY0FBYyxDQUFPO0lBQ3JCLGdCQUFnQixHQUFZLEtBQUssQ0FBQztJQUNsQyxzQkFBc0IsQ0FBUztJQUU3QixJQUFJLEdBQVksSUFBSSxDQUFDO0lBQ3JCLFNBQVMsR0FBWSxLQUFLLENBQUM7SUFDcEMsWUFDVyxzQkFBOEMsRUFDOUMsb0JBQTBDLEVBQzNDLFlBQTBCO1FBRnpCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFDOUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUMzQyxpQkFBWSxHQUFaLFlBQVksQ0FBYztJQUNoQyxDQUFDO0lBRUwsSUFDSSxJQUFJLENBQUMsSUFBVTtRQUNqQixJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxD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LE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLHVCQUF1QjtRQUM3QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1FBQzdCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBQ2hDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNYLENBQUM7d0dBOUdVLHdCQUF3Qjs0RkFBeEIsd0JBQXdCLHNSQ3BCckMsZ2hDQXNCTTs7NEZERk8sd0JBQXdCO2tCQUxwQyxTQUFTOytCQUNFLGtCQUFrQjt5SkFLUixZQUFZO3NCQUEvQixTQUFTO3VCQUFDLE9BQU87Z0JBQ1Isa0JBQWtCO3NCQUEzQixNQUFNO2dCQVFFLElBQUk7c0JBQVosS0FBSztnQkFDRyxTQUFTO3NCQUFqQixLQUFLO2dCQVFGLElBQUk7c0JBRFAsS0FBSyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbXBvbmVudCxcbiAgVmlld0NoaWxkLFxuICBFbGVtZW50UmVmLFxuICBJbnB1dCxcbiAgT3V0cHV0LFxuICBFdmVudEVtaXR0ZXIsXG4gIE9uSW5pdFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFZpc3VhbGlzZXJHcmFwaFNlcnZpY2UgfSBmcm9tICcuLi9zZXJ2aWNlcy92aXN1YWxpc2VyLWdyYXBoLnNlcnZpY2UnO1xuaW1wb3J0IHsgRGFncmVOb2Rlc09ubHlMYXlvdXQgfSBmcm9tICcuLi9zZXJ2aWNlcy9kYWdyZS1sYXlvdXQuc2VydmljZSc7XG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi4vLi4vbW9kZWxzL2RhdGEuaW50ZXJmYWNlJztcbmltcG9ydCB7IERleGllU2VydmljZSB9IGZyb20gJy4uLy4uL2RiL2dyYXBoRGF0YWJhc2UnO1xuZGVjbGFyZSB2YXIgYm9vdGJveDogYW55O1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICd2aXN1YWxpc2VyLWdyYXBoJyxcbiAgdGVtcGxhdGVVcmw6IFwiLi92aXN1YWxpc2VyLWdyYXBoLmNvbXBvbmVudC5odG1sXCIsXG4gIHN0eWxlVXJsczogW1wiLi92aXN1YWxpc2VyLWdyYXBoLmNvbXBvbmVudC5zY3NzXCJdLFxufSlcbmV4cG9ydCBjbGFzcyBWaXN1YWxpc2VyR3JhcGhDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQge1xuICBAVmlld0NoaWxkKCdzdmdJZCcpIGdyYXBoRWxlbWVudDogRWxlbWVudFJlZjtcbiAgQE91dHB1dCgpIHNhdmVHcmFwaERhdGFFdmVudCA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICBwdWJsaWMgc2F2ZUdyYXBoRGF0YTtcblxuICBwdWJsaWMgd2lkdGg7XG4gIHB1YmxpYyBzYXZlZEdyYXBoRGF0YTogRGF0YTtcbiAgcHVibGljIHNob3dDb25maXJtYXRpb246IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHVibGljIGJ1dHRvbkJhclJpZ2h0UG9zaXRpb246IHN0cmluZztcblxuICBASW5wdXQoKSB6b29tOiBib29sZWFuID0gdHJ1ZTtcbiAgQElucHV0KCkgem9vbVRvRml0OiBib29sZWFuID0gZmFsc2U7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHJlYWRvbmx5IHZpc3VhbGlzZXJHcmFwaFNlcnZpY2U6IFZpc3VhbGlzZXJHcmFwaFNlcnZpY2UsXG4gICAgcmVhZG9ubHkgZGFncmVOb2Rlc09ubHlMYXlvdXQ6IERhZ3JlTm9kZXNPbmx5TGF5b3V0LFxuICAgIHByaXZhdGUgZGV4aWVTZXJ2aWNlOiBEZXhpZVNlcnZpY2VcbiAgKSB7IH1cblxuICBASW5wdXQoKVxuICBzZXQgZGF0YShkYXRhOiBEYXRhKSB7XG4gICAgaWYgKCFkYXRhIHx8ICFkYXRhLmRhdGFJZCkge1xuICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCBkYXRhIGlucHV0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zYXZlZEdyYXBoRGF0YSA9IGRhdGE7XG5cbiAgICAvLyBUaW1lb3V0OiBUaGUgaW5wdXQgYXJyaXZlcyBiZWZvcmUgdGhlIHN2ZyBpcyByZW5kZXJlZCwgdGhlcmVmb3JlIHRoZSBuYXRpdmVFbGVtZW50IGRvZXMgbm90IGV4aXN0XG4gICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLmRhZ3JlTm9kZXNPbmx5TGF5b3V0LnJlbmRlckxheW91dChkYXRhKTtcbiAgICAgIC8vIFRha2UgYSBjb3B5IG9mIGlucHV0IGZvciByZXNldFxuICAgICAgYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2Uuc2F2ZUdyYXBoRGF0YShkYXRhKTtcblxuICAgICAgdGhpcy52aXN1YWxpc2VyR3JhcGhTZXJ2aWNlLnVwZGF0ZShcbiAgICAgICAgZGF0YSxcbiAgICAgICAgdGhpcy5ncmFwaEVsZW1lbnQubmF0aXZlRWxlbWVudCxcbiAgICAgICAgdGhpcy56b29tLFxuICAgICAgICB0aGlzLnpvb21Ub0ZpdFxuICAgICAgKTtcbiAgICB9LCA1MDApO1xuICB9XG5cbiAgcHVibGljIG5nT25Jbml0KCkge1xuICAgIHRoaXMudXBkYXRlV2lkdGgoKTtcbiAgICB0aGlzLmJ1dHRvbkJhclJpZ2h0UG9zaXRpb24gPSAnMCc7XG4gICAgLy8gSW5pdGlhbGl6ZSB3aXRoIGRlZmF1bHQgZW1wdHkgZGF0YSBpZiBubyBkYXRhIGlzIHByb3ZpZGVkXG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ05vIGRhdGEgcHJvdmlkZWQsIHVzaW5nIGVtcHR5IGRhdGEgc2V0Jyk7XG4gICAgICB0aGlzLmRhdGEgPSB7XG4gICAgICAgIGRhdGFJZDogJzEnLFxuICAgICAgICBub2RlczogW10sXG4gICAgICAgIGxpbmtzOiBbXSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcHVibGljIG9uUmVzaXplKGV2ZW50KTogdm9pZCB7XG4gICAgdGhpcy51cGRhdGVXaWR0aCgpO1xuICB9XG5cbiAgcHVibGljIHVwZGF0ZVdpZHRoKCk6IHZvaWQge1xuICAgIHRoaXMud2lkdGggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGFnZUlkJykub2Zmc2V0V2lkdGg7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgb25Db25maXJtU2F2ZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmVkR3JhcGhEYXRhIGlzIG5vdCBzZXQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBib290Ym94LmNvbmZpcm0oe1xuICAgICAgdGl0bGU6IFwiU2F2ZSBHcmFwaFwiLFxuICAgICAgY2VudGVyVmVydGljYWw6IHRydWUsXG4gICAgICBtZXNzYWdlOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBzYXZlIHRoZSBncmFwaD9cIixcbiAgICAgIGJ1dHRvbnM6IHtcbiAgICAgICAgY29uZmlybToge1xuICAgICAgICAgIGxhYmVsOiAnWWVzJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICdidG4tc3VjY2VzcydcbiAgICAgICAgfSxcbiAgICAgICAgY2FuY2VsOiB7XG4gICAgICAgICAgbGFiZWw6ICdObycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnYnRuLWRhbmdlcidcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAocmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICB0aGlzLnZpc3VhbGlzZXJHcmFwaFNlcnZpY2Uuc2F2ZUdyYXBoRGF0YS5zdWJzY3JpYmUoKHNhdmVHcmFwaERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2F2ZUdyYXBoRGF0YSA9IHNhdmVHcmFwaERhdGE7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB0aGlzLnNhdmVHcmFwaERhdGFFdmVudC5lbWl0KHRoaXMuc2F2ZUdyYXBoRGF0YSk7XG5cbiAgICAgICAgICB0aGlzLmRpc2FibGVCdXR0b25zKHRydWUpO1xuICAgICAgICAgIHRoaXMuZGF0YSA9IHRoaXMuc2F2ZUdyYXBoRGF0YTtcbiAgICAgICAgICB0aGlzLnNob3dDb25maXJtYXRpb25NZXNzYWdlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICBwcml2YXRlIGRpc2FibGVCdXR0b25zKGRpc2FibGVkOiBib29sZWFuKTogdm9pZCB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnI3NhdmVfZ3JhcGgsICNyZXNldF9ncmFwaCcpLmZvckVhY2goYnRuID0+IHtcbiAgICAgIGJ0bi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgU3RyaW5nKGRpc2FibGVkKSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHNob3dDb25maXJtYXRpb25NZXNzYWdlKCk6IHZvaWQge1xuICAgIHRoaXMuc2hvd0NvbmZpcm1hdGlvbiA9IHRydWU7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLnNob3dDb25maXJtYXRpb24gPSBmYWxzZTtcbiAgICB9LCAzMDAwKTtcbiAgfVxufSIsIjxkaXYgY2xhc3M9XCJwYWdlXCIgaWQ9XCJwYWdlSWRcIiAod2luZG93OnJlc2l6ZSk9XCJvblJlc2l6ZSgkZXZlbnQpXCI+XG4gIDxkaXYgY2xhc3M9XCJidXR0b25CYXJcIiBbc3R5bGUucmlnaHRdPVwiYnV0dG9uQmFyUmlnaHRQb3NpdGlvblwiPlxuICAgIDxkaXYgY2xhc3M9XCJkLWZsZXgganVzdGlmeS1jb250ZW50LWVuZFwiPlxuICAgICAgPGRpdiBjbGFzcz1cImJ0bi1ncm91cFwiIHJvbGU9XCJncm91cFwiIGFyaWEtbGFiZWw9XCJDb250cm9sc1wiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cInNhdmVfZ3JhcGhcIiBjbGFzcz1cIm0tMyBidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICB0aXRsZT1cIlNhdmUgZGF0YVwiIChjbGljayk9XCJvbkNvbmZpcm1TYXZlKClcIj5cbiAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLXNhdmVcIj48L2k+XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuICA8IS0tIFpvb20gaW5kaWNhdG9yLS0+XG4gIDxkaXYgKm5nSWY9XCJ6b29tXCIgY2xhc3M9XCJ6b29tSW5kaWNhdG9yXCI+XG4gICAgPHNwYW4gaWQ9XCJ6b29tX2xldmVsXCI+PC9zcGFuPlxuICA8L2Rpdj5cbiAgPCEtLSBTYXZlIGNvbmZpcm1hdGlvbi0tPlxuICA8ZGl2ICpuZ0lmPVwic2hvd0NvbmZpcm1hdGlvblwiIGNsYXNzPVwiY29uZmlybWF0aW9uLW1lc3NhZ2UtY29udGFpbmVyXCI+XG4gICAgPGRpdiBjbGFzcz1cImFsZXJ0IGFsZXJ0LXN1Y2Nlc3MgY29uZmlybWF0aW9uLW1lc3NhZ2VcIiByb2xlPVwiYWxlcnRcIiBbbmdDbGFzc109XCJ7ICdmYWRlLW91dCc6ICFzaG93Q29uZmlybWF0aW9uIH1cIj5cbiAgICAgIFNhdmVkIDxpIGNsYXNzPVwiYmkgYmktY2hlY2stY2lyY2xlXCI+PC9pPlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cbiAgPHN2ZyAjc3ZnSWQgW2F0dHIud2lkdGhdPVwid2lkdGhcIiBoZWlnaHQ9XCI3ODBcIj48L3N2Zz5cbjwvZGl2PiJdfQ==