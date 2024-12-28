import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Link, Relationship, Node } from '../../models/data.interface';
import fontAwesomeIcons from '../../models/font-awesome-icons';

export abstract class AbstractModalFormHandler {
  createLinkForm: FormGroup;
  createNodeForm: FormGroup;
  public fontAwesomeIcons = fontAwesomeIcons;

  constructor(protected fb: FormBuilder) {
    this.createLinkForm = this.fb.group({
      lineStyle: ['Dotted', Validators.required],
      sourceArrow: [false],
      targetArrow: [false],
      label: this.fb.array([], Validators.required),
    });

    this.createNodeForm = this.fb.group({
      id: '',
      label: this.fb.array([], [Validators.required, this.minLengthArray(1)]),
      imageUrl: [''],
      icon: [''],
      fx: [null],
      fy: [null],
      additionalIcon: [''],
      iconType: ['select'],
    }, { validators: this.iconOrImageValidator });
  }

  get labelArray(): FormArray {
    return this.createLinkForm.get('label') as FormArray;
  }

  get nodeLabelArray(): FormArray {
    return this.createNodeForm.get('label') as FormArray;
  }

  public addLabel() {
    const labelGroup = this.fb.group({
      label: ['', Validators.required],
      linkIcon: [false],
    });
    this.labelArray.push(labelGroup);
  }

  public addNodeLabel() {
    const labelGroup = this.fb.group({
      label: ['', Validators.required],
    });
    this.nodeLabelArray.push(labelGroup);
  }

  public removeLabel(index: number) {
    if (this.labelArray.length > 1) {
      this.labelArray.removeAt(index);
    }
  }

  public removeNodeLabel(index: number) {
    if (this.nodeLabelArray.length > 1) {
      this.nodeLabelArray.removeAt(index);
    }
  }

  protected resetLinksForm() {
    this.createLinkForm.reset({
      lineStyle: 'Dotted',
      sourceArrow: false,
      targetArrow: false,
      label: this.fb.array([]),
    });
    this.labelArray.clear();
  }

  protected resetNodeForm() {
    this.createNodeForm.reset({
      label: this.fb.array([]),
      imageUrl: '',
      icon: '',
      additionalIcon: '',
      iconType: 'select',
    });
    this.nodeLabelArray.clear();
  }

  protected populateEditLinkForm(data: Link) {
    this.createLinkForm.patchValue({
      lineStyle: data.lineStyle,
      sourceArrow: data.sourceArrow,
      targetArrow: data.targetArrow
    });

    if (data.relationships && Array.isArray(data.relationships)) {
      data.relationships.forEach((relationship: Relationship) => {
        const labelGroup = this.fb.group({
          labelIndex: [relationship.labelIndex, Validators.required],
          label: [relationship.label, Validators.required],
          linkIcon: [relationship.linkIcon]
        });
        this.labelArray.push(labelGroup);
      });
    }
  }

  protected populateEditNodeForm(data: Node) {
    this.createNodeForm.patchValue({
      id: data.id,
      imageUrl: data.imageUrl,
      icon: data.icon,
      fx: data.fx,
      fy: data.fy,
      additionalIcon: data.additionalIcon,
      iconType: data.imageUrl ? 'url' : 'select'
    });

    this.createNodeForm.setControl('label', this.fb.array(
      data.label.map(label => this.fb.group({ label: [label, Validators.required] }))
    ));
  }

  private iconOrImageValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const imageUrl = control.get('imageUrl').value;
    const icon = control.get('icon').value;
    if ((imageUrl && icon) || (!imageUrl && !icon)) {
      return { 'iconOrImage': true };
    }
    return null;
  }

  private minLengthArray(min: number) {
    return (control: AbstractControl): { [key: string]: boolean } | null => {
      if (control instanceof FormArray) {
        return control.length >= min ? null : { minLengthArray: true };
      }
      return null;
    };
  }
}
