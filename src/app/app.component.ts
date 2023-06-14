import { Component, TemplateRef } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(readonly modalService: BsModalService) {
    // Get a random icon
    this.mockedData.nodes.forEach(node => {
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
        fx: 1000,
        fy: 400,
        attachedToAuthorisedIRs: true,attachedToUnauthorisedIRs: true
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
        attachedToAuthorisedIRs: true,attachedToUnauthorisedIRs:false
      },
      {
        id: '789',
        version: 0,
        typeName: 'men',
        label: ['Rick Smith', 'Software Developer'],
        icon: '99',
        xpos: 0,
        ypos: 0,
        x: 0,
        y: 0,
        fx: 55,
        fy: 60,
        attachedToAuthorisedIRs: true,attachedToUnauthorisedIRs: true
      },
      {
        id: '666',
        version: 0,
        typeName: 'men',
        label: ['James Jones', 'BA'],
        icon: '9',
        xpos: 0,
        ypos: 0,
        x: 0,
        y: 0,
        fx: null,
        fy: null,
        attachedToAuthorisedIRs: false,attachedToUnauthorisedIRs: false
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
            attachedToAuthorisedIRs: true,attachedToUnauthorisedIRs:true
          },
          {
            label: 'Both in same scrum team',
            lineStyle: 'Confirmed',
            source: '123',
            sourceArrow: true,
            target: '456',
            targetArrow: false,
            attachedToAuthorisedIRs: true,attachedToUnauthorisedIRs:true
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
            attachedToAuthorisedIRs: true,attachedToUnauthorisedIRs:false
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
            attachedToAuthorisedIRs: true,attachedToUnauthorisedIRs:false
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
            attachedToAuthorisedIRs: true,attachedToUnauthorisedIRs:false
          },
          {
            label: 'Drinking friends',
            lineStyle: 'Unconfirmed',
            source: '789',
            sourceArrow: true,
            target: '123',
            targetArrow: false,
            attachedToAuthorisedIRs: true,attachedToUnauthorisedIRs:false
          },
        ],
      },
      {
        source: '666',
        target: '123',
        label: ['Same University'],
        lineStyle: 'Unconfirmed',
        sourceArrow: true,
        targetArrow: false,
        linkId: '4',
        relationships: [
          {
            label: ['Same University'],
            lineStyle: 'Unconfirmed',
            source: '666',
            sourceArrow: false,
            target: '123',
            targetArrow: false,
            attachedToAuthorisedIRs: true,attachedToUnauthorisedIRs:true
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

  public saveGraphData(event) {
    console.log(JSON.stringify(event));
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
