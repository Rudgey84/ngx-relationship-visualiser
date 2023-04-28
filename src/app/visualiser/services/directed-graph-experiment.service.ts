import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DirectedGraphExperimentService {
  constructor() {}
  public links = [];
  public nodes = [];
  public gBrush = null;
  public brushMode = false;
  public brushing = false;
  public shiftKey;
  public extent = null;
  public readOnly = false;
  /** RxJS subject to listen for updates of the selection */
  createLinkArray = new Subject<any[]>();
  dblClickNodePayload = new Subject();
  dblClickLinkPayload = new Subject();
  selectedLinkArray = new Subject();

  public update(data, element, readOnly) {
    const svg = d3.select(element);
    this.readOnly = readOnly;
    return this._update(d3, svg, data);
  }

  private ticked(link, node, edgepaths) {
    link.each(function (d, i, n) {
      // Total difference in x and y from source to target
      let diffX = d.target.x - d.source.x;
      let diffY = d.target.y - d.source.y;

      // Length of path from center of source node to center of target node
      let pathLength = Math.sqrt(diffX * diffX + diffY * diffY);

      // x and y distances from center to outside edge of target node
      let offsetX = (diffX * 40) / pathLength;
      let offsetY = (diffY * 40) / pathLength;

      d3.select(n[i])
        .attr('x1', d.source.x + offsetX)
        .attr('y1', d.source.y + offsetY)
        .attr('x2', d.target.x - offsetX)
        .attr('y2', d.target.y - offsetY);
    });

    node.attr('transform', function (d) {
      return `translate(${d.x}, ${d.y + 50})`;
    });

    //  node.attr('cx', function (d) {
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
    return _d3
      .forceSimulation()
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
      .force('charge', _d3.forceManyBody().strength(0.1))
      .force('center', _d3.forceCenter(width / 2, height / 2))
      .force('collision', _d3.forceCollide().radius(15));
  }

  private compareAndMarkNew(nodes, old_nodes) {
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

  private removeNewItem(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].hasOwnProperty('newItem')) {
        delete nodes[i].newItem;
      }
    }
    return nodes;
  }

  private randomiseNodePositions(nodeData, width, height) {
    const minDistance = 100;
    nodeData.forEach((node) => {
      if (node.fx === null && node.fy === null) {
        do {
          node.fx = Math.floor(Math.random() * width);
          node.fy = Math.floor(Math.random() * height);
        } while (
          nodeData.some((otherNode) => {
            if (
              otherNode.fx === null ||
              otherNode.fy === null ||
              otherNode === node
            ) {
              return false;
            }
            const dx = otherNode.fx - node.fx;
            const dy = otherNode.fy - node.fy;
            return Math.sqrt(dx * dx + dy * dy) < minDistance;
          })
        );
      }
    });
    return nodeData;
  }

  private circleNodePositions(nodeData, width, height) {
    const middleX = width / 2;
    const middleY = height / 2;
    const radius = Math.min(middleX, middleY) * 0.8;

    // Get the nodes without existing fx and fy values
    const nodesWithoutPositions = nodeData.filter(
      (node) => node.fx === null && node.fy === null
    );
    const nodeCount = nodesWithoutPositions.length;

    for (let i = 0; i < nodeCount; i++) {
      const node = nodesWithoutPositions[i];
      const angle = (2 * Math.PI * i) / nodeCount;
      node.fx = middleX + radius * Math.cos(angle);
      node.fy = middleY + radius * Math.sin(angle);
    }
    return nodeData;
  }

  _update(_d3, svg, data) {
    let { links, nodes } = data;
    this.links = links || [];
    this.nodes = nodes || [];
    let currentZoom = d3.zoomTransform(d3.select('svg').node());
    let parentWidth = _d3.select('svg').node().parentNode.clientWidth;
    let parentHeight = _d3.select('svg').node().parentNode.clientHeight;
    this.nodes = this.randomiseNodePositions(
      this.nodes,
      parentWidth,
      parentHeight
    );

    // Check to see if nodes are in store
    if ('nodes' in localStorage) {
      // Get old nodes from store
      const oldNodes = JSON.parse(localStorage.getItem('nodes'));
      // Compare and set property for new nodes
      this.nodes = this.compareAndMarkNew(nodes, oldNodes);
      localStorage.setItem('nodes', JSON.stringify([]));
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

    d3.select('svg').append('g');

    const zoomContainer = _d3.select('svg g');

    // Zoom Start

    let zoomed = () => {
      const transform = d3.event.transform;
      zoomContainer.attr(
        'transform',
        `translate(${transform.x}, ${transform.y}) scale(${transform.k})`
      );
      currentZoom = transform;
    };

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 1])
      .on('start', function () {
        d3.select(this).style('cursor', this.readOnly ? null : 'grabbing');
      })
      .on('zoom', zoomed)
      .on('end', function () {
        d3.select(this).style('cursor', 'grab');
      });
    svg
      .call(zoom)
      .style('cursor', 'grab')
      .on(!this.readOnly ? null : 'wheel.zoom', null);
    zoom.filter(() => !d3.event.shiftKey);
    // Zoom button controls
    d3.select('#zoom_in').on('click', function () {
      zoom.scaleBy(svg.transition().duration(750), 1.2);
    });
    d3.select('#zoom_out').on('click', function () {
      zoom.scaleBy(svg.transition().duration(750), 0.8);
    });
    // Zoom End

    // For arrows
    this.initDefinitions(svg);

    const simulation = this.forceSimulation(_d3, {
      width: +svg.attr('width'),
      height: +svg.attr('height'),
    });

    // Brush Start
    let gBrushHolder = svg.append('g');

    let brush = d3
      .brush()
      .on('start', () => {
        this.brushing = true;

        nodeEnter.each((d) => {
          d.previouslySelected = this.shiftKey && d.selected;
        });
      })
      .on('brush', () => {
        this.extent = d3.event.selection;
        if (!d3.event.sourceEvent || !this.extent || !this.brushMode) return;
        if (!currentZoom) return;

        nodeEnter
          .classed('selected', (d) => {
            return (d.selected =
              d.previouslySelected ^
              (<any>(
                (d3.event.selection[0][0] <=
                  d.x * currentZoom.k + currentZoom.x &&
                  d.x * currentZoom.k + currentZoom.x <
                    d3.event.selection[1][0] &&
                  d3.event.selection[0][1] <=
                    d.y * currentZoom.k + currentZoom.y &&
                  d.y * currentZoom.k + currentZoom.y <
                    d3.event.selection[1][1])
              )));
          })
          .select('.nodeText')
          .classed('selected', (d) => d.selected)
          // .style('fill', (d) => (d.selected ? 'red' : null))
          // .style('font-weight', (d) => (d.selected ? 700 : null));
          .style('fill', (d) => (d.selected ? 'blue' : '#999'))
          .style('font-weight', (d) => (d.selected ? 700 : 400));

        this.extent = d3.event.selection;
      })
      .on('end', () => {
        if (!d3.event.sourceEvent || !this.extent || !this.gBrush) return;

        this.gBrush.call(brush.move, null);
        if (!this.brushMode) {
          // the s key has been release before we ended our brushing
          this.gBrush.remove();
          this.gBrush = null;
        }
        this.brushing = false;

        nodeEnter
          .select('.nodeText')
          .filter(function () {
            return !d3.select(this.parentNode).classed('selected');
          })
          .style('fill', '#212529')
          .style('font-weight', 400);
      });

    let keyup = () => {
      this.shiftKey = false;
      this.brushMode = false;
      if (this.gBrush && !this.brushing) {
        // only remove the brush if we're not actively brushing
        // otherwise it'll be removed when the brushing ends
        this.gBrush.remove();
        this.gBrush = null;
      }
    };

    let keydown = () => {
      // Allows us to turn off default listeners for keyModifiers(shift)
      brush.filter(() => d3.event.shiftKey);
      brush.keyModifiers(false);
      // holding S key
      if (d3.event.keyCode === 16) {
        this.shiftKey = true;

        if (!this.gBrush) {
          this.brushMode = true;
          this.gBrush = gBrushHolder.append('g').attr('class', 'brush');
          this.gBrush.call(brush);
        }
      }
    };

    d3.select('body').on('keydown', keydown).on('keyup', keyup);
    // Brush End

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
      _d3.selectAll('.nodeText').style('fill', '#212529');
      _d3.selectAll('.nodeText').style('font-weight', 400);
      _d3.selectAll('.edgelabel').style('fill', '#212529');
      _d3.select(this).style('fill', 'blue');
      self.createLinkArray.next([]);
    });

    // on right label link click - hightlight labels and package data for context menu
    svg.selectAll('.edgelabel').on('contextmenu', function (d) {
      self.createLinkArray.next([]);
      _d3.selectAll('.nodeText').style('fill', '#212529');
      _d3.selectAll('.nodeText').style('font-weight', 400);
      _d3.selectAll('.edgelabel').style('fill', '#212529');
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
          .on('start', function dragstarted(d) {
            if (!_d3.event.active) simulation.alphaTarget(0.9).restart();

            if (!d.selected && !this.shiftKey) {
              // if this node isn't selected, then we have to unselect every other node
              nodeEnter.classed('selected', function (p) {
                return (p.selected = p.previouslySelected = false);
              });
            }

            _d3.select(this).classed('selected', function (p) {
              d.previouslySelected = d.selected;
              return (d.selected = true);
            });

            nodeEnter
              .filter(function (d) {
                return d.selected;
              })
              .each(function (d) {
                //d.fixed |= 2;

                d.fx = d.x;
                d.fy = d.y;
              });
          })
          .on('drag', function dragged(d) {
            //d.fx = d3v4.event.x;
            //d.fy = d3v4.event.y;
            nodeEnter
              .filter(function (d) {
                return d.selected;
              })
              .each(function (d) {
                d.fx += _d3.event.dx;
                d.fy += _d3.event.dy;
              });
          })
          .on('end', function dragended(d) {
            if (!_d3.event.active) {
              simulation.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
          })
      )
      .attr('id', function (d) {
        return d.id;
      })
      .attr('class', 'node-wrapper');

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
        _d3.selectAll('.edgelabel').style('fill', '#212529');
        _d3.selectAll('.nodeText').style('font-weight', 400);
        _d3.selectAll('.nodeText').style('fill', '#212529');
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
      _d3
        .selectAll('.selected')
        .selectAll('.nodeText')
        .style('fill', '#212529');
      // remove class when another node is clicked and ctrl is not held
      _d3.selectAll('.selected').classed('selected', false);
      // Remove styles from all other nodes and labels on single left click
      _d3.selectAll('.edgelabel').style('fill', '#212529');
      _d3.selectAll('.nodeText').style('fill', '#212529');
      _d3.selectAll('.nodeText').style('font-weight', 400);
      // Add style on single left click
      _d3.select(this).select('.nodeText').style('fill', 'blue');
      self.createLinkArray.next([]);

      return null;
    });

    //right click on a node highlights for context menu
    svg.selectAll('.node-wrapper').on('contextmenu', function (d) {
      // Remove styles from all other nodes and labels on single left click
      _d3.selectAll('.edgelabel').style('fill', '#212529');
      _d3.selectAll('.nodeText').style('fill', '#212529');
      _d3.selectAll('.nodeText').style('font-weight', 400);
      // Add style on single right click
      _d3.select(this).select('.nodeText').style('fill', 'blue');
    });

    //click on canvas to remove selected nodes
    _d3.select('svg').on('click', () => {
      nodeEnter.each(function (d) {
        d.selected = false;
        d.previouslySelected = false;
      });
      node.classed('selected', false);
      _d3
        .selectAll('.selected')
        .selectAll('.nodeText')
        .style('fill', '#212529');
      _d3.selectAll('.selected').classed('selected', false);
      _d3.selectAll('.nodeText').style('fill', '#212529');
      _d3.selectAll('.nodeText').style('font-weight', 400);
      self.createLinkArray.next([]);
    });

    nodeEnter
      .append('image')
      .attr('xlink:href', function (d) {
        const prefixUrl = 'https://randomuser.me/api/portraits/thumb/';
        const typeName = d.typeName + '/';
        const icon = d.icon;
        const suffix = 'jpg';
        return `${prefixUrl}${typeName}${icon}.${suffix}`;
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
      .attr('width', 30)
      .attr('class', 'image')
      .style('cursor', 'pointer')
      .attr('height', 30);

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
      .filter(function (d) {
        if (!d.newItem) {
          return null;
        }
        return true;
      })
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
      .attr('fill', '#212529')
      .attr('fill-opacity', 1)
      .on('end', function () {
        d3.select(this).call(_d3.transition);
      });

    nodeEnter
      .filter(function (d) {
        if (!d.newItem) {
          return null;
        }
        return true;
      })
      .select('image')
      .transition()
      .duration(1000)
      .attr('width', 15 * 2)
      .attr('height', 15 * 2)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('width', 15)
      .attr('height', 15)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('width', 15 * 2)
      .attr('height', 15 * 2)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('width', 15)
      .attr('height', 15)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('width', 15 * 2)
      .attr('height', 15 * 2)
      .transition()
      .duration(1000)
      .attr('fill', '#212529')
      .attr('width', 30)
      .attr('height', 30)
      .on('end', function () {
        d3.select(this).call(d3.transition);
      });

    // Remove the newClass so they don't animate next time
    this.nodes = this.removeNewItem(this.nodes);

    node.append('title').text(function (d) {
      return d.id;
    });

    simulation.nodes(this.nodes).on('tick', () => {
      this.ticked(linkEnter, nodeEnter, edgepathsEnter);
    });

    simulation.force('link').links(this.links);
  }
}
