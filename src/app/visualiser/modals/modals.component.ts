import { Component, Input, Output, EventEmitter, TemplateRef, ViewChild } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-modals',
  templateUrl: './modals.component.html',
})
export class ModalsComponent {
  @Input() selectedNodeId: string;
  @Input() selectedLinkArray: any[];
  @Input() selectedNodesArray: any[];
  @Output() closeModalEvent = new EventEmitter<string>();
  @ViewChild('viewLinkModal') viewLinkModal: TemplateRef<any>;
  @Output() confirmSaveEvent = new EventEmitter<void>();
  @ViewChild('viewNodeModal') viewNodeModal: TemplateRef<any>;
  @ViewChild('createLinkModal') createLinkModal: TemplateRef<any>;
  @ViewChild('confirmationModal') confirmationModal: TemplateRef<any>;
  public modalRef?: BsModalRef;
  readonly defaultModalConfig = { class: 'modal-xl' };

  constructor(private modalService: BsModalService) {}

  public openModal(
    template: TemplateRef<any>
  ) {
    if (!template) {
      console.error('Template is required to open a modal.');
      return null;
    }
    this.modalRef = this.modalService.show(template, this.defaultModalConfig);
  }

  public closeModal(modalRef: string): void {
    if (this[modalRef]) {
      this[modalRef].hide();
    }
  }

  public confirmSave(): void {
    this.closeModal('modalRef');
    this.confirmSaveEvent.emit();
  }
}
