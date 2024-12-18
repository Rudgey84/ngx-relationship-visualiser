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
  @Input() editLinksData: any;
  @Output() closeModalEvent = new EventEmitter<string>();
  @Output() createLinkEvent = new EventEmitter<any>();
  @ViewChild('viewNodeModal') viewNodeModal: TemplateRef<any>;
  @ViewChild('createLinkModal') createLinkModal: TemplateRef<any>;
  @ViewChild('editLinkLabelModal') editLinkLabelModal: TemplateRef<any>;
  @ViewChild('editLinksModal') editLinksModal: TemplateRef<any>;
  
  public modalRef?: BsModalRef;
  readonly defaultModalConfig = { class: 'modal-xl' };
  createLinkForm: FormGroup;

  constructor(private modalService: BsModalService, private fb: FormBuilder) {}

  ngOnInit() {
    // Initialize form with an empty label array and other fields
    this.createLinkForm = this.fb.group({
      lineStyle: ['Unconfirmed', Validators.required],
      sourceArrow: [false],
      targetArrow: [false],
      label: this.fb.array([]),
    });
  }
  
  get labelArray(): FormArray {
    return this.createLinkForm.get('label') as FormArray;
  }
  
  // Adds a new label group to the form array
  public addLabel() {
    const labelGroup = this.fb.group({
      label: '',
      linkStrength: [false],
    });
    this.labelArray.push(labelGroup);
  }

  // Removes a label group at a specific index from the form array
  public removeLabel(index: number) {
    // Removing the label group from the form array by index
    if (this.labelArray.length > 0) {
      this.labelArray.removeAt(index);
    }
  }

  // Opens a modal based on the provided template reference
  public openModal(template: TemplateRef<any>) {
    if (!template) {
      console.error('Template is required to open a modal.');
      return null;
    }
    this.modalRef = this.modalService.show(template, this.defaultModalConfig);
  }

  // Close the modal by hiding the modal reference
  public closeModal(modalRef: string): void {
    if (this[modalRef]) {
      this[modalRef].hide();
    }
  }

  // Handles link creation and emits the data
  public createLink(): void {
    
    // Check if the form is valid before emitting the data
    if (this.createLinkForm.valid) {
      const formData = this.createLinkForm.value;
      console.log(formData);
      this.createLinkEvent.emit(formData);

      // Reset form after submission
      this.createLinkForm.reset({
        lineStyle: 'Unconfirmed',
        sourceArrow: false,
        targetArrow: false,
        label: [],
      });

      // Close the modal after form submission
      this.closeModal('modalRef');
    }
  }
}
