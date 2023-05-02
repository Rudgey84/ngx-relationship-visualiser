import { Component, TemplateRef } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(readonly modalService: BsModalService) {}

  public title = 'angular-testapp';
  readonly defaultModalConfig = { class: 'modal-xl' };
  public modalRef?: BsModalRef;
  public viewLinkArray;
  public viewNodeId;
  public createLinkIds;

  public mockedData = {
    nodes: [
      {
        id: '123',
        version: 0,
        typeName: 'men',
        label: ['John Doe', '01/01/1970'],
        icon: '21',
        xpos: 0,
        ypos: 0,
        x: 0,
        y: 0,
        fx: 100,
        fy: 400,
      },
      {
        id: '456',
        version: 0,
        typeName: 'men',
        label: ['Richard Hill', '14/05/1982'],
        icon: '44',
        xpos: 0,
        ypos: 0,
        x: 0,
        y: 0,
        fx: 410,
        fy: 284,
      },
      {
        id: '789',
        version: 0,
        typeName: 'men',
        label: ['Tom Smith', 'Software Developer'],
        icon: '99',
        xpos: 0,
        ypos: 0,
        x: 0,
        y: 0,
        fx: 55,
        fy: 60,
      }
    ],
    links: [
      {
        source: '123',
        target: '456',
        label: ['Worked at IBM', 'Both in same scrum team'],
        lineStyle: 'Unconfirmed',
        sourceArrow: false,
        targetArrow: true,
        linkId: '1',
        relationships: [
          {
            label: 'Worked at IBM',
            lineStyle: 'Unconfirmed',
            source: '123',
            sourceArrow: false,
            target: '456',
            targetArrow: true,
          },
          {
            label: 'Both in same scrum team',
            lineStyle: 'Confirmed',
            source: '123',
            sourceArrow: true,
            target: '456',
            targetArrow: false,
          },
        ],
      },
      {
        source: '456',
        target: '789',
        label: ['Play in the same football team', 'Daughters in the same class at school', 'Went on a family holiday together last year'],
        lineStyle: 'Confirmed',
        sourceArrow: true,
        targetArrow: true,
        linkId: '2',
        relationships: [
          {
            label: 'Play in the same football team',
            lineStyle: 'Confirmed',
            source: '456',
            sourceArrow: false,
            target: '789',
            targetArrow: true,
          },
          {
            label: 'Daughters in the same class at school',
            lineStyle: 'Confirmed',
            source: '456',
            sourceArrow: true,
            target: '789',
            targetArrow: false,
          },
          {
            label: 'Went on a family holiday together last year',
            lineStyle: 'Confirmed',
            source: '456',
            sourceArrow: true,
            target: '789',
            targetArrow: false,
          },
        ],
      },
      {
        source: '789',
        target: '123',
        label: ['Drink in the same pub', 'Drinking friends'],
        lineStyle: 'Unconfirmed',
        sourceArrow: true,
        targetArrow: true,
        linkId: '3',
        relationships: [
          {
            label: 'Drink in the same pub',
            lineStyle: 'Unconfirmed',
            source: '789',
            sourceArrow: false,
            target: '123',
            targetArrow: true,
          },
          {
            label: 'Drinking friends',
            lineStyle: 'Unconfirmed',
            source: '789',
            sourceArrow: true,
            target: '123',
            targetArrow: false,
          },
        ],
      },
    ],
  };

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
