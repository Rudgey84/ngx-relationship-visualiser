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
  dblClickPayload = new Subject();
  editLinkArray = new Subject();

  public update(data, element) {
    const svg = d3.select(element);
    return this._update(d3, svg, data);
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
        'translate(' +
          transform.x +
          ',' +
          transform.y +
          ') scale(' +
          transform.k +
          ')'
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
      return 'translate(' + d.x + ', ' + (d.y + 50) + ')';
    });

    // .attr('cx', function (d) {
    //   // boundries
    //   return (d.x = Math.max(40, Math.min(900 - 15, d.x)));
    // })
    // .attr('cy', function (d) {
    //   return (d.y = Math.max(50, Math.min(600 - 40, d.y)));
    // });

    edgepaths.attr('d', function (d) {
      return (
        'M ' +
        d.source.x +
        ' ' +
        d.source.y +
        ' L ' +
        d.target.x +
        ' ' +
        d.target.y
      );
    });

    edgepaths.attr('transform', function (d) {
      if (d.target.x < d.source.x) {
        let bbox = this.getBBox();

        let rx = bbox.x + bbox.width / 2;
        let ry = bbox.y + bbox.height / 2;
        return 'rotate(180 ' + rx + ' ' + ry + ')';
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
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowheadTarget')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#b4b4b4')
      .style('stroke', 'none');
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowheadSource')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 2)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 10 -5 L 0 0 L 10 5')
      .attr('fill', '#b4b4b4')
      .style('stroke', 'none');

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

  _update(_d3, svg, data) {
    let { links, nodes } = data;
    this.links = links || [];
    this.nodes = nodes || [];

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
    console.log(this.links);
    this.initDefinitions(svg);

    const simulation = this.forceSimulation(_d3, {
      width: +svg.attr('width'),
      height: +svg.attr('height'),
    });

    const zoomContainer = _d3.select('svg g');

    const filteredLine = this.links.filter(({source, target}, index, self) => {
      // Filter out any objects that have matching source and target property values
      // To display only one line (parentLineStyle)
      return index === self.findIndex(obj => obj.source === source && obj.target === target);
    });
    
    const link = zoomContainer.selectAll('.link').data(filteredLine);

    //	link.exit().remove();

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
      })
      .style('stroke-width', '2px')
      .attr('class', 'link')
      .attr('marker-end', function (d) {
        if (d.parentTargetArrow === true) {
          return 'url(#arrowheadTarget)';
        }
      })
      .attr('marker-start', function (d) {
        if (d.parentSourceArrow === true) {
          return 'url(#arrowheadSource)';
        }
      });

    link.append('title').text(function (d) {
      return d.label;
    });

    const edgepaths = zoomContainer.selectAll('.edgepath').data(this.links);

    zoomContainer.selectAll('path').data(edgepaths).exit().remove();
    const edgepathsEnter = edgepaths
      .join('svg:path')
      //.attr('class', 'edgepath')
      .attr('fill-opacity', 0)
      .attr('stroke-opacity', 0)
      .attr('id', function (d, i) {
        return 'edgepath' + i;
      });

    const edgelabels = zoomContainer
      .selectAll('.edgelabel')
      .data(this.links, function (d) {
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
      .attr('font-size', 10)
      .attr('dy', function (d, i) {
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
      const localEditLinkArray = d3.select(this).data();
      self.editLinkArray.next(localEditLinkArray);
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
      .attr('class', 'node-wrapper');

    // no collision - already using this in statement
    const self = this;

    svg.selectAll('.node-wrapper').on('dblclick', function () {
      const dblClick = d3.select(this).data();
      self.dblClickPayload.next(dblClick);
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
      .attr('xlink:href', 'https://github.com/favicon.ico')
      .attr('x', -15)
      .attr('y', -60)
      .attr('width', 16)
      .attr('class', 'image')
      .style('cursor', 'pointer')
      .attr('height', 16);

    const nodeText = nodeEnter
      .append('text')
      .attr('class', 'nodeText')
      .style('text-anchor', 'middle')
      .style('cursor', 'pointer')
      .attr('dy', -3)
      .attr('y', -25)
      .attr('id', 'nodeText');

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
