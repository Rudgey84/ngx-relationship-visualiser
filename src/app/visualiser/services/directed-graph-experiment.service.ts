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
  public zoom = false;
  public zoomToFit = false;

  /** RxJS subject to listen for updates of the selection */
  selectedNodesArray = new Subject<any[]>();
  dblClickNodePayload = new Subject();
  dblClickLinkPayload = new Subject();
  selectedLinkArray = new Subject();

  public update(data, element, zoom, zoomToFit) {
    const svg = d3.select(element);
    this.zoom = zoom;
    this.zoomToFit = zoomToFit
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
      .force('collision', _d3.forceCollide().radius(15))
      
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

  public _update(_d3, svg, data) {
    const { nodes, links } = data;
    this.nodes = nodes || [];
    this.links = links || [];

    // Width/Height of canvas
    const parentWidth = _d3.select('svg').node().parentNode.clientWidth;
    const parentHeight = _d3.select('svg').node().parentNode.clientHeight;
    // If nodes don't have a fx/fy coordinate we generate a random one
    this.nodes = this.randomiseNodePositions(this.nodes, parentWidth, parentHeight);

    // Check to see if nodes are in store
    if ('nodes' in localStorage) {
      // Get old nodes from store
      const oldNodes = JSON.parse(localStorage.getItem('nodes'));
      // Compare and set property for new nodes
      this.nodes = this.compareAndMarkNodesNew(nodes, oldNodes);
      // Empties old nodes from store
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
    const relationshipsArray = this.links.map(({ lineStyle, targetArrow, sourceArrow, relationships }) =>
        relationships.map(r => ({
          parentLineStyle: lineStyle,
          parentSourceArrow: sourceArrow,
          parentTargetArrow: targetArrow,
          ...r
        }))
    );

    // Adding dy value based on link number and position in parent
    relationshipsArray.map(linkRelationship => {
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

    const zoomed = () => {
      const transform = d3.event.transform;
      zoomContainer.attr('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);
      currentZoom = transform;
      updateZoomLevel();
    };

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 1.5])
      .on('start', function () {
        d3.select(this).style('cursor', this.zoom ? null : 'grabbing');
      })
      .on('zoom', zoomed)
      .on('end', function () {
        d3.select(this).style('cursor', 'grab');
      });
    svg.call(zoom)
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
      const scale = Math.min(scaleX, scaleY);
    
      const translateX = -nodeBBox.x * scale + (parentWidth - nodeBBox.width * scale) / 2;
      const translateY = -nodeBBox.y * scale + (parentHeight - nodeBBox.height * scale) / 2;
    
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
      zoomContainer.transition().duration(750).attr('transform', 'translate(0, 0) scale(1)');
    
      // Apply zoom transform to zoomContainer
      zoomContainer.transition().duration(750).attr('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
    
      // Update the currentZoom variable with the new transform
      currentZoom.x = translateX;
      currentZoom.y = translateY;
      currentZoom.k = scale;
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
    // Selection buttons
    const selectAllNodes = document.getElementById('select_all');
    const handleSelectAllNodes = () => {

    const totalSize = nodeEnter.size();
    const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
    const count = nonSelectedNodes.size();
    const notSelectedSize = totalSize - count;

   if (notSelectedSize !== totalSize) {
     selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
     selectAllNodes.style.opacity = '0.65';
     _d3.selectAll('.node-wrapper').classed('selected', function (p) {
       p.previouslySelected = p.selected;
       return (p.selected = true);
     });
     d3.selectAll('.nodeText')
     .style('fill', d => (d.selected ? 'blue' : '#999'))
     .style('font-weight', d => (d.selected ? 700 : 400));
   } else {
     selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
     selectAllNodes.style.opacity = '1';
     _d3.selectAll('.node-wrapper').classed('selected', false);
     _d3.selectAll('.node-wrapper').classed('selected', function (p) {
       return (p.selected = p.previouslySelected = false);
     });
     _d3.selectAll('.nodeText').style('font-weight', 400).style('fill', '#212529');
      }
    };
    d3.select('#select_all').on('click', handleSelectAllNodes);

    const handleToggleSelection = () => {
      const totalSize = nodeEnter.size();
      const selectedNodes = d3.selectAll('.node-wrapper.selected');
      const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
      const selectedCount = selectedNodes.size();
      const nonSelectedCount = nonSelectedNodes.size();
    
      if (selectedCount > 0) {
        // Deselect selected nodes and select non-selected nodes
        selectedNodes.classed('selected', function (p) {
          p.previouslySelected = p.selected;
          return (p.selected = false);
        });
    
        nonSelectedNodes.classed('selected', function (p) {
          p.previouslySelected = p.selected;
          return (p.selected = true);
        });
    
        // Update styles of node elements
        _d3.selectAll('.nodeText')
          .style('fill', d => (d.selected ? 'blue' : '#212529'))
          .style('font-weight', d => (d.selected ? 700 : 400));
      } else if (nonSelectedCount > 0) {
        // Select all nodes if none are selected
        _d3.selectAll('.node-wrapper').classed('selected', function (p) {
          p.previouslySelected = p.selected;
          return (p.selected = true);
        });
    
        // Update styles of node elements
        _d3.selectAll('.nodeText').style('font-weight', 700).style('fill', 'blue');
        _d3.selectAll('.edgelabel').style('font-weight', 400).style('fill', '#212529');
      }
    
      // Update the state of another button based on the current selection
      const updatedSelectedCount = selectedCount > 0 ? totalSize - selectedCount : totalSize;
      if (updatedSelectedCount === totalSize) {
        // Update the state of another button if all nodes are selected
        selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
        selectAllNodes.style.opacity = '0.65';
      } else {
        // Update the state of another button if not all nodes are selected
        selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
        selectAllNodes.style.opacity = '1';
      }
    };
    
    d3.select('#toggle_selection').on('click', handleToggleSelection);

    // For arrows
    this.initDefinitions(svg);

    const simulation = this.forceSimulation(_d3, {
      width: +svg.attr('width'),
      height: +svg.attr('height')
    });

    // Brush Start
    let gBrushHolder = svg.append('g');

    let brush = d3
      .brush()
      .on('start', () => {
        this.brushing = true;

        nodeEnter.each(d => {
          d.previouslySelected = this.shiftKey && d.selected;
        });

        _d3.selectAll('.edgelabel').style('font-weight', 400).style('fill', '#212529');
      })
      .on('brush', () => {
        this.extent = d3.event.selection;
        if (!d3.event.sourceEvent || !this.extent || !this.brushMode) return;
        if (!currentZoom) return;

        nodeEnter
        .classed('selected', d => {
          return (d.selected =
            d.previouslySelected ^
            (<any>(
              (d3.event.selection[0][0] <= d.x * currentZoom.k + currentZoom.x &&
                d.x * currentZoom.k + currentZoom.x < d3.event.selection[1][0] &&
                d3.event.selection[0][1] <= d.y * currentZoom.k + currentZoom.y &&
                d.y * currentZoom.k + currentZoom.y < d3.event.selection[1][1])
            )));
        })
          .select('.nodeText')
          .classed('selected', d => d.selected)
          .style('fill', d => (d.selected ? 'blue' : '#999'))
          .style('font-weight', d => (d.selected ? 700 : 400));

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

          const totalSize = nodeEnter.size();
          const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
          const count = nonSelectedNodes.size();
          const notSelectedSize = totalSize - count;

          if (notSelectedSize === totalSize){
            selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
            selectAllNodes.style.opacity = '0.65';
          } else {
            selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
            selectAllNodes.style.opacity = '1';
          }

        // counts number of selected classes to not exceed 2
        const selectedSize = nodeEnter.selectAll('.selected').size();
        if (selectedSize <= 2) {
          // get data from node
          const localselectedNodesArray = nodeEnter.selectAll('.selected').data();
          const filterId = localselectedNodesArray.filter(x => x);
          self.selectedNodesArray.next(filterId);
          return filterId;
        } else {
          self.selectedNodesArray.next([]);
        }
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

    const filteredLine = this.links.filter(({ source, target }, index, linksArray) => {
        // Filter out any objects that have matching source and target property values
        // To display only one line (parentLineStyle) - removes html bloat and a darkened line
        return index === linksArray.findIndex(obj => obj.source === source && obj.target === target);
      });

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
			.text(function (d) {
				return d.label;
			});

		edgelabelsEnter
			.selectAll('textPath')
			.filter(function (d) {
				return d.attachedToUnauthorisedIRs;
			})
			.append('tspan')
			.style('fill', '#856404')
			.style('font-weight', '700')
			.text(' (U)');

    // on normal label link click - hightlight labels
    svg.selectAll('.edgelabel').on('click', function (d) {
      _d3.event.stopPropagation();
      // arrow function will produce this = undefined
      _d3.selectAll('.nodeText').style('fill', '#212529').style('font-weight', 400);
      _d3.selectAll('.edgelabel').style('font-weight', 400).style('fill', '#212529');
      _d3.select(this).style('fill', 'blue').style('font-weight', 700);
      self.selectedNodesArray.next([]);
    });

    // on right label link click - hightlight labels and package data for context menu
    svg.selectAll('.edgelabel').on('contextmenu', function (d) {
      self.selectedNodesArray.next([]);
      _d3.selectAll('.nodeText').style('fill', '#212529').style('font-weight', 400);
      _d3.selectAll('.edgelabel').style('font-weight', 400).style('fill', '#212529');
      _d3.select(this).style('fill', 'blue').style('font-weight', 700);
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
              // remove the selected styling on other nodes and labels when we drag a non-selected node
              _d3.selectAll('.edgelabel').style('fill', '#212529').style('font-weight', 400);
              _d3.selectAll('.nodeText').style('font-weight', 400).style('fill', '#212529');
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
          })
      )
      .attr('class', 'node-wrapper')
      .attr('id', function (d) {
        return d.id;
      });

    // no collision - already using this in statement
    const self = this;

    svg.selectAll('.node-wrapper').on('dblclick', function () {
      const dblClick = d3.select(this).data();
      self.dblClickNodePayload.next(dblClick);
    });

    // node click and ctrl + click
    svg.selectAll('.node-wrapper').on('click', function (d) {
      // so we don't activate the canvas .click event
      _d3.event.stopPropagation();

      // setting the select attribute to the object on single select so we can drag them
      d.selected = true;
      
      selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
      selectAllNodes.style.opacity = '1';
      // If ctrl key is held on click
      if (_d3.event.ctrlKey) {
				// toggle the class on and off when ctrl click is active
				const clickedNode = d3.select(this);
				const isSelected = clickedNode.classed('selected');
				clickedNode.classed('selected', !isSelected);
				d.selected = !isSelected;
				d.previouslySelected = !isSelected;

        const totalSize = nodeEnter.size();
        const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
        const count = nonSelectedNodes.size();
        const notSelectedSize = totalSize - count;

        if (notSelectedSize === totalSize){
          selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
          selectAllNodes.style.opacity = '0.65';
        }
        // remove the single click styling on other nodes and labels
        _d3.selectAll('.edgelabel').style('fill', '#212529').style('font-weight', 400);
        _d3.selectAll('.nodeText').style('font-weight', 400).style('fill', '#212529');
        svg.selectAll('.selected').selectAll('.nodeText').style('fill', 'blue').style('font-weight', 700);
        // counts number of selected classes to not exceed 2
        const selectedSize = svg.selectAll('.selected').size();

        if (selectedSize <= 2) {
					// As we allow for single click without a ctrl+click to select two nodes, we have to apply d.selected to it
          _d3.selectAll('.selected')
          .attr('selected', true)
          .each(function (d) {
            if (d) {
              d.selected = true;
            }
          });
          // get data from node
          const localselectedNodesArray = _d3.selectAll('.selected').data();
          const filterId = localselectedNodesArray.filter(x => x);
          self.selectedNodesArray.next(filterId);
          return filterId;
        }
        return null;
      } else {
        nodeEnter.each(function (d) {
          d.selected = false;
          d.previouslySelected = false;
        });
      }

      // remove style from selected node before the class is removed
      _d3.selectAll('.selected').selectAll('.nodeText').style('fill', '#212529');
      // Remove styles from all other nodes and labels on single left click
      _d3.selectAll('.edgelabel').style('fill', '#212529');
      _d3.selectAll('.nodeText').style('fill', '#212529').style('font-weight', 400);
      // Add style on single left click
      _d3.select(this).select('.nodeText').style('fill', 'blue').style('font-weight', 700);
      self.selectedNodesArray.next([]);

      return null;
    });

		// Right click on a node highlights for context menu
		svg.selectAll('.node-wrapper').on('contextmenu', function (d) {
			// counts number of selected classes to not exceed 2
			const selectedSize = svg.selectAll('.selected').selectAll('.nodeText').size();
      
			if (selectedSize !== 2) {
				// We don't want to remove style if they are obtaining the context menu for just two nodes (create link option)
        svg.selectAll('.selected').classed('selected', false);
        self.selectedNodesArray.next([]);
				_d3.selectAll('.edgelabel').style('fill', '#212529').style('font-weight', 400);
				_d3.selectAll('.nodeText').style('fill', '#212529').style('font-weight', 400);
				// Add style on single right click
				_d3.select(this).select('.nodeText').style('fill', 'blue').style('font-weight', 700);
			}
		});

    //click on canvas to remove selected nodes
    _d3.select('svg').on('click', () => {
      nodeEnter.each(function (d) {
        d.selected = false;
        d.previouslySelected = false;
      });
      node.classed('selected', false);
      _d3.selectAll('.selected').selectAll('.nodeText').style('fill', '#212529').style('font-weight', 400);
      _d3.selectAll('.selected').classed('selected', false);
      _d3.selectAll('.edgelabel').style('fill', '#212529').style('font-weight', 400);
      self.selectedNodesArray.next([]);
      selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
      selectAllNodes.style.opacity = '1';
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
      .data(d => d.label)
      .enter()
      .append('tspan')
      .attr('class', 'nodeTextTspan')
      .text(d => d)
      .style('font-size', '14px')
      .attr('x', -10)
      .attr('dx', 10)
      .attr('dy', 15);

      nodeEnter
      .filter(function(d) {
				if (!d.attachedToUnauthorisedIRs) {
					return null;
				}
				return true;
      })
      .append('image')
      .attr('id', function (d) {
				const suffix = 'unauthImage';
				const id = d.id ? d.id : '';
				return `${id}_${suffix}`;
			})
      .attr('width', 100)
      .attr('height', 17)
      .attr('x', -50)
      .attr('y', function(d) {
        const textElement = d3.select(this.parentNode).select('text');
        const bbox = textElement.node().getBBox();
        const textHeight = bbox.height;
        const dyOffset = -25;
        return textHeight + dyOffset;
      })
      .attr('xlink:href', function(d) {
        return `https://raw.githubusercontent.com/Rudgey84/d3-visualiser/1f83debd80578edcd29eaf2559bba2988a0f437a/src/unauthPill.png`;
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
  }

  public resetGraph(initialData, element, zoom, zoomToFit) {
    // Reset the data to its initial state
    this.nodes = [];
    this.links = [];
    // Call the update method again to re-simulate the graph with the new data
    this.update(initialData, element, zoom, zoomToFit);
    
  }
}
