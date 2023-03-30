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

  public mockedData = {
    nodes: [
      {
        id: '2494EA624C3E6F00D2ACC3EF',
        version: 0,
        typeName: 'Motor Vehicle',
        label: ['Red', 'BMW', 'Stolen'],
        icon: 'Car',
        xpos: 0,
        ypos: 0,
        x: 500,
        y: 10,
        fx: -30,
        fy: 30,
      },
      {
        id: '2494EA62',
        version: 0,
        typeName: 'Motor Vehicle',
        label: ['D1RTY', 'Brown', 'Ford Cortina'],
        icon: 'Car',
        xpos: 0,
        ypos: 0,
        fx: 425,
        fy: 225,
        x: -345,
        y: 403,
      },
      {
        id: '123',
        version: 0,
        typeName: 'Motor Vehicle',
        label: ['Tom'],
        icon: 'Car',
        xpos: 0,
        ypos: 0,
        x: 3,
        y: 10,
        fx: null,
        fy: null,
      },
    ],
    links: [
      {
        source: '123',
        target: '2494EA62',
        label: ['Criminal associate', 'Dealer'],
        lineStyle: 'Unconfirmed',
        sourceArrow: false,
        targetArrow: true,
        linkId: '1234',
        relationships: [
          {
            label: 'Criminal associate 1',
            lineStyle: 'Unconfirmed',
            source: '123',
            sourceArrow: false,
            target: '2494EA62',
            targetArrow: true,
          },
          {
            label: '(Dealer) 1',
            lineStyle: 'Confirmed',
            source: '123',
            sourceArrow: true,
            target: '2494EA62',
            targetArrow: false,
          },
        ],
      },
      {
        source: '2494EA624C3E6F00D2ACC3EF',
        target: '2494EA62',
        label: ['Criminal associate', 'Dealer'],
        lineStyle: 'Confirmed',
        sourceArrow: true,
        targetArrow: true,
        linkId: '1234',
        relationships: [
          {
            label: '(Criminal associate)',
            lineStyle: 'Confirmed',
            source: '2494EA624C3E6F00D2ACC3EF',
            sourceArrow: false,
            target: '2494EA62',
            targetArrow: true,
          },
          {
            label: '(Dealer)',
            lineStyle: 'Confirmed',
            source: '2494EA624C3E6F00D2ACC3EF',
            sourceArrow: true,
            target: '2494EA62',
            targetArrow: false,
          },
          {
            label: 'Another link',
            lineStyle: 'Confirmed',
            source: '2494EA624C3E6F00D2ACC3EF',
            sourceArrow: true,
            target: '2494EA62',
            targetArrow: false,
          },
          {
            label: 'And Another link',
            lineStyle: 'Confirmed',
            source: '2494EA624C3E6F00D2ACC3EF',
            sourceArrow: true,
            target: '2494EA62',
            targetArrow: false,
          },
        ],
      },
      {
        source: '2494EA624C3E6F00D2ACC3EF',
        target: '123',
        label: ['Criminal associate', 'Dealer'],
        lineStyle: 'Unconfirmed',
        sourceArrow: true,
        targetArrow: true,
        linkId: '1234',
        relationships: [
          {
            label: '(Criminal associate) 2',
            lineStyle: 'Unconfirmed',
            source: '2494EA624C3E6F00D2ACC3EF',
            sourceArrow: false,
            target: '123',
            targetArrow: true,
          },
          {
            label: '(Dealer) 2',
            lineStyle: 'Unconfirmed',
            source: '2494EA624C3E6F00D2ACC3EF',
            sourceArrow: true,
            target: '123',
            targetArrow: false,
          },
        ],
      },
    ],
  };

  public viewLinkEvent(
    template: TemplateRef<any>,
    viewLinkArray,
    config = this.defaultModalConfig
  ) {
    this.viewLinkArray = viewLinkArray;
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
