import {
  Component,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit
} from '@angular/core';
import { VisualiserGraphService } from '../services/visualiser-graph.service';
import { DagreNodesOnlyLayout } from '../services/dagre-layout.service';
import { Data } from '../../models/data.interface';
import { DexieService } from '../../db/graphDatabase';
import Swal from 'sweetalert2'


@Component({
  selector: 'visualiser-graph',
  templateUrl: "./visualiser-graph.component.html",
  styleUrls: ["./visualiser-graph.component.scss"],
})
export class VisualiserGraphComponent implements OnInit {
  @ViewChild('svgId') graphElement: ElementRef;
  @Output() saveGraphDataEvent = new EventEmitter<any>();
  public saveGraphData;

  public width;
  public savedGraphData: Data;
  public buttonBarRightPosition: string;

  @Input() zoom: boolean = true;
  @Input() zoomToFit: boolean = false;
  constructor(
    readonly visualiserGraphService: VisualiserGraphService,
    readonly dagreNodesOnlyLayout: DagreNodesOnlyLayout,
    private dexieService: DexieService
  ) { }

  @Input()
  set data(data: Data) {
    if (!data || !data.dataId) {
      console.error('Invalid data input');
      return;
    }

    this.savedGraphData = data;

    // Timeout: The input arrives before the svg is rendered, therefore the nativeElement does not exist
    setTimeout(async () => {
      this.dagreNodesOnlyLayout.renderLayout(data);
      // Take a copy of input for reset
      await this.dexieService.saveGraphData(data);

      this.visualiserGraphService.update(
        data,
        this.graphElement.nativeElement,
        this.zoom,
        this.zoomToFit
      );
    }, 500);
  }

  public ngOnInit() {
    this.updateWidth();
    this.buttonBarRightPosition = '0';
    // Initialize with default empty data if no data is provided
    if (!this.savedGraphData) {
      console.warn('No data provided, using empty data set');
      this.data = {
        dataId: '1',
        nodes: [],
        links: [],
      };
    }
  }

  public onResize(event): void {
    this.updateWidth();
  }

  public updateWidth(): void {
    this.width = document.getElementById('pageId').offsetWidth;
  }

  public async onConfirmSave(): Promise<void> {
    if (!this.savedGraphData) {
      console.error('savedGraphData is not set');
      return;
    }

    Swal.fire({
      title: "Save Graph",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Save"
    }).then((result) => {
      if (result.isConfirmed) {
        this.visualiserGraphService.saveGraphData.subscribe((saveGraphData) => {
          this.saveGraphData = saveGraphData;
        });

        this.saveGraphDataEvent.emit(this.saveGraphData);

        this.disableButtons(true);
        this.data = this.saveGraphData;

        Swal.fire({
          title: "Saved!",
          text: "Your graph has been saved.",
          icon: "success"
        });
      }
    });
  }
  private disableButtons(disabled: boolean): void {
    document.querySelectorAll('#save_graph, #reset_graph').forEach(btn => {
      btn.setAttribute('disabled', String(disabled));
    });
  }
}