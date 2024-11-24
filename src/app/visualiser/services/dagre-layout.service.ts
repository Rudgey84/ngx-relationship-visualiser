import * as dagre from 'dagre';
import { Injectable } from '@angular/core';

export enum Orientation {
  LEFT_TO_RIGHT = 'LR',
  RIGHT_TO_LEFT = 'RL',
  TOP_TO_BOTTOM = 'TB',
  BOTTOM_TO_TOP = 'BT',
}

export enum Alignment {
  CENTER = 'C',
  UP_LEFT = 'UL',
  UP_RIGHT = 'UR',
  DOWN_LEFT = 'DL',
  DOWN_RIGHT = 'DR',
}

export interface DagreSettings {
  orientation?: Orientation;
  marginX?: number;
  marginY?: number;
  edgePadding?: number;
  rankPadding?: number;
  nodePadding?: number;
  align?: Alignment;
  acyclicer?: 'greedy';
  ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
  multigraph?: boolean;
  compound?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DagreNodesOnlyLayout {
  defaultSettings = {
    orientation: Orientation.LEFT_TO_RIGHT,
    marginX: 70,
    marginY: 70,
    edgePadding: 200,
    rankPadding: 300,
    nodePadding: 100,
    curveDistance: 20,
    multigraph: true,
    compound: true,
    align: Alignment.UP_RIGHT,
    acyclicer: undefined,
    ranker: 'network-simplex',
  };

  dagreGraph: any;
  dagreNodes: any;
  dagreEdges: any;

  public renderLayout(graph) {
    this.createDagreGraph(graph);
    dagre.layout(this.dagreGraph);

    for (const dagreNodeId in this.dagreGraph._nodes) {
      const dagreNode = this.dagreGraph._nodes[dagreNodeId];
      const node = graph.nodes.find((n) => n.id === dagreNode.id);

      if (node.fx === null && node.fy === null) {
        // Check if the node has any associated edges
        const hasAssociatedEdges = graph.links.some(
          (link) => link.source === dagreNode.id || link.target === dagreNode.id
        );
        if (hasAssociatedEdges) {
          node.fx = dagreNode.x;
          node.fy = dagreNode.y;
        }
      }

      node.dimension = {
        width: dagreNode.width,
        height: dagreNode.height,
      };
    }

    return graph;
  }

  public initRenderLayout(graph) {
    this.createDagreGraph(graph);
    dagre.layout(this.dagreGraph);
    let minFy = Infinity;
    for (const dagreNodeId in this.dagreGraph._nodes) {
      const dagreNode = this.dagreGraph._nodes[dagreNodeId];
      const node = graph.nodes.find((n) => n.id === dagreNode.id);

      // Check if the node has any associated edges
      const hasAssociatedEdges = graph.links.some(
        (link) => link.source === dagreNode.id || link.target === dagreNode.id
      );

      if (hasAssociatedEdges) {
        node.fx = dagreNode.x;
        node.fy = dagreNode.y;
        minFy = Math.min(minFy, dagreNode.y - this.defaultSettings.marginY);
      } else {
        // Give them a null value to later random position them only when the layout button is pressed so they come into view
        node.fx = null;
        node.fy = null;
      }

      node.dimension = {
        width: dagreNode.width,
        height: dagreNode.height,
      };
    }

    // Adjust the fy values to start from 0 if there are associated edges
    if (minFy !== Infinity) {
      for (const node of graph.nodes) {
        if (node.fy !== null) {
          node.fy -= minFy;
        }
      }
    }

    return graph;
  }

  public createDagreGraph(graph): any {
    const settings = Object.assign({}, this.defaultSettings);
    this.dagreGraph = new dagre.graphlib.Graph({
      compound: settings.compound,
      multigraph: settings.multigraph,
    });
    this.dagreGraph.setGraph({
      rankdir: settings.orientation,
      marginx: settings.marginX,
      marginy: settings.marginY,
      edgesep: settings.edgePadding,
      ranksep: settings.rankPadding,
      nodesep: settings.nodePadding,
      align: settings.align,
      acyclicer: settings.acyclicer,
      ranker: settings.ranker,
      multigraph: settings.multigraph,
      compound: settings.compound,
    });

    this.dagreNodes = graph.nodes.map((n) => {
      const node: any = Object.assign({}, n);
      node.width = 20;
      node.height = 20;
      node.x = n.fx;
      node.y = n.fy;
      return node;
    });

    this.dagreEdges = graph.links.map((l) => {
      const newLink: any = Object.assign({}, l);
      return newLink;
    });

    for (const node of this.dagreNodes) {
      if (!node.width) {
        node.width = 20;
      }
      if (!node.height) {
        node.height = 30;
      }

      // update dagre
      this.dagreGraph.setNode(node.id, node);
    }

    // update dagre
    for (const edge of this.dagreEdges) {
      if (settings.multigraph) {
        this.dagreGraph.setEdge(edge.source, edge.target, edge, edge.linkId);
      } else {
        this.dagreGraph.setEdge(edge.source, edge.target);
      }
    }

    return this.dagreGraph;
  }
}
