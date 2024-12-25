import { Component, Input, Output, EventEmitter, TemplateRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { FormBuilder } from '@angular/forms';
import { AbstractModalFormHandler } from './abstract-modal-form-handler';
import { Link, Node } from '../../models/data.interface';

@Component({
  selector: 'app-modals',
  templateUrl: './modals.component.html',
})
export class ModalsComponent extends AbstractModalFormHandler implements OnChanges {
  @Input() editNodeData: any;
  @Input() editLinksData: any;
  @Output() closeModalEvent = new EventEmitter<string>();
  @Output() createLinkEvent = new EventEmitter<Link>();
  @Output() createNodeEvent = new EventEmitter<Node>();
  @Output() deleteLinkEvent = new EventEmitter<any>();
  @Output() deleteNodeEvent = new EventEmitter<any>();
  @ViewChild('editNodeModal') editNodeModal: TemplateRef<any>;
  @ViewChild('createNodeModal') createNodeModal: TemplateRef<any>;
  @ViewChild('createLinkModal') createLinkModal: TemplateRef<any>;
  @ViewChild('editLinksModal') editLinksModal: TemplateRef<any>;

  public modalRef?: BsModalRef;
  readonly defaultModalConfig = { class: 'modal-xl' };

  constructor(private modalService: BsModalService, fb: FormBuilder) {
    super(fb);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.editLinksData && this.editLinksData) {
      this.resetForm();
      this.populateEditLinkForm(this.editLinksData);
    }
    if (changes.editNodeData && this.editNodeData) {
      this.resetNodeForm();
      this.populateEditNodeForm(this.editNodeData);
    }
  }

  public openModal(template: TemplateRef<any>) {
    if (!template) {
      console.error('Template is required to open a modal.');
      return null;
    }

    if (template === this.editLinksModal && this.editLinksData) {
      this.resetForm();
      this.populateEditLinkForm(this.editLinksData);
    } else if (template === this.createLinkModal) {
      this.resetForm();
    }

    this.modalRef = this.modalService.show(template, this.defaultModalConfig);
  }

  public closeModal(modalRef: string): void {
    if (this[modalRef]) {
      this[modalRef].hide();
    }
  }

  public createLink(): void {
    if (this.createLinkForm.valid) {
      const createLinkData: Link = this.createLinkForm.value as Link;
      this.createLinkEvent.emit(createLinkData);
      this.resetForm();
      this.closeModal('modalRef');
    }
  }

  public createNode(): void {
    if (this.createNodeForm.valid) {
      const createNodeData: Node = this.createNodeForm.value as Node;
      const payload: Node = {
        id: createNodeData.id,
        label: (createNodeData.label as unknown as { label: string }[]).map((item: { label: string }) => item.label),
        icon: createNodeData.icon,
        fx: createNodeData.fx,
        fy: createNodeData.fy,
        linkStrength: createNodeData.linkStrength,
      };
      this.createNodeEvent.emit(payload);
      this.resetNodeForm();
      this.closeModal('modalRef');
    }
  }

  public deleteNode(): void {
    this.deleteNodeEvent.emit(true);
    this.resetNodeForm();
    this.closeModal('modalRef');
  }

  public deleteLink(): void {
    const linkId = this.editLinksData.linkId;
    this.deleteLinkEvent.emit(linkId);
    this.resetForm();
    this.closeModal('modalRef');
  }
}
