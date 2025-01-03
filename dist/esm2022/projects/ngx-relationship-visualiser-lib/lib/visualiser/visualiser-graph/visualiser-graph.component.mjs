import { Component, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import Swal from 'sweetalert2';
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
        Swal.fire({
            title: "Save Graph",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Save"
        }).then((result) => {
            if (result.isConfirmed) {
                this.visualiserGraphService.saveGraphData.subscribe((saveGraphData) => {
                    this.saveGraphData = saveGraphData;
                });
                this.saveGraphDataEvent.emit(this.saveGraphData);
                this.disableButtons(true);
                this.data = this.saveGraphData;
                Swal.fire({
                    title: "Saved!",
                    text: "Your graph has been saved.",
                    icon: "success"
                });
            }
        });
    }
    disableButtons(disabled) {
        document.querySelectorAll('#save_graph, #reset_graph').forEach(btn => {
            btn.setAttribute('disabled', String(disabled));
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphComponent, deps: [{ token: i1.VisualiserGraphService }, { token: i2.DagreNodesOnlyLayout }, { token: i3.DexieService }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: VisualiserGraphComponent, selector: "visualiser-graph", inputs: { zoom: "zoom", zoomToFit: "zoomToFit", data: "data" }, outputs: { saveGraphDataEvent: "saveGraphDataEvent" }, viewQueries: [{ propertyName: "graphElement", first: true, predicate: ["svgId"], descendants: true }], ngImport: i0, template: "<div class=\"page\" id=\"pageId\" (window:resize)=\"onResize($event)\">\n  <div class=\"buttonBar\" [style.right]=\"buttonBarRightPosition\">\n    <div class=\"d-flex justify-content-end\">\n      <div class=\"btn-group\" role=\"group\" aria-label=\"Controls\">\n        <button type=\"button\" id=\"save_graph\" class=\"m-3 btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n          title=\"Save data\" (click)=\"onConfirmSave()\">\n          <i class=\"bi bi-save\"></i>\n        </button>\n      </div>\n    </div>\n  </div>\n  <!-- Zoom indicator-->\n  <div *ngIf=\"zoom\" class=\"zoomIndicator\">\n    <span id=\"zoom_level\"></span>\n  </div>\n  <svg #svgId [attr.width]=\"width\" height=\"780\"></svg>\n</div>", styles: ["@import\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css\";@import\"https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/css/bootstrap.min.css\";#zoom_level{position:relative;background-color:#000c;color:#fff;padding:5px;border-radius:5px;opacity:0;transition:opacity 1s ease-in-out}.zoomIndicator{position:absolute;left:0;padding:10px}.buttonBar{position:absolute;padding:10px}\n"], dependencies: [{ kind: "directive", type: i4.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphComponent, decorators: [{
            type: Component,
            args: [{ selector: 'visualiser-graph', template: "<div class=\"page\" id=\"pageId\" (window:resize)=\"onResize($event)\">\n  <div class=\"buttonBar\" [style.right]=\"buttonBarRightPosition\">\n    <div class=\"d-flex justify-content-end\">\n      <div class=\"btn-group\" role=\"group\" aria-label=\"Controls\">\n        <button type=\"button\" id=\"save_graph\" class=\"m-3 btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n          title=\"Save data\" (click)=\"onConfirmSave()\">\n          <i class=\"bi bi-save\"></i>\n        </button>\n      </div>\n    </div>\n  </div>\n  <!-- Zoom indicator-->\n  <div *ngIf=\"zoom\" class=\"zoomIndicator\">\n    <span id=\"zoom_level\"></span>\n  </div>\n  <svg #svgId [attr.width]=\"width\" height=\"780\"></svg>\n</div>", styles: ["@import\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css\";@import\"https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/css/bootstrap.min.css\";#zoom_level{position:relative;background-color:#000c;color:#fff;padding:5px;border-radius:5px;opacity:0;transition:opacity 1s ease-in-out}.zoomIndicator{position:absolute;left:0;padding:10px}.buttonBar{position:absolute;padding:10px}\n"] }]
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL3Zpc3VhbGlzZXItZ3JhcGgvdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL3Zpc3VhbGlzZXItZ3JhcGgvdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUNULFNBQVMsRUFFVCxLQUFLLEVBQ0wsTUFBTSxFQUNOLFlBQVksRUFFYixNQUFNLGVBQWUsQ0FBQztBQUt2QixPQUFPLElBQUksTUFBTSxhQUFhLENBQUE7Ozs7OztBQVE5QixNQUFNLE9BQU8sd0JBQXdCO0lBWXhCO0lBQ0E7SUFDRDtJQWJVLFlBQVksQ0FBYTtJQUNuQyxrQkFBa0IsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO0lBQ2hELGFBQWEsQ0FBQztJQUVkLEtBQUssQ0FBQztJQUNOLGNBQWMsQ0FBTztJQUNyQixzQkFBc0IsQ0FBUztJQUU3QixJQUFJLEdBQVksSUFBSSxDQUFDO0lBQ3JCLFNBQVMsR0FBWSxLQUFLLENBQUM7SUFDcEMsWUFDVyxzQkFBOEMsRUFDOUMsb0JBQTBDLEVBQzNDLFlBQTBCO1FBRnpCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFDOUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUMzQyxpQkFBWSxHQUFaLFlBQVksQ0FBYztJQUNoQyxDQUFDO0lBRUwsSUFDSSxJQUFJLENBQUMsSUFBVTtRQUNqQixJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFB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QUFHLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNqRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7d0dBcEdVLHdCQUF3Qjs0RkFBeEIsd0JBQXdCLHNSQ3JCckMsaXVCQWdCTTs7NEZES08sd0JBQXdCO2tCQUxwQyxTQUFTOytCQUNFLGtCQUFrQjt5SkFLUixZQUFZO3NCQUEvQixTQUFTO3VCQUFDLE9BQU87Z0JBQ1Isa0JBQWtCO3NCQUEzQixNQUFNO2dCQU9FLElBQUk7c0JBQVosS0FBSztnQkFDRyxTQUFTO3NCQUFqQixLQUFLO2dCQVFGLElBQUk7c0JBRFAsS0FBSyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbXBvbmVudCxcbiAgVmlld0NoaWxkLFxuICBFbGVtZW50UmVmLFxuICBJbnB1dCxcbiAgT3V0cHV0LFxuICBFdmVudEVtaXR0ZXIsXG4gIE9uSW5pdFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFZpc3VhbGlzZXJHcmFwaFNlcnZpY2UgfSBmcm9tICcuLi9zZXJ2aWNlcy92aXN1YWxpc2VyLWdyYXBoLnNlcnZpY2UnO1xuaW1wb3J0IHsgRGFncmVOb2Rlc09ubHlMYXlvdXQgfSBmcm9tICcuLi9zZXJ2aWNlcy9kYWdyZS1sYXlvdXQuc2VydmljZSc7XG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi4vLi4vbW9kZWxzL2RhdGEuaW50ZXJmYWNlJztcbmltcG9ydCB7IERleGllU2VydmljZSB9IGZyb20gJy4uLy4uL2RiL2dyYXBoRGF0YWJhc2UnO1xuaW1wb3J0IFN3YWwgZnJvbSAnc3dlZXRhbGVydDInXG5cblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAndmlzdWFsaXNlci1ncmFwaCcsXG4gIHRlbXBsYXRlVXJsOiBcIi4vdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuaHRtbFwiLFxuICBzdHlsZVVybHM6IFtcIi4vdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuc2Nzc1wiXSxcbn0pXG5leHBvcnQgY2xhc3MgVmlzdWFsaXNlckdyYXBoQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0IHtcbiAgQFZpZXdDaGlsZCgnc3ZnSWQnKSBncmFwaEVsZW1lbnQ6IEVsZW1lbnRSZWY7XG4gIEBPdXRwdXQoKSBzYXZlR3JhcGhEYXRhRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgcHVibGljIHNhdmVHcmFwaERhdGE7XG5cbiAgcHVibGljIHdpZHRoO1xuICBwdWJsaWMgc2F2ZWRHcmFwaERhdGE6IERhdGE7XG4gIHB1YmxpYyBidXR0b25CYXJSaWdodFBvc2l0aW9uOiBzdHJpbmc7XG5cbiAgQElucHV0KCkgem9vbTogYm9vbGVhbiA9IHRydWU7XG4gIEBJbnB1dCgpIHpvb21Ub0ZpdDogYm9vbGVhbiA9IGZhbHNlO1xuICBjb25zdHJ1Y3RvcihcbiAgICByZWFkb25seSB2aXN1YWxpc2VyR3JhcGhTZXJ2aWNlOiBWaXN1YWxpc2VyR3JhcGhTZXJ2aWNlLFxuICAgIHJlYWRvbmx5IGRhZ3JlTm9kZXNPbmx5TGF5b3V0OiBEYWdyZU5vZGVzT25seUxheW91dCxcbiAgICBwcml2YXRlIGRleGllU2VydmljZTogRGV4aWVTZXJ2aWNlXG4gICkgeyB9XG5cbiAgQElucHV0KClcbiAgc2V0IGRhdGEoZGF0YTogRGF0YSkge1xuICAgIGlmICghZGF0YSB8fCAhZGF0YS5kYXRhSWQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgZGF0YSBpbnB1dCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2F2ZWRHcmFwaERhdGEgPSBkYXRhO1xuXG4gICAgLy8gVGltZW91dDogVGhlIGlucHV0IGFycml2ZXMgYmVmb3JlIHRoZSBzdmcgaXMgcmVuZGVyZWQsIHRoZXJlZm9yZSB0aGUgbmF0aXZlRWxlbWVudCBkb2VzIG5vdCBleGlzdFxuICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgdGhpcy5kYWdyZU5vZGVzT25seUxheW91dC5yZW5kZXJMYXlvdXQoZGF0YSk7XG4gICAgICAvLyBUYWtlIGEgY29weSBvZiBpbnB1dCBmb3IgcmVzZXRcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLnNhdmVHcmFwaERhdGEoZGF0YSk7XG5cbiAgICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS51cGRhdGUoXG4gICAgICAgIGRhdGEsXG4gICAgICAgIHRoaXMuZ3JhcGhFbGVtZW50Lm5hdGl2ZUVsZW1lbnQsXG4gICAgICAgIHRoaXMuem9vbSxcbiAgICAgICAgdGhpcy56b29tVG9GaXRcbiAgICAgICk7XG4gICAgfSwgNTAwKTtcbiAgfVxuXG4gIHB1YmxpYyBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLnVwZGF0ZVdpZHRoKCk7XG4gICAgdGhpcy5idXR0b25CYXJSaWdodFBvc2l0aW9uID0gJzAnO1xuICAgIC8vIEluaXRpYWxpemUgd2l0aCBkZWZhdWx0IGVtcHR5IGRhdGEgaWYgbm8gZGF0YSBpcyBwcm92aWRlZFxuICAgIGlmICghdGhpcy5zYXZlZEdyYXBoRGF0YSkge1xuICAgICAgY29uc29sZS53YXJuKCdObyBkYXRhIHByb3ZpZGVkLCB1c2luZyBlbXB0eSBkYXRhIHNldCcpO1xuICAgICAgdGhpcy5kYXRhID0ge1xuICAgICAgICBkYXRhSWQ6ICcxJyxcbiAgICAgICAgbm9kZXM6IFtdLFxuICAgICAgICBsaW5rczogW10sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBvblJlc2l6ZShldmVudCk6IHZvaWQge1xuICAgIHRoaXMudXBkYXRlV2lkdGgoKTtcbiAgfVxuXG4gIHB1YmxpYyB1cGRhdGVXaWR0aCgpOiB2b2lkIHtcbiAgICB0aGlzLndpZHRoID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhZ2VJZCcpLm9mZnNldFdpZHRoO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIG9uQ29uZmlybVNhdmUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdzYXZlZEdyYXBoRGF0YSBpcyBub3Qgc2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgU3dhbC5maXJlKHtcbiAgICAgIHRpdGxlOiBcIlNhdmUgR3JhcGhcIixcbiAgICAgIHRleHQ6IFwiWW91IHdvbid0IGJlIGFibGUgdG8gcmV2ZXJ0IHRoaXMhXCIsXG4gICAgICBpY29uOiBcIndhcm5pbmdcIixcbiAgICAgIHNob3dDYW5jZWxCdXR0b246IHRydWUsXG4gICAgICBjb25maXJtQnV0dG9uQ29sb3I6IFwiIzMwODVkNlwiLFxuICAgICAgY2FuY2VsQnV0dG9uQ29sb3I6IFwiI2QzM1wiLFxuICAgICAgY29uZmlybUJ1dHRvblRleHQ6IFwiU2F2ZVwiXG4gICAgfSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICBpZiAocmVzdWx0LmlzQ29uZmlybWVkKSB7XG4gICAgICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS5zYXZlR3JhcGhEYXRhLnN1YnNjcmliZSgoc2F2ZUdyYXBoRGF0YSkgPT4ge1xuICAgICAgICAgIHRoaXMuc2F2ZUdyYXBoRGF0YSA9IHNhdmVHcmFwaERhdGE7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuc2F2ZUdyYXBoRGF0YUV2ZW50LmVtaXQodGhpcy5zYXZlR3JhcGhEYXRhKTtcblxuICAgICAgICB0aGlzLmRpc2FibGVCdXR0b25zKHRydWUpO1xuICAgICAgICB0aGlzLmRhdGEgPSB0aGlzLnNhdmVHcmFwaERhdGE7XG5cbiAgICAgICAgU3dhbC5maXJlKHtcbiAgICAgICAgICB0aXRsZTogXCJTYXZlZCFcIixcbiAgICAgICAgICB0ZXh0OiBcIllvdXIgZ3JhcGggaGFzIGJlZW4gc2F2ZWQuXCIsXG4gICAgICAgICAgaWNvbjogXCJzdWNjZXNzXCJcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgcHJpdmF0ZSBkaXNhYmxlQnV0dG9ucyhkaXNhYmxlZDogYm9vbGVhbik6IHZvaWQge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyNzYXZlX2dyYXBoLCAjcmVzZXRfZ3JhcGgnKS5mb3JFYWNoKGJ0biA9PiB7XG4gICAgICBidG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsIFN0cmluZyhkaXNhYmxlZCkpO1xuICAgIH0pO1xuICB9XG59IiwiPGRpdiBjbGFzcz1cInBhZ2VcIiBpZD1cInBhZ2VJZFwiICh3aW5kb3c6cmVzaXplKT1cIm9uUmVzaXplKCRldmVudClcIj5cbiAgPGRpdiBjbGFzcz1cImJ1dHRvbkJhclwiIFtzdHlsZS5yaWdodF09XCJidXR0b25CYXJSaWdodFBvc2l0aW9uXCI+XG4gICAgPGRpdiBjbGFzcz1cImQtZmxleCBqdXN0aWZ5LWNvbnRlbnQtZW5kXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwiYnRuLWdyb3VwXCIgcm9sZT1cImdyb3VwXCIgYXJpYS1sYWJlbD1cIkNvbnRyb2xzXCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwic2F2ZV9ncmFwaFwiIGNsYXNzPVwibS0zIGJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgIHRpdGxlPVwiU2F2ZSBkYXRhXCIgKGNsaWNrKT1cIm9uQ29uZmlybVNhdmUoKVwiPlxuICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktc2F2ZVwiPjwvaT5cbiAgICAgICAgPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG4gIDwhLS0gWm9vbSBpbmRpY2F0b3ItLT5cbiAgPGRpdiAqbmdJZj1cInpvb21cIiBjbGFzcz1cInpvb21JbmRpY2F0b3JcIj5cbiAgICA8c3BhbiBpZD1cInpvb21fbGV2ZWxcIj48L3NwYW4+XG4gIDwvZGl2PlxuICA8c3ZnICNzdmdJZCBbYXR0ci53aWR0aF09XCJ3aWR0aFwiIGhlaWdodD1cIjc4MFwiPjwvc3ZnPlxuPC9kaXY+Il19