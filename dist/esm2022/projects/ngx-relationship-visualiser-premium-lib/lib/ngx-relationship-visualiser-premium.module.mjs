import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ContextMenuModule } from '@kreash/ngx-contextmenu';
import { VisualiserGraphComponent } from './visualiser/visualiser-graph/visualiser-graph.component';
import { ContextMenusComponent } from './visualiser/context-menus/context-menus.component';
import { ModalsComponent } from './visualiser/modals/modals.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import * as i0 from "@angular/core";
import * as i1 from "ngx-bootstrap/modal";
import * as i2 from "@kreash/ngx-contextmenu";
export class NgxRelationshipVisualiserPremiumModule {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: NgxRelationshipVisualiserPremiumModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "17.3.12", ngImport: i0, type: NgxRelationshipVisualiserPremiumModule, declarations: [VisualiserGraphComponent,
            ContextMenusComponent,
            ModalsComponent], imports: [BrowserModule,
            ReactiveFormsModule, i1.ModalModule, i2.ContextMenuModule, NgSelectModule,
            FormsModule], exports: [VisualiserGraphComponent] });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: NgxRelationshipVisualiserPremiumModule, imports: [BrowserModule,
            ReactiveFormsModule,
            ModalModule.forRoot(),
            ContextMenuModule.forRoot({ useBootstrap4: true }),
            NgSelectModule,
            FormsModule] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: NgxRelationshipVisualiserPremiumModule, decorators: [{
            type: NgModule,
            args: [{
                    declarations: [
                        VisualiserGraphComponent,
                        ContextMenusComponent,
                        ModalsComponent
                    ],
                    imports: [
                        BrowserModule,
                        ReactiveFormsModule,
                        ModalModule.forRoot(),
                        ContextMenuModule.forRoot({ useBootstrap4: true }),
                        NgSelectModule,
                        FormsModule
                    ],
                    exports: [VisualiserGraphComponent]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmd4LXJlbGF0aW9uc2hpcC12aXN1YWxpc2VyLXByZW1pdW0ubW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LXJlbGF0aW9uc2hpcC12aXN1YWxpc2VyLXByZW1pdW0tbGliL2xpYi9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItcHJlbWl1bS5tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDckQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzVELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdCQUFnQixDQUFDOzs7O0FBbUI3QyxNQUFNLE9BQU8sc0NBQXNDO3dHQUF0QyxzQ0FBc0M7eUdBQXRDLHNDQUFzQyxpQkFmL0Msd0JBQXdCO1lBQ3hCLHFCQUFxQjtZQUNyQixlQUFlLGFBR2YsYUFBYTtZQUNiLG1CQUFtQix3Q0FHbkIsY0FBYztZQUNkLFdBQVcsYUFFSCx3QkFBd0I7eUdBR3ZCLHNDQUFzQyxZQVYvQyxhQUFhO1lBQ2IsbUJBQW1CO1lBQ25CLFdBQVcsQ0FBQyxPQUFPLEVBQUU7WUFDckIsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDO1lBQ2xELGNBQWM7WUFDZCxXQUFXOzs0RkFLRixzQ0FBc0M7a0JBakJsRCxRQUFRO21CQUFDO29CQUNSLFlBQVksRUFBRTt3QkFDWix3QkFBd0I7d0JBQ3hCLHFCQUFxQjt3QkFDckIsZUFBZTtxQkFDaEI7b0JBQ0QsT0FBTyxFQUFFO3dCQUNQLGFBQWE7d0JBQ2IsbUJBQW1CO3dCQUNuQixXQUFXLENBQUMsT0FBTyxFQUFFO3dCQUNyQixpQkFBaUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUM7d0JBQ2xELGNBQWM7d0JBQ2QsV0FBVztxQkFDWjtvQkFDRCxPQUFPLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQztpQkFDcEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZ01vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgQnJvd3Nlck1vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXInO1xuaW1wb3J0IHsgUmVhY3RpdmVGb3Jtc01vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2Zvcm1zJztcbmltcG9ydCB7IE1vZGFsTW9kdWxlIH0gZnJvbSAnbmd4LWJvb3RzdHJhcC9tb2RhbCc7XG5pbXBvcnQgeyBDb250ZXh0TWVudU1vZHVsZSB9IGZyb20gJ0BrcmVhc2gvbmd4LWNvbnRleHRtZW51JztcbmltcG9ydCB7IFZpc3VhbGlzZXJHcmFwaENvbXBvbmVudCB9IGZyb20gJy4vdmlzdWFsaXNlci92aXN1YWxpc2VyLWdyYXBoL3Zpc3VhbGlzZXItZ3JhcGguY29tcG9uZW50JztcbmltcG9ydCB7IENvbnRleHRNZW51c0NvbXBvbmVudCB9IGZyb20gJy4vdmlzdWFsaXNlci9jb250ZXh0LW1lbnVzL2NvbnRleHQtbWVudXMuY29tcG9uZW50JztcbmltcG9ydCB7IE1vZGFsc0NvbXBvbmVudCB9IGZyb20gJy4vdmlzdWFsaXNlci9tb2RhbHMvbW9kYWxzLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBOZ1NlbGVjdE1vZHVsZSB9IGZyb20gJ0BuZy1zZWxlY3Qvbmctc2VsZWN0JztcbmltcG9ydCB7IEZvcm1zTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuXG5ATmdNb2R1bGUoe1xuICBkZWNsYXJhdGlvbnM6IFtcbiAgICBWaXN1YWxpc2VyR3JhcGhDb21wb25lbnQsXG4gICAgQ29udGV4dE1lbnVzQ29tcG9uZW50LFxuICAgIE1vZGFsc0NvbXBvbmVudFxuICBdLFxuICBpbXBvcnRzOiBbXG4gICAgQnJvd3Nlck1vZHVsZSxcbiAgICBSZWFjdGl2ZUZvcm1zTW9kdWxlLFxuICAgIE1vZGFsTW9kdWxlLmZvclJvb3QoKSxcbiAgICBDb250ZXh0TWVudU1vZHVsZS5mb3JSb290KHsgdXNlQm9vdHN0cmFwNDogdHJ1ZSB9KSxcbiAgICBOZ1NlbGVjdE1vZHVsZSxcbiAgICBGb3Jtc01vZHVsZVxuICBdLFxuICBleHBvcnRzOiBbVmlzdWFsaXNlckdyYXBoQ29tcG9uZW50XVxufSlcblxuZXhwb3J0IGNsYXNzIE5neFJlbGF0aW9uc2hpcFZpc3VhbGlzZXJQcmVtaXVtTW9kdWxlIHsgfVxuIl19