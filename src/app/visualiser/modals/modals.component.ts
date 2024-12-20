import { Component, Input, Output, EventEmitter, TemplateRef, ViewChild, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

@Component({
  selector: 'app-modals',
  templateUrl: './modals.component.html',
})
export class ModalsComponent implements OnInit, OnChanges {
  @Input() selectedNodeId: string;
  @Input() editLinksData: any;
  @Output() closeModalEvent = new EventEmitter<string>();
  @Output() createLinkEvent = new EventEmitter<any>();
  @Output() createNodeEvent = new EventEmitter<any>();
  @Output() deleteLinkEvent = new EventEmitter<any>();
  @Output() deleteNodeEvent = new EventEmitter<any>();
  @ViewChild('editNodeModal') editNodeModal: TemplateRef<any>;
  @ViewChild('createNodeModal') createNodeModal: TemplateRef<any>;
  @ViewChild('createLinkModal') createLinkModal: TemplateRef<any>;
  @ViewChild('editLinksModal') editLinksModal: TemplateRef<any>;

  public modalRef?: BsModalRef;
  readonly defaultModalConfig = { class: 'modal-xl' };
  createLinkForm: FormGroup;
  createNodeForm: FormGroup;

  constructor(private modalService: BsModalService, private fb: FormBuilder) { }

  ngOnInit() {
    // Initialize form with an empty label array and other fields
    this.createLinkForm = this.fb.group({
      lineStyle: ['Unconfirmed', Validators.required],
      sourceArrow: [false],
      targetArrow: [false],
      label: this.fb.array([], Validators.required),
    });

    // Initialize createNodeForm
    this.createNodeForm = this.fb.group({
      label: this.fb.array([], Validators.required),
      icon: ['', Validators.required],
      linkStrength: [false],
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.editLinksData && this.editLinksData) {
      this.resetForm();
      this.populateEditLinkForm(this.editLinksData);
    }
  }

  get labelArray(): FormArray {
    return this.createLinkForm.get('label') as FormArray;
  }

  get nodeLabelArray(): FormArray {
    return this.createNodeForm.get('label') as FormArray;
  }

  // Adds a new label group to the form array
  public addLabel() {
    const labelGroup = this.fb.group({
      label: ['', Validators.required],
      linkStrength: [false],
    });
    this.labelArray.push(labelGroup);
  }

  // Adds a new label group to the form array for createNodeForm
  public addNodeLabel() {
    const labelGroup = this.fb.group({
      label: ['', Validators.required],
    });
    this.nodeLabelArray.push(labelGroup);
  }

  // Removes a label group at a specific index from the form array
  public removeLabel(index: number) {
    // Removing the label group from the form array by index
    if (this.labelArray.length > 0) {
      this.labelArray.removeAt(index);
    }
  }

  // Removes a label group at a specific index from the form array for createNodeForm
  public removeNodeLabel(index: number) {
    if (this.nodeLabelArray.length > 0) {
      this.nodeLabelArray.removeAt(index);
    }
  }

  // Opens a modal based on the provided template reference
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

  // Reset the form before populating it with new data
  private resetForm() {
    this.createLinkForm.reset({
      lineStyle: 'Unconfirmed',
      sourceArrow: false,
      targetArrow: false,
      label: this.fb.array([]),
    });
    this.labelArray.clear();
  }

  // Reset the node form before populating it with new data
  private resetNodeForm() {
    this.createNodeForm.reset({
      label: this.fb.array([]),
      icon: '',
      linkStrength: false,
    });
    this.nodeLabelArray.clear();
  }

  // Populate the form with the data for editing links
  private populateEditLinkForm(data: any) {
    this.createLinkForm.patchValue({
      lineStyle: data.lineStyle,
      sourceArrow: data.sourceArrow,
      targetArrow: data.targetArrow
    });

    if (data.relationships) {
      data.relationships.forEach((relationship) => {
        const labelGroup = this.fb.group({
          linkIndex: relationship.linkIndex,
          label: [relationship.label, Validators.required],
          linkStrength: relationship.linkStrength
        });
        this.labelArray.push(labelGroup);
      });
    }
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
      const createLinkData = this.createLinkForm.value;
      this.createLinkEvent.emit(createLinkData);

      // Reset form after submission
      this.resetForm();

      // Close the modal after link form submission
      this.closeModal('modalRef');
    }
  }

  // Handles node creation and emits the data
  public createNode(): void {
    if (this.createNodeForm.valid) {
      const createNodeData = this.createNodeForm.value;
      const payload = {
        id: '',
        label: createNodeData.label.map(item => item.label),
        icon: createNodeData.icon,
        fx: null,
        fy: null,
        linkStrength: createNodeData.linkStrength,
      };
      this.createNodeEvent.emit(payload);

      // Reset form after submission
      this.resetNodeForm();

      // Close the modal after link form submission
      this.closeModal('modalRef');
    }
  }

  // Handles node deletion and emits the event
  public deleteNode(): void {
    this.deleteNodeEvent.emit(true);

    // Reset form after deletion
    this.resetForm();

    // Close the modal after node deletion
    this.closeModal('modalRef');
  }

  // Handles link deletion and emits the linkId
  public deleteLink(): void {
    const linkId = this.editLinksData.linkId;
    this.deleteLinkEvent.emit(linkId);

    // Reset form after deletion
    this.resetForm();

    // Close the modal after link deletion
    this.closeModal('modalRef');
  }
}
