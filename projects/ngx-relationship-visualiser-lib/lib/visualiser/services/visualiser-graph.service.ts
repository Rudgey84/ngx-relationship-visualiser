import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ReplaySubject } from 'rxjs';
import { DexieService } from '../../db/graphDatabase';

@Injectable({
  providedIn: 'root',
})
export class VisualiserGraphService {
  constructor(private dexieService: DexieService) { }
  public links = [];
  public nodes = [];
  public gBrush = null;
  public brushMode = false;
  public brushing = false;
  public shiftKey;
  public extent = null;
  public zoom = false;
  public zoomToFit = false;
  public saveGraphData = new ReplaySubject();

  public update(data, element, zoom, zoomToFit) {
    const svg = d3.select(element);
    this.zoom = zoom;
    this.zoomToFit = zoomToFit;
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

    // Sets a boundry for the nodes
    // node.attr('cx', function (d) {
    //   return (d.x = Math.max(40, Math.min(900 - 15, d.x)));
    // });
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

  private compareAndMarkNodesNew(nodes, old_nodes) {
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
        // Remove the dagre coordinates from new nodes so we can set a random one in view
        node.fx = null;
        node.fy = null;
      }
    });

    return nodes;
  }

  private removeNewItem(nodes) {
    for (const node of nodes) {
      if (node.hasOwnProperty('newItem')) {
        delete node.newItem;
      }
    }
    return nodes;
  }

  private randomiseNodePositions(nodeData, width, height) {
    let minDistance = 100;
    const availableSpace = width * height;
    let adjustedRequiredSpace = nodeData.length * minDistance * minDistance;

    if (adjustedRequiredSpace > availableSpace) {
      while (adjustedRequiredSpace > availableSpace && minDistance > 0) {
        minDistance -= 10;
        adjustedRequiredSpace = nodeData.length * minDistance * minDistance;
      }

      if (adjustedRequiredSpace > availableSpace) {
        throw new Error(
          'Not enough space to accommodate all nodes without a fixed position.'
        );
      }
    }

    nodeData.forEach((node) => {
      if (node.fx === null && node.fy === null) {
        let currentMinDistance = minDistance;
        let canPlaceNode = false;

        while (!canPlaceNode && currentMinDistance > 0) {
          node.fx = crypto.getRandomValues(new Uint32Array(1))[0] % width;
          node.fy = crypto.getRandomValues(new Uint32Array(1))[0] % height;

          canPlaceNode = !nodeData.some((otherNode) => {
            if (
              otherNode.fx === null ||
              otherNode.fy === null ||
              otherNode === node
            ) {
              return false;
            }

            const dx = otherNode.fx - node.fx;
            const dy = otherNode.fy - node.fy;
            return Math.sqrt(dx * dx + dy * dy) < currentMinDistance;
          });

          if (!canPlaceNode) {
            currentMinDistance--;
          }
        }

        if (!canPlaceNode) {
          throw new Error(
            'Not enough space to accommodate all nodes without a fixed position.'
          );
        }
      }
    });

    return nodeData;
  }

  public async _update(_d3, svg, data) {
    const { nodes, links } = data;
    this.nodes = nodes || [];
    this.links = links || [];

    // Disable the reset btn

    let saveBtn = document.getElementById('save_graph');
    saveBtn.setAttribute('disabled', 'true');
    // Width/Height of canvas
    const parentWidth = _d3.select('svg').node().parentNode.clientWidth;
    const parentHeight = _d3.select('svg').node().parentNode.clientHeight;

    // Check to see if nodes are in Dexie
    const oldData = await this.dexieService.getGraphData('nodes');
    const oldNodes = oldData ? oldData.nodes : [];
    if (Array.isArray(oldNodes)) {
      // Compare and set property for new nodes
      this.nodes = this.compareAndMarkNodesNew(nodes, oldNodes);
      // Remove old nodes from Dexie
      await this.dexieService.deleteGraphData('nodes');
      // Add new nodes to Dexie
      await this.dexieService.saveGraphData({ dataId: 'nodes', nodes: data.nodes, links: data.links });
    } else {
      // Add first set of nodes to Dexie
      await this.dexieService.saveGraphData({ dataId: 'nodes', nodes: data.nodes, links: data.links });
    }

    // If nodes don't have a fx/fy coordinate we generate a random one - dagre nodes without links and new nodes added to canvas have null coordinates by design
    this.nodes = this.randomiseNodePositions(
      this.nodes,
      parentWidth,
      parentHeight
    );

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
    relationshipsArray.map((linkRelationship) => {
      linkRelationship.map((linkObject, i) => {
        // dy increments of 15px
        linkObject['dy'] = 20 + i * 15;
      });
    });

    // IE11 does not like .flat
    this.links = relationshipsArray.reduce((acc, val) => acc.concat(val), []);

    d3.select('svg').append('g');

    // Zoom Start
    const zoomContainer = _d3.select('svg g');
    let currentZoom = d3.zoomTransform(d3.select('svg').node());
    const updateZoomLevel = () => {
      const currentScale = currentZoom.k;
      const maxScale = zoom.scaleExtent()[1];
      const zoomPercentage = ((currentScale - 0.5) / (maxScale - 0.5)) * 200;
      const zoomLevelDisplay = document.getElementById('zoom_level');
      const zoomLevelText = `Zoom: ${zoomPercentage.toFixed(0)}%`;
      const zoomInBtn = document.getElementById('zoom_in');
      const zoomOutBtn = document.getElementById('zoom_out');
      const zoomResetBtn = document.getElementById('zoom_reset');

      // It might not exist depending on the this.zoom boolean
      if (zoomResetBtn) {
        zoomResetBtn.setAttribute('disabled', 'true');
      }
      // Check if the zoom level has changed before updating the display / allows for panning without showing the zoom percentage
      if (zoomLevelDisplay && zoomLevelDisplay.innerHTML !== zoomLevelText) {
        zoomLevelDisplay.innerHTML = zoomLevelText;
        zoomLevelDisplay.style.opacity = '1';
        setTimeout(() => {
          if (zoomLevelDisplay) {
            zoomLevelDisplay.style.opacity = '0';
          }
        }, 2000);
      }
      // Disable the zoomInBtn if the zoom level is at 200%
      if (zoomInBtn) {
        if (zoomPercentage === 200) {
          zoomInBtn.setAttribute('disabled', 'true');
        } else {
          zoomInBtn.removeAttribute('disabled');
        }
      }
      // Disable the zoomOutBtn if the zoom level is at 0%
      if (zoomOutBtn) {
        if (zoomPercentage === 0) {
          zoomOutBtn.setAttribute('disabled', 'true');
        } else {
          zoomOutBtn.removeAttribute('disabled');
        }
      }
      // Disable the zoomResetBtn if the zoom level is at 100%
      if (zoomResetBtn) {
        if (zoomPercentage === 100) {
          zoomResetBtn.setAttribute('disabled', 'true');
        } else {
          zoomResetBtn.removeAttribute('disabled');
        }
      }
    };
    let zoomedInit;
    const zoomed = () => {
      const transform = d3.event.transform;
      zoomContainer.attr(
        'transform',
        `translate(${transform.x}, ${transform.y}) scale(${transform.k})`
      );
      currentZoom = transform;
      zoomedInit = true;
      updateZoomLevel();
    };

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 1.5])
      .on('start', function () {
        d3.select(this).style('cursor', this.zoom ? null : 'grabbing');
      })
      .on('zoom', this.zoom ? zoomed : null)
      .on('end', function () {
        d3.select(this).style('cursor', 'grab');
      });
    svg
      .call(zoom)
      .style('cursor', 'grab')
      .on(this.zoom ? null : 'wheel.zoom', null)
      .on('dblclick.zoom', null);
    zoom.filter(() => !d3.event.shiftKey);

    // Zoom button controls
    d3.select('#zoom_in').on('click', function () {
      zoom.scaleBy(svg.transition().duration(750), 1.2);
      updateZoomLevel();
    });
    d3.select('#zoom_out').on('click', function () {
      zoom.scaleBy(svg.transition().duration(750), 0.8);
      updateZoomLevel();
    });
    d3.select('#zoom_reset').on('click', function () {
      zoom.scaleTo(svg.transition().duration(750), 1);
      updateZoomLevel();
    });
    // Zoom to fit function and Button
    const handleZoomToFit = () => {
      const nodeBBox = zoomContainer.node().getBBox();

      // Calculate scale and translate values to fit all nodes
      const padding = 30;
      const scaleX = (parentWidth - padding * 2) / nodeBBox.width;
      const scaleY = (parentHeight - padding * 2) / nodeBBox.height;
      const scale = Math.min(scaleX, scaleY, 1.0); // Restrict scale to a maximum of 1.0

      const translateX =
        -nodeBBox.x * scale + (parentWidth - nodeBBox.width * scale) / 2;
      const translateY =
        -nodeBBox.y * scale + (parentHeight - nodeBBox.height * scale) / 2;

      // Get the bounding box of all nodes
      const allNodes = zoomContainer.selectAll('.node-wrapper');
      const allNodesBBox = allNodes.nodes().reduce(
        (acc, node) => {
          const nodeBBox = node.getBBox();
          acc.x = Math.min(acc.x, nodeBBox.x);
          acc.y = Math.min(acc.y, nodeBBox.y);
          acc.width = Math.max(acc.width, nodeBBox.x + nodeBBox.width);
          acc.height = Math.max(acc.height, nodeBBox.y + nodeBBox.height);
          return acc;
        },
        { x: Infinity, y: Infinity, width: -Infinity, height: -Infinity }
      );

      // Check if all nodes are within the viewable container
      if (
        allNodesBBox.x * scale >= 0 &&
        allNodesBBox.y * scale >= 0 &&
        allNodesBBox.width * scale <= parentWidth &&
        allNodesBBox.height * scale <= parentHeight
      ) {
        // All nodes are within the viewable container, no need to apply zoom transform
        return;
      }

      // Manually reset the zoom transform
      zoomContainer
        .transition()
        .duration(750)
        .attr('transform', 'translate(0, 0) scale(1)');

      // Apply zoom transform to zoomContainer
      zoomContainer
        .transition()
        .duration(750)
        .attr(
          'transform',
          `translate(${translateX}, ${translateY}) scale(${scale})`
        );

      // Update the currentZoom variable with the new transform
      // zoomedInit - created because if zoomToFit is called before anything else it screws up the base transform - e.g. showCurrentMatch
      if (zoomedInit) {
        currentZoom.x = translateX;
        currentZoom.y = translateY;
        currentZoom.k = scale;
      }
      updateZoomLevel();
    };

    d3.select('#zoom_to_fit').on('click', handleZoomToFit);

    // Check if zoom level is at 0% or 100% before allowing mousewheel zoom - this stabilises the canvas when the limit is reached
    svg.on('wheel', () => {
      const currentScale = currentZoom.k;
      const maxScale = zoom.scaleExtent()[1];
      const minScale = zoom.scaleExtent()[0];
      if (currentScale === maxScale || currentScale === minScale) {
        d3.event.preventDefault();
      }
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

        _d3
          .selectAll('.edgelabel')
          .style('font-weight', 400)
          .style('fill', '#212529');

        // Apply styling for the rect.selection
        d3.selectAll('rect.selection')
          .style('stroke', 'none')
          .style('fill', 'steelblue')
          .style('fill-opacity', 0.4);
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
          .style('fill', (d) => (d.selected ? 'blue' : '#999'))
          .style('font-weight', (d) => (d.selected ? 700 : 400));

        this.extent = d3.event.selection;
      })
      .on('end', () => {
        if (!d3.event.sourceEvent || !this.extent || !this.gBrush) return;

        this.gBrush.call(brush.move, null);
        if (!this.brushMode) {
          // the shift key has been release before we ended our brushing
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
      // holding shift key
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
      ({ source, target }, index, linksArray) => {
        // Filter out any objects that have matching source and target property values
        // To display only one line (parentLineStyle) - removes html bloat and a darkened line
        return (
          index ===
          linksArray.findIndex(
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
        if (d.parentLineStyle === 'Solid') {
          return '#777';
        } else {
          return '#b4b4b4';
        }
      })
      .style('stroke-opacity', '.6')
      .style('stroke-dasharray', function (d) {
        if (d.parentLineStyle === 'Dotted') {
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

    const edgepaths = zoomContainer.selectAll().data(this.links, function (d) {
      return d.id;
    });

    zoomContainer.selectAll('path').data(edgepaths).exit().remove();

    const edgepathsEnter = edgepaths
      .join('svg:path')
      .attr('class', 'edgepath')
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
      .enter()
      .append('text')
      .attr('class', 'edgelabel')
      .attr('id', function (d) {
        const suffix = '_text';
        const source = d.source ? d.source : '';
        const target = d.target ? d.target : '';
        return `${source}_${target}${suffix}`;
      })
      .style('text-anchor', 'middle')
      .attr('font-size', 14)
      .attr('dy', function (d) {
        return d.dy;
      });


    edgelabelsEnter
      .append('textPath')
      .attr('xlink:href', function (d, i) {
        return '#edgepath' + i;
      })
      .style('cursor', 'pointer')
      .attr('dominant-baseline', 'bottom')
      .attr('startOffset', '50%')
      .text(function (d) {
        return d.label;
      });

    edgelabelsEnter
      .selectAll('textPath')
      .filter(function (d) {
        return d.linkIcon;
      })
      .append('tspan')
      .style('fill', '#856404')
      .style('font-weight', '700')
      .attr('class', 'fa')
      .text(' \uf0c1');
    // on normal label link click - highlight labels
    svg.selectAll('.edgelabel').on('click', function (d) {
      _d3.event.stopPropagation();
      nodeEnter.each(function (d) {
        d.selected = false;
        d.previouslySelected = false;
      });
      node.classed('selected', false);
      _d3
        .selectAll('.nodeText')
        .style('fill', '#212529')
        .style('font-weight', 400);
      _d3
        .selectAll('.edgelabel')
        .style('font-weight', 400)
        .style('fill', '#212529');
      _d3.select(this).style('fill', 'blue').style('font-weight', 700);
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
            // Enable the save & reset btn
            document.getElementById('save_graph').removeAttribute('disabled');

            if (!_d3.event.active) simulation.alphaTarget(0.9).restart();

            if (!d.selected && !this.shiftKey) {
              // if this node isn't selected, then we have to unselect every other node
              nodeEnter.classed('selected', function (p) {
                return (p.selected = p.previouslySelected = false);
              });
              // remove the selected styling on other nodes and labels when we drag a non-selected node
              _d3
                .selectAll('.edgelabel')
                .style('fill', '#212529')
                .style('font-weight', 400);
              _d3
                .selectAll('.nodeText')
                .style('font-weight', 400)
                .style('fill', '#212529');
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
                d.fx = d.x;
                d.fy = d.y;
              });
          })
          .on('drag', function dragged(d) {
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
            // Subscribes to updated graph positions for save
            self.saveGraphData.next(data);
          })
      )
      .attr('class', 'node-wrapper')
      .attr('id', function (d) {
        return d.id;
      });

    // no collision - already using this in statement
    const self = this;

    // node click and ctrl + click
    svg.selectAll('.node-wrapper').on('click', function (d) {
      // so we don't activate the canvas .click event
      _d3.event.stopPropagation();

      // setting the select attribute to the object on single select so we can drag them
      d.selected = true;

      svg.selectAll('.node-wrapper').classed('selected', false);
      d3.select(this).classed('selected', true);
      nodeEnter.each(function (d) {
        d.selected = false;
        d.previouslySelected = false;
      });

      // remove style from selected node before the class is removed
      _d3
        .selectAll('.selected')
        .selectAll('.nodeText')
        .style('fill', '#212529');
      // Remove styles from all other nodes and labels on single left click
      _d3.selectAll('.edgelabel').style('fill', '#212529');
      _d3
        .selectAll('.nodeText')
        .style('fill', '#212529')
        .style('font-weight', 400);
      // Add style on single left click
      _d3
        .select(this)
        .select('.nodeText')
        .style('fill', 'blue')
        .style('font-weight', 700);

      return null;
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
        .style('fill', '#212529')
        .style('font-weight', 400);
      _d3.selectAll('.selected').classed('selected', false);
      _d3
        .selectAll('.edgelabel')
        .style('fill', '#212529')
        .style('font-weight', 400);
    });

    nodeEnter
      .filter(function (d) {
        if (!d.imageUrl || d.imageUrl === '') {
          return null;
        }
        return true;
      })
      .append('image')
      .attr('xlink:href', function (d) {
        return d.imageUrl;
      })
      .attr('x', -15)
      .attr('y', -60)
      .attr('class', function (d) {
        const suffix = 'image';
        const id = d.id ? d.id : '';
        return `${id}_${suffix}`;
      })
      .attr('id', function (d) {
        const id = d.id ? d.id : '';
        return `${id}`;
      })
      .attr('width', 32)
      .attr('height', 32)
      .attr('class', 'image')
      .style('cursor', 'pointer');

    nodeEnter
      .filter(function (d) {
        if (!d.icon || d.icon === '') {
          return null;
        }
        return true;
      })
      .append('text')
      .text(function (d) {
        return d.icon;
      })
      .attr('x', -18)
      .attr('y', -30)
      .attr('class', function (d) {
        const suffix = 'icon';
        const id = d.id ? d.id : '';
        return `${id}_${suffix} fa`;
      })
      .attr('id', function (d) {
        const id = d.id ? d.id : '';
        return `${id}`;
      })
      .style('font-size', '35px')
      .style('cursor', 'pointer');

    const nodeText = nodeEnter
      .append('text')
      .attr('id', 'nodeText')
      .attr('class', 'nodeText')
      .style('text-anchor', 'middle')
      .style('cursor', 'pointer')
      .attr('dy', -3)
      .attr('y', -25)
      .attr('testhook', function (d) {
        const suffix = 'text';
        const id = d.id ? d.id : '';
        return `${id}_${suffix}`;
      });

    nodeText
      .selectAll('tspan.text')
      .data((d) => d.label)
      .enter()
      .append('tspan')
      .attr('class', 'nodeTextTspan')
      .text((d) => d)
      .style('font-size', '14px')
      .attr('x', -10)
      .attr('dx', 10)
      .attr('dy', 15);

    nodeEnter
      .filter(function (d) {
        if (!d.additionalIcon) {
          return null;
        }
        return true;
      })
      .append('text')
      .attr('id', function (d) {
        const suffix = 'additionalIcon';
        const id = d.id ? d.id : '';
        return `${id}_${suffix}`;
      })
      .attr('width', 100)
      .attr('height', 25)
      .attr('x', 30)
      .attr('y', -50)
      .attr('class', 'fa')
      .style('fill', '#856404')
      .text(function (d) {
        return d.additionalIcon;
      });

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
      .attr('font-weight', 700)
      .attr('fill-opacity', 1)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('font-weight', 700)
      .attr('fill-opacity', 0.1)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('font-weight', 700)
      .attr('fill-opacity', 1)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('font-weight', 700)
      .attr('fill-opacity', 0.1)
      .transition()
      .duration(1000)
      .attr('fill', 'blue')
      .attr('font-weight', 700)
      .attr('fill-opacity', 1)
      .transition()
      .duration(1000)
      .attr('fill', '#212529')
      .attr('font-weight', 400)
      .attr('fill-opacity', 1)
      .on('end', function () {
        return d3.select(this).call(_d3.transition);
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
      .attr('width', 45)
      .attr('height', 45)
      .transition()
      .duration(1000)
      .attr('width', 32)
      .attr('height', 32)
      .transition()
      .duration(1000)
      .attr('width', 45)
      .attr('height', 45)
      .transition()
      .duration(1000)
      .attr('width', 32)
      .attr('height', 32)
      .transition()
      .duration(1000)
      .attr('width', 45)
      .attr('height', 45)
      .transition()
      .duration(1000)
      .attr('width', 32)
      .attr('height', 32)
      .on('end', function () {
        return d3.select(this).call(d3.transition);
      });

    // Remove the newClass so they don't animate next time
    this.nodes = this.removeNewItem(this.nodes);

    nodeEnter.append('title').text(function (d) {
      return d.label;
    });

    const maxTicks = 30;
    let tickCount = 0;
    let zoomToFitCalled = false;

    simulation.nodes(this.nodes).on('tick', () => {
      if (this.zoomToFit && tickCount >= maxTicks && !zoomToFitCalled) {
        simulation.stop();
        handleZoomToFit();
        zoomToFitCalled = true;
      } else {
        this.ticked(linkEnter, nodeEnter, edgepathsEnter);
        tickCount++;
      }
    });

    simulation.force('link').links(this.links);
    self.saveGraphData.next(data);
  }

  public resetGraph(initialData, element, zoom, zoomToFit) {
    // Reset the data to its initial state
    this.nodes = [];
    this.links = [];
    // Call the update method again to re-simulate the graph with the new data
    this.update(initialData, element, zoom, zoomToFit);
  }
}
