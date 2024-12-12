import { Component, TemplateRef } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Data } from './models/data.interface';
import { MOCKEDDATA } from './models/mocked-data';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  constructor(readonly modalService: BsModalService) {
    // Get a random icon
    this.mockedData.nodes.forEach((node) => {
      const randomIcon = Math.floor(Math.random() * 100).toString();
      node.icon = randomIcon;
    });
  }

  public title = 'angular-testapp';
  readonly defaultModalConfig = { class: 'modal-xl' };
  public modalRef?: BsModalRef;
  public viewLinkArray;
  public viewNodeId;
  public createLinkIds;
  public mockedData: Data = MOCKEDDATA; 

  public createLinkEvent(
    template: TemplateRef<any>,
    createLinkIds,
    config = this.defaultModalConfig
  ) {
    this.createLinkIds = createLinkIds;
    this.openModal('modalRef', template, config);
  }

  public viewLinkEvent(
    template: TemplateRef<any>,
    viewLinkArray,
    config = this.defaultModalConfig
  ) {
    this.viewLinkArray = viewLinkArray;
    this.openModal('modalRef', template, config);
  }

  public viewNodeEvent(
    template: TemplateRef<any>,
    viewNodeId,
    config = this.defaultModalConfig
  ) {
    this.viewNodeId = viewNodeId;
    this.openModal('modalRef', template, config);
  }

  public saveGraphData(event) {
    const { irUrn, nodes } = event;
    console.log(irUrn, nodes);
  }

  // Open the modal
  public openModal(
    modalRef: string,
    template: TemplateRef<any>,
    config = this.defaultModalConfig
  ) {
    this[modalRef] = this.modalService.show(template, config);
  }

  public closeModal(modalRef: string): void {
    if (this[modalRef]) {
      this[modalRef].hide();
    }
  }
}
