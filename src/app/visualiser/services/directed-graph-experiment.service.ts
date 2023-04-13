import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DirectedGraphExperimentService {
  constructor() {}
  links = [];
  nodes = [];
  /** RxJS subject to listen for updates of the selection */
  createLinkArray = new Subject<any[]>();
  dblClickNodePayload = new Subject();
  dblClickLinkPayload = new Subject();
  selectedLinkArray = new Subject();

  public update(data, element) {
    const svg = d3.select(element);
    return this._update(d3, svg, data, element);
  }

  /** A method to bind a zoom behaviour to the svg g element */
  public applyZoomableBehaviour(svgElement, containerElement) {
    let svg, container, zoomed;

    svg = d3.select(svgElement);

    container = d3.select(containerElement);

    zoomed = () => {
      const transform = d3.event.transform;
      container.attr(
        'transform',
        `translate(${transform.x}, ${transform.y}) scale(${transform.k})`
      );
    };

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 1])
      .on('start', function () {
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('zoom', zoomed)
      .on('end', function () {
        d3.select(this).style('cursor', 'grab');
      });

    svg.call(zoom).style('cursor', 'grab');
  }

  private clearView(svg) {
    return svg.selectAll('*').remove();
  }

  private ticked(link, node, edgepaths) {
    link.each(function (d, i, n) {
      // Total difference in x and y from source to target
      let diffX = d.target.x - d.source.x;
      let diffY = d.target.y - d.source.y;

      // Length of path from center of source node to center of target node
      let pathLength = Math.sqrt(diffX * diffX + diffY * diffY);

      // x and y distances from center to outside edge of target node

      let offsetX = (diffX * 20) / pathLength;
      let offsetY = (diffY * 20) / pathLength;

      d3.select(n[i])
        .attr('x1', d.source.x + offsetX)
        .attr('y1', d.source.y + offsetY)
        .attr('x2', d.target.x - offsetX)
        .attr('y2', d.target.y - offsetY);
    });

    node.attr('transform', function (d) {
      return `translate(${d.x}, ${d.y + 50})`;
    });

    // node.attr('cx', function (d) {
    //   // boundries
    //   return (d.x = Math.max(40, Math.min(900 - 15, d.x)));
    // })
    // node.attr('cy', function (d) {
    //   return (d.y = Math.max(50, Math.min(600 - 40, d.y)));
    // });

    edgepaths.attr('d', function (d) {
      return `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`;
    });

    edgepaths.attr('transform', function (d) {
      if (d.target.x < d.source.x) {
        const bbox = this.getBBox();
        const rx = bbox.x + bbox.width / 2;
        const ry = bbox.y + bbox.height / 2;
        return `rotate(180 ${rx} ${ry})`;
      } else {
        return 'rotate(0)';
      }
    });
  }

  private dragended(_d3, d, simulation) {
    if (!_d3.event.active) {
      simulation.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }

  private initDefinitions(svg) {
    const defs = svg.append('defs');

    function createMarker(id, refX, path) {
      defs
        .append('marker')
        .attr('id', id)
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', refX)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', path)
        .attr('fill', '#b4b4b4')
        .style('stroke', 'none');
    }

    createMarker('arrowheadTarget', 0, 'M 0,-5 L 10 ,0 L 0,5');
    createMarker('arrowheadSource', 2, 'M 10 -5 L 0 0 L 10 5');

    return svg;
  }

  private forceSimulation(_d3, { width, height }) {
    return (
      _d3
        .forceSimulation()
        // .alphaDecay(0.001)
        .velocityDecay(0.1)
        .force(
          'link',
          _d3
            .forceLink()
            .id(function (d) {
              return d.id;
            })
            .distance(500)
            .strength(1)
        )
        .force('charge', _d3.forceManyBody().strength(-10))
        .force('center', _d3.forceCenter(width / 2, height / 2))
        .force('collision', _d3.forceCollide().radius(30))
    );
  }

  compareAndMarkNew(nodes, old_nodes) {
    // Create a map of ids to node objects for the old_nodes array
    const oldMap = old_nodes.reduce((map, node) => {
      map[node.id] = node;
      return map;
    }, {});

    // Check each node in the nodes array to see if it's new or not
    nodes.forEach((node) => {
      if (!oldMap[node.id]) {
        // Node is new, mark it with the newItem property
        node.newItem = true;
      }
    });

    return nodes;
  }

  _update(_d3, svg, data, element) {
    let { links, nodes } = data;
    this.links = links || [];
    this.nodes = nodes || [];

// Check to see if nodes are in store 
    if ('nodes' in localStorage) {
      // Get old nodes from store
      const oldNodes = JSON.parse(localStorage.getItem('nodes'));
      // Compare and set property for new nodes
      this.nodes = this.compareAndMarkNew(nodes, oldNodes);
      // Remove old nodes from store
      localStorage.removeItem('nodes');
      // Add new nodes to store
      localStorage.setItem('nodes', JSON.stringify(data.nodes));
    } else {
      // Add first set of nodes to store
      localStorage.setItem('nodes', JSON.stringify(data.nodes));
    }

    // Getting parents lineStyle and adding it to child objects
    const relationshipsArray = this.links.map(
      ({ lineStyle, targetArrow, sourceArrow, relationships }) =>
        relationships.map((r) => ({
          parentLineStyle: lineStyle,
          parentSourceArrow: sourceArrow,
          parentTargetArrow: targetArrow,
          ...r,
        }))
    );
    // Adding dy value based on link number and position in parent
    relationshipsArray.map((item, dy) => {
      item.map((tt, i) => {
        tt['dy'] = 20 + i * 15;
      });
    });
    this.links = relationshipsArray.reduce((acc, val) => acc.concat(val), []);

    this.initDefinitions(svg);

    const simulation = this.forceSimulation(_d3, {
      width: +svg.attr('width'),
      height: +svg.attr('height'),
    });

    const zoomContainer = _d3.select('svg g');

    const filteredLine = this.links.filter(
      ({ source, target }, index, self) => {
        // Filter out any objects that have matching source and target property values
        // To display only one line (parentLineStyle) - removes html bloat and a darkened line
        return (
          index ===
          self.findIndex(
            (obj) => obj.source === source && obj.target === target
          )
        );
      }
    );

    const link = zoomContainer.selectAll().data(filteredLine, function (d) {
      return d.id;
    });

    zoomContainer.selectAll('line').data(link).exit().remove();

    const linkEnter = link
      .join('line')
      //  .style('stroke', '#e7e7e7')
      .style('stroke', function (d) {
        if (d.parentLineStyle === 'Confirmed') {
          return '#777';
        } else {
          return '#b4b4b4';
        }
      })
      .style('stroke-opacity', '.6')
      .style('stroke-dasharray', function (d) {
        if (d.parentLineStyle === 'Unconfirmed') {
          return '8,5';
        }
        return null;
      })
      .style('stroke-width', '2px')
      .attr('class', 'link')
      .attr('id', function (d) {
        const suffix = '_line';
        const source = d.source ? d.source : '';
        const target = d.target ? d.target : '';
        return `${source}_${target}${suffix}`;
      })
      .attr('marker-end', function (d) {
        if (d.parentTargetArrow === true) {
          return 'url(#arrowheadTarget)';
        }
        return null;
      })
      .attr('marker-start', function (d) {
        if (d.parentSourceArrow === true) {
          return 'url(#arrowheadSource)';
        }
        return null;
      });

    link.append('title').text(function (d) {
      return d.label;
    });

    const edgepaths = zoomContainer
      .selectAll('.edgepath')
      .data(this.links, function (d) {
        return d.id;
      });

    zoomContainer.selectAll('path').data(edgepaths).exit().remove();
    const edgepathsEnter = edgepaths
      .join('svg:path')
      //.attr('class', 'edgepath')
      .attr('fill-opacity', 0)
      .attr('stroke-opacity', 0)
      .attr('id', function (d, i) {
        return 'edgepath' + i;
      });

    const edgelabels = zoomContainer.selectAll().data(this.links, function (d) {
      return d.id;
    });
    zoomContainer.selectAll('text').data(edgelabels).exit().remove();

    const edgelabelsEnter = edgelabels
      .data(this.links)
      .enter()
      .append('text')
      .attr('class', 'edgelabel')
      .style('text-anchor', 'middle')
      .attr('id', function (d, i) {
        return 'edgelabel' + i;
      })
      .attr('id', function (d) {
        const suffix = '_text';
        const source = d.source ? d.source : '';
        const target = d.target ? d.target : '';
        return `${source}_${target}${suffix}`;
      })
      .attr('font-size', 10)
      .attr('dy', function (d, i) {
        return d.dy;
      });

    svg.selectAll('.edgelabel').on('dblclick', function () {
      const dblClick = d3.select(this).data();
      self.dblClickLinkPayload.next(dblClick);
    });

    edgelabelsEnter
      .append('textPath')
      .attr('xlink:href', function (d, i) {
        return '#edgepath' + i;
      })
      .style('cursor', 'pointer')
      .attr('dominant-baseline', 'bottom')
      .attr('startOffset', '50%')
      .text(function (d, i) {
        return d.label;
      });
    // on normal label link click - hightlight labels
    svg.selectAll('.edgelabel').on('click', function (d) {
      // arrow function will produce this = undefined
      _d3.selectAll('.nodeText').style('fill', 'black');
      _d3.selectAll('.edgelabel').style('fill', '#999');
      _d3.select(this).style('fill', 'blue');
      self.createLinkArray.next([]);
    });

    // on right label link click - hightlight labels and package data for context menu
    svg.selectAll('.edgelabel').on('contextmenu', function (d) {
      self.createLinkArray.next([]);
      _d3.selectAll('.nodeText').style('fill', 'black');
      _d3.selectAll('.edgelabel').style('fill', '#999');
      _d3.select(this).style('fill', 'blue');
      const localSelectedLinkArray = d3.select(this).data();
      self.selectedLinkArray.next(localSelectedLinkArray);
    });

    const node = zoomContainer.selectAll().data(this.nodes, function (d) {
      return d.id;
    });

    zoomContainer.selectAll('g').data(node).exit().remove();

    const nodeEnter = node
      .join('g')
      .call(
        _d3
          .drag()
          .on('start', (d) => this.dragended(_d3, d, simulation))
          .on('drag', function dragged(d) {
            d.fx = _d3.event.x;
            d.fy = _d3.event.y;
          })
          .on('end', (d) => this.dragended(_d3, d, simulation))
      )
      .attr('id', function (d) {
        return d.id;
      })
      .attr('class', function (d) {
        if (d.newItem) {
          return 'newItem node-wrapper';
        }
        return 'node-wrapper';
      });

    // no collision - already using this in statement
    const self = this;

    svg.selectAll('.node-wrapper').on('dblclick', function () {
      const dblClick = d3.select(this).data();
      self.dblClickNodePayload.next(dblClick);
    });

    // node click and ctrl + click
    svg.selectAll('.node-wrapper').on('click', function () {
      // so we don't activate the canvas .click event
      _d3.event.stopPropagation();
      // If ctrl key is held on click
      if (_d3.event.ctrlKey) {
        // toggle the class on and off when ctrl click is active
        d3.select(this).classed(
          'selected',
          !d3.select(this).classed('selected')
        );
        // remove the single click styling on other nodes and labels
        _d3.selectAll('.edgelabel').style('fill', '#999');
        _d3.selectAll('.nodeText').style('fill', 'black');
        // counts number of selected classes to not exceed 2
        const selectedSize = svg.selectAll('.selected').size();

        if (selectedSize <= 2) {
          svg
            .selectAll('.selected')
            .selectAll('.nodeText')
            .style('fill', 'blue');
          // get data from node
          const localCreateLinkArray = _d3.selectAll('.selected').data();
          const filterId = localCreateLinkArray.filter((x) => x);
          self.createLinkArray.next(filterId);
          return filterId;
        }
        return null;
      }
      // remove style from selected node before the class is removed
      _d3.selectAll('.selected').selectAll('.nodeText').style('fill', 'black');
      // remove class when another node is clicked and ctrl is not held
      _d3.selectAll('.selected').classed('selected', false);
      // Remove styles from all other nodes and labels on single left click
      _d3.selectAll('.edgelabel').style('fill', '#999');
      _d3.selectAll('.nodeText').style('fill', 'black');
      // Add style on single left click
      _d3.select(this).select('.nodeText').style('fill', 'blue');
      self.createLinkArray.next([]);

      return null;
    });

    //right click on a node highlights for context menu
    svg.selectAll('.node-wrapper').on('contextmenu', function (d) {
      // Remove styles from all other nodes and labels on single left click
      _d3.selectAll('.edgelabel').style('fill', '#999');
      _d3.selectAll('.nodeText').style('fill', 'black');
      // Add style on single right click
      _d3.select(this).select('.nodeText').style('fill', 'blue');
    });

    //click on canvas to remove selected nodes
    _d3.select('svg').on('click', () => {
      _d3.selectAll('.selected').selectAll('.nodeText').style('fill', 'black');
      _d3.selectAll('.selected').classed('selected', false);
      _d3.selectAll('.nodeText').style('fill', 'black');
      self.createLinkArray.next([]);
    });

    nodeEnter
      .append('image')
      .attr('xlink:href', function (d) {
        const prefixUrl = 'https://github.com/';
        const icon = d.icon ? 'favicon' : d.icon;
        const suffix = 'ico';
        return `${prefixUrl}${icon}.${suffix}`;
      })
      .attr('x', -15)
      .attr('y', -60)
      .attr('class', function (d) {
        const suffix = '_image';
        const id = d.id ? d.id : '';
        return `${id}_${suffix}`;
      })
      .attr('id', function (d) {
        const id = d.id ? d.id : '';
        return `${id}`;
      })
      .attr('width', 16)
      .attr('class', 'image')
      .style('cursor', 'pointer')
      .attr('height', 16);

    const nodeText = nodeEnter
      .append('text')
      .attr('id', 'nodeText')
      .attr('class', 'nodeText')
      .style('text-anchor', 'middle')
      .style('cursor', 'pointer')
      .attr('dy', -3)
      .attr('y', -25)
      .attr('testhook', function (d) {
        const suffix = '_text';
        const id = d.id ? d.id : '';
        return `${id}_${suffix}`;
      });

    nodeText
      .selectAll('tspan')
      .data((d, i) => d.label)
      .enter()
      .append('tspan')
      .attr('class', 'nodeTextTspan')
      .text((d) => d)
      .style('font-size', '12px')
      .attr('x', -10)
      .attr('dx', 10)
      .attr('dy', 15);

// transition effects for new pulsating nodes
      nodeEnter
      .filter('.newItem')
      .select('text')
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('fill-opacity', 1)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('fill-opacity', 0.1)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('fill-opacity', 1)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('fill-opacity', 0.1)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('fill-opacity', 1)
      .transition()
      .duration(1000)
      .attr('fill', 'black')
      .attr('fill-opacity', 1)
      .on('end', function () {
        d3.select(this).call(_d3.transition);
      });

    nodeEnter
      .filter('.newItem')
      .select('image')
      .transition()
      .duration(1000)
      .attr('width', 16 * 2)
      .attr('height', 16 * 2)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('width', 16)
      .attr('height', 16)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('width', 16 * 2)
      .attr('height', 16 * 2)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('width', 16)
      .attr('height', 16)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('width', 16 * 2)
      .attr('height', 16 * 2)
      .transition()
      .duration(1000)
      .attr('fill', 'black')
      .attr('width', 16)
      .attr('height', 16)
      .on('end', function () {
        d3.select(this).call(d3.transition);
      });

    node.append('title').text(function (d) {
      return d.id;
    });

    simulation.nodes(this.nodes).on('tick', () => {
      // console.log(this.nodes)
      this.ticked(linkEnter, nodeEnter, edgepathsEnter);
    });

    simulation.force('link').links(this.links);
  }
}
