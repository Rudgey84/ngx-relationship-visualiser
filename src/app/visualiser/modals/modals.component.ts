import { Component, Input, Output, EventEmitter, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

@Component({
  selector: 'app-modals',
  templateUrl: './modals.component.html',
})
export class ModalsComponent implements OnInit {
  @Input() selectedNodeId: string;
  @Input() selectedLinkArray: any[];
  @Input() selectedNodesArray: any[];
  @Output() closeModalEvent = new EventEmitter<string>();
  @ViewChild('viewLinkModal') viewLinkModal: TemplateRef<any>;
  @Output() confirmSaveEvent = new EventEmitter<void>();
  @Output() createLinkEvent = new EventEmitter<any>();
  @ViewChild('viewNodeModal') viewNodeModal: TemplateRef<any>;
  @ViewChild('createLinkModal') createLinkModal: TemplateRef<any>;
  @ViewChild('confirmationModal') confirmationModal: TemplateRef<any>;
  public modalRef?: BsModalRef;
  readonly defaultModalConfig = { class: 'modal-xl' };

  linkForm: FormGroup;

  constructor(private modalService: BsModalService, private fb: FormBuilder) {}

  ngOnInit() {
    this.linkForm = this.fb.group({
      lineStyle: ['Confirmed', Validators.required],
      sourceArrow: [false],
      targetArrow: [true],
      label: this.fb.array([
        this.fb.control('test', Validators.required),
        this.fb.control('Another Test', Validators.required)
      ]),
      linkStrength: [false]
    });
  }

  get labelArray(): FormArray {
    return this.linkForm.get('label') as FormArray;
  }

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

  public createLink(): void {
    if (this.linkForm.valid) {
      this.createLinkEvent.emit(this.linkForm.value);
      this.closeModal('modalRef');
    }
  }
}
