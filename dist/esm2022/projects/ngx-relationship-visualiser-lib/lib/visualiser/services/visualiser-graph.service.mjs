import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ReplaySubject } from 'rxjs';
import * as i0 from "@angular/core";
import * as i1 from "../../db/graphDatabase";
export class VisualiserGraphService {
    dexieService;
    constructor(dexieService) {
        this.dexieService = dexieService;
    }
    links = [];
    nodes = [];
    gBrush = null;
    brushMode = false;
    brushing = false;
    shiftKey;
    extent = null;
    zoom = false;
    zoomToFit = false;
    saveGraphData = new ReplaySubject();
    update(data, element, zoom, zoomToFit) {
        const svg = d3.select(element);
        this.zoom = zoom;
        this.zoomToFit = zoomToFit;
        return this._update(d3, svg, data);
    }
    ticked(link, node, edgepaths) {
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
            }
            else {
                return 'rotate(0)';
            }
        });
    }
    initDefinitions(svg) {
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
    forceSimulation(_d3, { width, height }) {
        return _d3
            .forceSimulation()
            .velocityDecay(0.1)
            .force('link', _d3
            .forceLink()
            .id(function (d) {
            return d.id;
        })
            .distance(500)
            .strength(1))
            .force('charge', _d3.forceManyBody().strength(0.1))
            .force('center', _d3.forceCenter(width / 2, height / 2))
            .force('collision', _d3.forceCollide().radius(15));
    }
    compareAndMarkNodesNew(nodes, old_nodes) {
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
    removeNewItem(nodes) {
        for (const node of nodes) {
            if (node.hasOwnProperty('newItem')) {
                delete node.newItem;
            }
        }
        return nodes;
    }
    randomiseNodePositions(nodeData, width, height) {
        let minDistance = 100;
        const availableSpace = width * height;
        let adjustedRequiredSpace = nodeData.length * minDistance * minDistance;
        if (adjustedRequiredSpace > availableSpace) {
            while (adjustedRequiredSpace > availableSpace && minDistance > 0) {
                minDistance -= 10;
                adjustedRequiredSpace = nodeData.length * minDistance * minDistance;
            }
            if (adjustedRequiredSpace > availableSpace) {
                throw new Error('Not enough space to accommodate all nodes without a fixed position.');
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
                        if (otherNode.fx === null ||
                            otherNode.fy === null ||
                            otherNode === node) {
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
                    throw new Error('Not enough space to accommodate all nodes without a fixed position.');
                }
            }
        });
        return nodeData;
    }
    async _update(_d3, svg, data) {
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
        }
        else {
            // Add first set of nodes to Dexie
            await this.dexieService.saveGraphData({ dataId: 'nodes', nodes: data.nodes, links: data.links });
        }
        // If nodes don't have a fx/fy coordinate we generate a random one - dagre nodes without links and new nodes added to canvas have null coordinates by design
        this.nodes = this.randomiseNodePositions(this.nodes, parentWidth, parentHeight);
        // Getting parents lineStyle and adding it to child objects
        const relationshipsArray = this.links.map(({ lineStyle, targetArrow, sourceArrow, relationships }) => relationships.map((r) => ({
            parentLineStyle: lineStyle,
            parentSourceArrow: sourceArrow,
            parentTargetArrow: targetArrow,
            ...r,
        })));
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
                }
                else {
                    zoomInBtn.removeAttribute('disabled');
                }
            }
            // Disable the zoomOutBtn if the zoom level is at 0%
            if (zoomOutBtn) {
                if (zoomPercentage === 0) {
                    zoomOutBtn.setAttribute('disabled', 'true');
                }
                else {
                    zoomOutBtn.removeAttribute('disabled');
                }
            }
            // Disable the zoomResetBtn if the zoom level is at 100%
            if (zoomResetBtn) {
                if (zoomPercentage === 100) {
                    zoomResetBtn.setAttribute('disabled', 'true');
                }
                else {
                    zoomResetBtn.removeAttribute('disabled');
                }
            }
        };
        let zoomedInit;
        const zoomed = () => {
            const transform = d3.event.transform;
            zoomContainer.attr('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);
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
            const translateX = -nodeBBox.x * scale + (parentWidth - nodeBBox.width * scale) / 2;
            const translateY = -nodeBBox.y * scale + (parentHeight - nodeBBox.height * scale) / 2;
            // Get the bounding box of all nodes
            const allNodes = zoomContainer.selectAll('.node-wrapper');
            const allNodesBBox = allNodes.nodes().reduce((acc, node) => {
                const nodeBBox = node.getBBox();
                acc.x = Math.min(acc.x, nodeBBox.x);
                acc.y = Math.min(acc.y, nodeBBox.y);
                acc.width = Math.max(acc.width, nodeBBox.x + nodeBBox.width);
                acc.height = Math.max(acc.height, nodeBBox.y + nodeBBox.height);
                return acc;
            }, { x: Infinity, y: Infinity, width: -Infinity, height: -Infinity });
            // Check if all nodes are within the viewable container
            if (allNodesBBox.x * scale >= 0 &&
                allNodesBBox.y * scale >= 0 &&
                allNodesBBox.width * scale <= parentWidth &&
                allNodesBBox.height * scale <= parentHeight) {
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
                .attr('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
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
            if (!d3.event.sourceEvent || !this.extent || !this.brushMode)
                return;
            if (!currentZoom)
                return;
            nodeEnter
                .classed('selected', (d) => {
                return (d.selected =
                    d.previouslySelected ^
                        ((d3.event.selection[0][0] <=
                            d.x * currentZoom.k + currentZoom.x &&
                            d.x * currentZoom.k + currentZoom.x <
                                d3.event.selection[1][0] &&
                            d3.event.selection[0][1] <=
                                d.y * currentZoom.k + currentZoom.y &&
                            d.y * currentZoom.k + currentZoom.y <
                                d3.event.selection[1][1])));
            })
                .select('.nodeText')
                .classed('selected', (d) => d.selected)
                .style('fill', (d) => (d.selected ? 'blue' : '#999'))
                .style('font-weight', (d) => (d.selected ? 700 : 400));
            this.extent = d3.event.selection;
        })
            .on('end', () => {
            if (!d3.event.sourceEvent || !this.extent || !this.gBrush)
                return;
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
        const filteredLine = this.links.filter(({ source, target }, index, linksArray) => {
            // Filter out any objects that have matching source and target property values
            // To display only one line (parentLineStyle) - removes html bloat and a darkened line
            return (index ===
                linksArray.findIndex((obj) => obj.source === source && obj.target === target));
        });
        const link = zoomContainer.selectAll().data(filteredLine, function (d) {
            return d.id;
        });
        zoomContainer.selectAll('line').data(link).exit().remove();
        const linkEnter = link
            .join('line')
            .style('stroke', function (d) {
            if (d.parentLineStyle === 'Solid') {
                return '#777';
            }
            else {
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
            .call(_d3
            .drag()
            .on('start', function dragstarted(d) {
            // Enable the save & reset btn
            document.getElementById('save_graph').removeAttribute('disabled');
            if (!_d3.event.active)
                simulation.alphaTarget(0.9).restart();
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
        }))
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
            }
            else {
                this.ticked(linkEnter, nodeEnter, edgepathsEnter);
                tickCount++;
            }
        });
        simulation.force('link').links(this.links);
        self.saveGraphData.next(data);
    }
    resetGraph(initialData, element, zoom, zoomToFit) {
        // Reset the data to its initial state
        this.nodes = [];
        this.links = [];
        // Call the update method again to re-simulate the graph with the new data
        this.update(initialData, element, zoom, zoomToFit);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphService, deps: [{ token: i1.DexieService }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }], ctorParameters: () => [{ type: i1.DexieService }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzdWFsaXNlci1ncmFwaC5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LXJlbGF0aW9uc2hpcC12aXN1YWxpc2VyLWxpYi9saWIvdmlzdWFsaXNlci9zZXJ2aWNlcy92aXN1YWxpc2VyLWdyYXBoLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sTUFBTSxDQUFDOzs7QUFNckMsTUFBTSxPQUFPLHNCQUFzQjtJQUNiO0lBQXBCLFlBQW9CLFlBQTBCO1FBQTFCLGlCQUFZLEdBQVosWUFBWSxDQUFjO0lBQUksQ0FBQztJQUM1QyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQ1gsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNYLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDZCxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQ2xCLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDakIsUUFBUSxDQUFDO0lBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQztJQUNkLElBQUksR0FBRyxLQUFLLENBQUM7SUFDYixTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQ2xCLGFBQWEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO0lBRXBDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTO1FBQzFDLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVB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RyxFQUFFLENBQUM7UUFDaEIsMEVBQTBFO1FBQzFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDckQsQ0FBQzt3R0E3L0JVLHNCQUFzQjs0R0FBdEIsc0JBQXNCLGNBRnJCLE1BQU07OzRGQUVQLHNCQUFzQjtrQkFIbEMsVUFBVTttQkFBQztvQkFDVixVQUFVLEVBQUUsTUFBTTtpQkFDbkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgKiBhcyBkMyBmcm9tICdkMyc7XG5pbXBvcnQgeyBSZXBsYXlTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBEZXhpZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9kYi9ncmFwaERhdGFiYXNlJztcblxuQEluamVjdGFibGUoe1xuICBwcm92aWRlZEluOiAncm9vdCcsXG59KVxuZXhwb3J0IGNsYXNzIFZpc3VhbGlzZXJHcmFwaFNlcnZpY2Uge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGRleGllU2VydmljZTogRGV4aWVTZXJ2aWNlKSB7IH1cbiAgcHVibGljIGxpbmtzID0gW107XG4gIHB1YmxpYyBub2RlcyA9IFtdO1xuICBwdWJsaWMgZ0JydXNoID0gbnVsbDtcbiAgcHVibGljIGJydXNoTW9kZSA9IGZhbHNlO1xuICBwdWJsaWMgYnJ1c2hpbmcgPSBmYWxzZTtcbiAgcHVibGljIHNoaWZ0S2V5O1xuICBwdWJsaWMgZXh0ZW50ID0gbnVsbDtcbiAgcHVibGljIHpvb20gPSBmYWxzZTtcbiAgcHVibGljIHpvb21Ub0ZpdCA9IGZhbHNlO1xuICBwdWJsaWMgc2F2ZUdyYXBoRGF0YSA9IG5ldyBSZXBsYXlTdWJqZWN0KCk7XG5cbiAgcHVibGljIHVwZGF0ZShkYXRhLCBlbGVtZW50LCB6b29tLCB6b29tVG9GaXQpIHtcbiAgICBjb25zdCBzdmcgPSBkMy5zZWxlY3QoZWxlbWVudCk7XG4gICAgdGhpcy56b29tID0gem9vbTtcbiAgICB0aGlzLnpvb21Ub0ZpdCA9IHpvb21Ub0ZpdDtcbiAgICByZXR1cm4gdGhpcy5fdXBkYXRlKGQzLCBzdmcsIGRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSB0aWNrZWQobGluaywgbm9kZSwgZWRnZXBhdGhzKSB7XG4gICAgbGluay5lYWNoKGZ1bmN0aW9uIChkLCBpLCBuKSB7XG4gICAgICAvLyBUb3RhbCBkaWZmZXJlbmNlIGluIHggYW5kIHkgZnJvbSBzb3VyY2UgdG8gdGFyZ2V0XG4gICAgICBsZXQgZGlmZlggPSBkLnRhcmdldC54IC0gZC5zb3VyY2UueDtcbiAgICAgIGxldCBkaWZmWSA9IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55O1xuXG4gICAgICAvLyBMZW5ndGggb2YgcGF0aCBmcm9tIGNlbnRlciBvZiBzb3VyY2Ugbm9kZSB0byBjZW50ZXIgb2YgdGFyZ2V0IG5vZGVcbiAgICAgIGxldCBwYXRoTGVuZ3RoID0gTWF0aC5zcXJ0KGRpZmZYICogZGlmZlggKyBkaWZmWSAqIGRpZmZZKTtcblxuICAgICAgLy8geCBhbmQgeSBkaXN0YW5jZXMgZnJvbSBjZW50ZXIgdG8gb3V0c2lkZSBlZGdlIG9mIHRhcmdldCBub2RlXG4gICAgICBsZXQgb2Zmc2V0WCA9IChkaWZmWCAqIDQwKSAvIHBhdGhMZW5ndGg7XG4gICAgICBsZXQgb2Zmc2V0WSA9IChkaWZmWSAqIDQwKSAvIHBhdGhMZW5ndGg7XG5cbiAgICAgIGQzLnNlbGVjdChuW2ldKVxuICAgICAgICAuYXR0cigneDEnLCBkLnNvdXJjZS54ICsgb2Zmc2V0WClcbiAgICAgICAgLmF0dHIoJ3kxJywgZC5zb3VyY2UueSArIG9mZnNldFkpXG4gICAgICAgIC5hdHRyKCd4MicsIGQudGFyZ2V0LnggLSBvZmZzZXRYKVxuICAgICAgICAuYXR0cigneTInLCBkLnRhcmdldC55IC0gb2Zmc2V0WSk7XG4gICAgfSk7XG5cbiAgICBub2RlLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gYHRyYW5zbGF0ZSgke2QueH0sICR7ZC55ICsgNTB9KWA7XG4gICAgfSk7XG5cbiAgICAvLyBTZXRzIGEgYm91bmRyeSBmb3IgdGhlIG5vZGVzXG4gICAgLy8gbm9kZS5hdHRyKCdjeCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgLy8gICByZXR1cm4gKGQueCA9IE1hdGgubWF4KDQwLCBNYXRoLm1pbig5MDAgLSAxNSwgZC54KSkpO1xuICAgIC8vIH0pO1xuICAgIC8vIG5vZGUuYXR0cignY3knLCBmdW5jdGlvbiAoZCkge1xuICAgIC8vICAgcmV0dXJuIChkLnkgPSBNYXRoLm1heCg1MCwgTWF0aC5taW4oNjAwIC0gNDAsIGQueSkpKTtcbiAgICAvLyB9KTtcblxuICAgIGVkZ2VwYXRocy5hdHRyKCdkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBgTSAke2Quc291cmNlLnh9ICR7ZC5zb3VyY2UueX0gTCAke2QudGFyZ2V0Lnh9ICR7ZC50YXJnZXQueX1gO1xuICAgIH0pO1xuXG4gICAgZWRnZXBhdGhzLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICBpZiAoZC50YXJnZXQueCA8IGQuc291cmNlLngpIHtcbiAgICAgICAgY29uc3QgYmJveCA9IHRoaXMuZ2V0QkJveCgpO1xuICAgICAgICBjb25zdCByeCA9IGJib3gueCArIGJib3gud2lkdGggLyAyO1xuICAgICAgICBjb25zdCByeSA9IGJib3gueSArIGJib3guaGVpZ2h0IC8gMjtcbiAgICAgICAgcmV0dXJuIGByb3RhdGUoMTgwICR7cnh9ICR7cnl9KWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJ3JvdGF0ZSgwKSc7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGluaXREZWZpbml0aW9ucyhzdmcpIHtcbiAgICBjb25zdCBkZWZzID0gc3ZnLmFwcGVuZCgnZGVmcycpO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlTWFya2VyKGlkLCByZWZYLCBwYXRoKSB7XG4gICAgICBkZWZzXG4gICAgICAgIC5hcHBlbmQoJ21hcmtlcicpXG4gICAgICAgIC5hdHRyKCdpZCcsIGlkKVxuICAgICAgICAuYXR0cigndmlld0JveCcsICctMCAtNSAxMCAxMCcpXG4gICAgICAgIC5hdHRyKCdyZWZYJywgcmVmWClcbiAgICAgICAgLmF0dHIoJ3JlZlknLCAwKVxuICAgICAgICAuYXR0cignb3JpZW50JywgJ2F1dG8nKVxuICAgICAgICAuYXR0cignbWFya2VyV2lkdGgnLCA4KVxuICAgICAgICAuYXR0cignbWFya2VySGVpZ2h0JywgOClcbiAgICAgICAgLmF0dHIoJ3hvdmVyZmxvdycsICd2aXNpYmxlJylcbiAgICAgICAgLmFwcGVuZCgnc3ZnOnBhdGgnKVxuICAgICAgICAuYXR0cignZCcsIHBhdGgpXG4gICAgICAgIC5hdHRyKCdmaWxsJywgJyNiNGI0YjQnKVxuICAgICAgICAuc3R5bGUoJ3N0cm9rZScsICdub25lJyk7XG4gICAgfVxuXG4gICAgY3JlYXRlTWFya2VyKCdhcnJvd2hlYWRUYXJnZXQnLCAwLCAnTSAwLC01IEwgMTAgLDAgTCAwLDUnKTtcbiAgICBjcmVhdGVNYXJrZXIoJ2Fycm93aGVhZFNvdXJjZScsIDIsICdNIDEwIC01IEwgMCAwIEwgMTAgNScpO1xuXG4gICAgcmV0dXJuIHN2ZztcbiAgfVxuXG4gIHByaXZhdGUgZm9yY2VTaW11bGF0aW9uKF9kMywgeyB3aWR0aCwgaGVpZ2h0IH0pIHtcbiAgICByZXR1cm4gX2QzXG4gICAgICAuZm9yY2VTaW11bGF0aW9uKClcbiAgICAgIC52ZWxvY2l0eURlY2F5KDAuMSlcbiAgICAgIC5mb3JjZShcbiAgICAgICAgJ2xpbmsnLFxuICAgICAgICBfZDNcbiAgICAgICAgICAuZm9yY2VMaW5rKClcbiAgICAgICAgICAuaWQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBkLmlkO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmRpc3RhbmNlKDUwMClcbiAgICAgICAgICAuc3RyZW5ndGgoMSlcbiAgICAgIClcbiAgICAgIC5mb3JjZSgnY2hhcmdlJywgX2QzLmZvcmNlTWFueUJvZHkoKS5zdHJlbmd0aCgwLjEpKVxuICAgICAgLmZvcmNlKCdjZW50ZXInLCBfZDMuZm9yY2VDZW50ZXIod2lkdGggLyAyLCBoZWlnaHQgLyAyKSlcbiAgICAgIC5mb3JjZSgnY29sbGlzaW9uJywgX2QzLmZvcmNlQ29sbGlkZSgpLnJhZGl1cygxNSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wYXJlQW5kTWFya05vZGVzTmV3KG5vZGVzLCBvbGRfbm9kZXMpIHtcbiAgICAvLyBDcmVhdGUgYSBtYXAgb2YgaWRzIHRvIG5vZGUgb2JqZWN0cyBmb3IgdGhlIG9sZF9ub2RlcyBhcnJheVxuICAgIGNvbnN0IG9sZE1hcCA9IG9sZF9ub2Rlcy5yZWR1Y2UoKG1hcCwgbm9kZSkgPT4ge1xuICAgICAgbWFwW25vZGUuaWRdID0gbm9kZTtcbiAgICAgIHJldHVybiBtYXA7XG4gICAgfSwge30pO1xuXG4gICAgLy8gQ2hlY2sgZWFjaCBub2RlIGluIHRoZSBub2RlcyBhcnJheSB0byBzZWUgaWYgaXQncyBuZXcgb3Igbm90XG4gICAgbm9kZXMuZm9yRWFjaCgobm9kZSkgPT4ge1xuICAgICAgaWYgKCFvbGRNYXBbbm9kZS5pZF0pIHtcbiAgICAgICAgLy8gTm9kZSBpcyBuZXcsIG1hcmsgaXQgd2l0aCB0aGUgbmV3SXRlbSBwcm9wZXJ0eVxuICAgICAgICBub2RlLm5ld0l0ZW0gPSB0cnVlO1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGRhZ3JlIGNvb3JkaW5hdGVzIGZyb20gbmV3IG5vZGVzIHNvIHdlIGNhbiBzZXQgYSByYW5kb20gb25lIGluIHZpZXdcbiAgICAgICAgbm9kZS5meCA9IG51bGw7XG4gICAgICAgIG5vZGUuZnkgPSBudWxsO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGVzO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVOZXdJdGVtKG5vZGVzKSB7XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICBpZiAobm9kZS5oYXNPd25Qcm9wZXJ0eSgnbmV3SXRlbScpKSB7XG4gICAgICAgIGRlbGV0ZSBub2RlLm5ld0l0ZW07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2RlcztcbiAgfVxuXG4gIHByaXZhdGUgcmFuZG9taXNlTm9kZVBvc2l0aW9ucyhub2RlRGF0YSwgd2lkdGgsIGhlaWdodCkge1xuICAgIGxldCBtaW5EaXN0YW5jZSA9IDEwMDtcbiAgICBjb25zdCBhdmFpbGFibGVTcGFjZSA9IHdpZHRoICogaGVpZ2h0O1xuICAgIGxldCBhZGp1c3RlZFJlcXVpcmVkU3BhY2UgPSBub2RlRGF0YS5sZW5ndGggKiBtaW5EaXN0YW5jZSAqIG1pbkRpc3RhbmNlO1xuXG4gICAgaWYgKGFkanVzdGVkUmVxdWlyZWRTcGFjZSA+IGF2YWlsYWJsZVNwYWNlKSB7XG4gICAgICB3aGlsZSAoYWRqdXN0ZWRSZXF1aXJlZFNwYWNlID4gYXZhaWxhYmxlU3BhY2UgJiYgbWluRGlzdGFuY2UgPiAwKSB7XG4gICAgICAgIG1pbkRpc3RhbmNlIC09IDEwO1xuICAgICAgICBhZGp1c3RlZFJlcXVpcmVkU3BhY2UgPSBub2RlRGF0YS5sZW5ndGggKiBtaW5EaXN0YW5jZSAqIG1pbkRpc3RhbmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWRqdXN0ZWRSZXF1aXJlZFNwYWNlID4gYXZhaWxhYmxlU3BhY2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdOb3QgZW5vdWdoIHNwYWNlIHRvIGFjY29tbW9kYXRlIGFsbCBub2RlcyB3aXRob3V0IGEgZml4ZWQgcG9zaXRpb24uJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIG5vZGVEYXRhLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgIGlmIChub2RlLmZ4ID09PSBudWxsICYmIG5vZGUuZnkgPT09IG51bGwpIHtcbiAgICAgICAgbGV0IGN1cnJlbnRNaW5EaXN0YW5jZSA9IG1pbkRpc3RhbmNlO1xuICAgICAgICBsZXQgY2FuUGxhY2VOb2RlID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKCFjYW5QbGFjZU5vZGUgJiYgY3VycmVudE1pbkRpc3RhbmNlID4gMCkge1xuICAgICAgICAgIG5vZGUuZnggPSBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50MzJBcnJheSgxKSlbMF0gJSB3aWR0aDtcbiAgICAgICAgICBub2RlLmZ5ID0gY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDMyQXJyYXkoMSkpWzBdICUgaGVpZ2h0O1xuXG4gICAgICAgICAgY2FuUGxhY2VOb2RlID0gIW5vZGVEYXRhLnNvbWUoKG90aGVyTm9kZSkgPT4ge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBvdGhlck5vZGUuZnggPT09IG51bGwgfHxcbiAgICAgICAgICAgICAgb3RoZXJOb2RlLmZ5ID09PSBudWxsIHx8XG4gICAgICAgICAgICAgIG90aGVyTm9kZSA9PT0gbm9kZVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZHggPSBvdGhlck5vZGUuZnggLSBub2RlLmZ4O1xuICAgICAgICAgICAgY29uc3QgZHkgPSBvdGhlck5vZGUuZnkgLSBub2RlLmZ5O1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSkgPCBjdXJyZW50TWluRGlzdGFuY2U7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoIWNhblBsYWNlTm9kZSkge1xuICAgICAgICAgICAgY3VycmVudE1pbkRpc3RhbmNlLS07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjYW5QbGFjZU5vZGUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnTm90IGVub3VnaCBzcGFjZSB0byBhY2NvbW1vZGF0ZSBhbGwgbm9kZXMgd2l0aG91dCBhIGZpeGVkIHBvc2l0aW9uLidcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZURhdGE7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgX3VwZGF0ZShfZDMsIHN2ZywgZGF0YSkge1xuICAgIGNvbnN0IHsgbm9kZXMsIGxpbmtzIH0gPSBkYXRhO1xuICAgIHRoaXMubm9kZXMgPSBub2RlcyB8fCBbXTtcbiAgICB0aGlzLmxpbmtzID0gbGlua3MgfHwgW107XG5cbiAgICAvLyBEaXNhYmxlIHRoZSByZXNldCBidG5cblxuICAgIGxldCBzYXZlQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmVfZ3JhcGgnKTtcbiAgICBzYXZlQnRuLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAndHJ1ZScpO1xuICAgIC8vIFdpZHRoL0hlaWdodCBvZiBjYW52YXNcbiAgICBjb25zdCBwYXJlbnRXaWR0aCA9IF9kMy5zZWxlY3QoJ3N2ZycpLm5vZGUoKS5wYXJlbnROb2RlLmNsaWVudFdpZHRoO1xuICAgIGNvbnN0IHBhcmVudEhlaWdodCA9IF9kMy5zZWxlY3QoJ3N2ZycpLm5vZGUoKS5wYXJlbnROb2RlLmNsaWVudEhlaWdodDtcblxuICAgIC8vIENoZWNrIHRvIHNlZSBpZiBub2RlcyBhcmUgaW4gRGV4aWVcbiAgICBjb25zdCBvbGREYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKCdub2RlcycpO1xuICAgIGNvbnN0IG9sZE5vZGVzID0gb2xkRGF0YSA/IG9sZERhdGEubm9kZXMgOiBbXTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvbGROb2RlcykpIHtcbiAgICAgIC8vIENvbXBhcmUgYW5kIHNldCBwcm9wZXJ0eSBmb3IgbmV3IG5vZGVzXG4gICAgICB0aGlzLm5vZGVzID0gdGhpcy5jb21wYXJlQW5kTWFya05vZGVzTmV3KG5vZGVzLCBvbGROb2Rlcyk7XG4gICAgICAvLyBSZW1vdmUgb2xkIG5vZGVzIGZyb20gRGV4aWVcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmRlbGV0ZUdyYXBoRGF0YSgnbm9kZXMnKTtcbiAgICAgIC8vIEFkZCBuZXcgbm9kZXMgdG8gRGV4aWVcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLnNhdmVHcmFwaERhdGEoeyBkYXRhSWQ6ICdub2RlcycsIG5vZGVzOiBkYXRhLm5vZGVzLCBsaW5rczogZGF0YS5saW5rcyB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQWRkIGZpcnN0IHNldCBvZiBub2RlcyB0byBEZXhpZVxuICAgICAgYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2Uuc2F2ZUdyYXBoRGF0YSh7IGRhdGFJZDogJ25vZGVzJywgbm9kZXM6IGRhdGEubm9kZXMsIGxpbmtzOiBkYXRhLmxpbmtzIH0pO1xuICAgIH1cblxuICAgIC8vIElmIG5vZGVzIGRvbid0IGhhdmUgYSBmeC9meSBjb29yZGluYXRlIHdlIGdlbmVyYXRlIGEgcmFuZG9tIG9uZSAtIGRhZ3JlIG5vZGVzIHdpdGhvdXQgbGlua3MgYW5kIG5ldyBub2RlcyBhZGRlZCB0byBjYW52YXMgaGF2ZSBudWxsIGNvb3JkaW5hdGVzIGJ5IGRlc2lnblxuICAgIHRoaXMubm9kZXMgPSB0aGlzLnJhbmRvbWlzZU5vZGVQb3NpdGlvbnMoXG4gICAgICB0aGlzLm5vZGVzLFxuICAgICAgcGFyZW50V2lkdGgsXG4gICAgICBwYXJlbnRIZWlnaHRcbiAgICApO1xuXG4gICAgLy8gR2V0dGluZyBwYXJlbnRzIGxpbmVTdHlsZSBhbmQgYWRkaW5nIGl0IHRvIGNoaWxkIG9iamVjdHNcbiAgICBjb25zdCByZWxhdGlvbnNoaXBzQXJyYXkgPSB0aGlzLmxpbmtzLm1hcChcbiAgICAgICh7IGxpbmVTdHlsZSwgdGFyZ2V0QXJyb3csIHNvdXJjZUFycm93LCByZWxhdGlvbnNoaXBzIH0pID0+XG4gICAgICAgIHJlbGF0aW9uc2hpcHMubWFwKChyKSA9PiAoe1xuICAgICAgICAgIHBhcmVudExpbmVTdHlsZTogbGluZVN0eWxlLFxuICAgICAgICAgIHBhcmVudFNvdXJjZUFycm93OiBzb3VyY2VBcnJvdyxcbiAgICAgICAgICBwYXJlbnRUYXJnZXRBcnJvdzogdGFyZ2V0QXJyb3csXG4gICAgICAgICAgLi4ucixcbiAgICAgICAgfSkpXG4gICAgKTtcblxuICAgIC8vIEFkZGluZyBkeSB2YWx1ZSBiYXNlZCBvbiBsaW5rIG51bWJlciBhbmQgcG9zaXRpb24gaW4gcGFyZW50XG4gICAgcmVsYXRpb25zaGlwc0FycmF5Lm1hcCgobGlua1JlbGF0aW9uc2hpcCkgPT4ge1xuICAgICAgbGlua1JlbGF0aW9uc2hpcC5tYXAoKGxpbmtPYmplY3QsIGkpID0+IHtcbiAgICAgICAgLy8gZHkgaW5jcmVtZW50cyBvZiAxNXB4XG4gICAgICAgIGxpbmtPYmplY3RbJ2R5J10gPSAyMCArIGkgKiAxNTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gSUUxMSBkb2VzIG5vdCBsaWtlIC5mbGF0XG4gICAgdGhpcy5saW5rcyA9IHJlbGF0aW9uc2hpcHNBcnJheS5yZWR1Y2UoKGFjYywgdmFsKSA9PiBhY2MuY29uY2F0KHZhbCksIFtdKTtcblxuICAgIGQzLnNlbGVjdCgnc3ZnJykuYXBwZW5kKCdnJyk7XG5cbiAgICAvLyBab29tIFN0YXJ0XG4gICAgY29uc3Qgem9vbUNvbnRhaW5lciA9IF9kMy5zZWxlY3QoJ3N2ZyBnJyk7XG4gICAgbGV0IGN1cnJlbnRab29tID0gZDMuem9vbVRyYW5zZm9ybShkMy5zZWxlY3QoJ3N2ZycpLm5vZGUoKSk7XG4gICAgY29uc3QgdXBkYXRlWm9vbUxldmVsID0gKCkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudFNjYWxlID0gY3VycmVudFpvb20uaztcbiAgICAgIGNvbnN0IG1heFNjYWxlID0gem9vbS5zY2FsZUV4dGVudCgpWzFdO1xuICAgICAgY29uc3Qgem9vbVBlcmNlbnRhZ2UgPSAoKGN1cnJlbnRTY2FsZSAtIDAuNSkgLyAobWF4U2NhbGUgLSAwLjUpKSAqIDIwMDtcbiAgICAgIGNvbnN0IHpvb21MZXZlbERpc3BsYXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbV9sZXZlbCcpO1xuICAgICAgY29uc3Qgem9vbUxldmVsVGV4dCA9IGBab29tOiAke3pvb21QZXJjZW50YWdlLnRvRml4ZWQoMCl9JWA7XG4gICAgICBjb25zdCB6b29tSW5CdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbV9pbicpO1xuICAgICAgY29uc3Qgem9vbU91dEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd6b29tX291dCcpO1xuICAgICAgY29uc3Qgem9vbVJlc2V0QnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb21fcmVzZXQnKTtcblxuICAgICAgLy8gSXQgbWlnaHQgbm90IGV4aXN0IGRlcGVuZGluZyBvbiB0aGUgdGhpcy56b29tIGJvb2xlYW5cbiAgICAgIGlmICh6b29tUmVzZXRCdG4pIHtcbiAgICAgICAgem9vbVJlc2V0QnRuLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAndHJ1ZScpO1xuICAgICAgfVxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHpvb20gbGV2ZWwgaGFzIGNoYW5nZWQgYmVmb3JlIHVwZGF0aW5nIHRoZSBkaXNwbGF5IC8gYWxsb3dzIGZvciBwYW5uaW5nIHdpdGhvdXQgc2hvd2luZyB0aGUgem9vbSBwZXJjZW50YWdlXG4gICAgICBpZiAoem9vbUxldmVsRGlzcGxheSAmJiB6b29tTGV2ZWxEaXNwbGF5LmlubmVySFRNTCAhPT0gem9vbUxldmVsVGV4dCkge1xuICAgICAgICB6b29tTGV2ZWxEaXNwbGF5LmlubmVySFRNTCA9IHpvb21MZXZlbFRleHQ7XG4gICAgICAgIHpvb21MZXZlbERpc3BsYXkuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgaWYgKHpvb21MZXZlbERpc3BsYXkpIHtcbiAgICAgICAgICAgIHpvb21MZXZlbERpc3BsYXkuc3R5bGUub3BhY2l0eSA9ICcwJztcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDIwMDApO1xuICAgICAgfVxuICAgICAgLy8gRGlzYWJsZSB0aGUgem9vbUluQnRuIGlmIHRoZSB6b29tIGxldmVsIGlzIGF0IDIwMCVcbiAgICAgIGlmICh6b29tSW5CdG4pIHtcbiAgICAgICAgaWYgKHpvb21QZXJjZW50YWdlID09PSAyMDApIHtcbiAgICAgICAgICB6b29tSW5CdG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgem9vbUluQnRuLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRGlzYWJsZSB0aGUgem9vbU91dEJ0biBpZiB0aGUgem9vbSBsZXZlbCBpcyBhdCAwJVxuICAgICAgaWYgKHpvb21PdXRCdG4pIHtcbiAgICAgICAgaWYgKHpvb21QZXJjZW50YWdlID09PSAwKSB7XG4gICAgICAgICAgem9vbU91dEJ0bi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgJ3RydWUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB6b29tT3V0QnRuLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRGlzYWJsZSB0aGUgem9vbVJlc2V0QnRuIGlmIHRoZSB6b29tIGxldmVsIGlzIGF0IDEwMCVcbiAgICAgIGlmICh6b29tUmVzZXRCdG4pIHtcbiAgICAgICAgaWYgKHpvb21QZXJjZW50YWdlID09PSAxMDApIHtcbiAgICAgICAgICB6b29tUmVzZXRCdG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgem9vbVJlc2V0QnRuLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgbGV0IHpvb21lZEluaXQ7XG4gICAgY29uc3Qgem9vbWVkID0gKCkgPT4ge1xuICAgICAgY29uc3QgdHJhbnNmb3JtID0gZDMuZXZlbnQudHJhbnNmb3JtO1xuICAgICAgem9vbUNvbnRhaW5lci5hdHRyKFxuICAgICAgICAndHJhbnNmb3JtJyxcbiAgICAgICAgYHRyYW5zbGF0ZSgke3RyYW5zZm9ybS54fSwgJHt0cmFuc2Zvcm0ueX0pIHNjYWxlKCR7dHJhbnNmb3JtLmt9KWBcbiAgICAgICk7XG4gICAgICBjdXJyZW50Wm9vbSA9IHRyYW5zZm9ybTtcbiAgICAgIHpvb21lZEluaXQgPSB0cnVlO1xuICAgICAgdXBkYXRlWm9vbUxldmVsKCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHpvb20gPSBkM1xuICAgICAgLnpvb20oKVxuICAgICAgLnNjYWxlRXh0ZW50KFswLjUsIDEuNV0pXG4gICAgICAub24oJ3N0YXJ0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoJ2N1cnNvcicsIHRoaXMuem9vbSA/IG51bGwgOiAnZ3JhYmJpbmcnKTtcbiAgICAgIH0pXG4gICAgICAub24oJ3pvb20nLCB0aGlzLnpvb20gPyB6b29tZWQgOiBudWxsKVxuICAgICAgLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZSgnY3Vyc29yJywgJ2dyYWInKTtcbiAgICAgIH0pO1xuICAgIHN2Z1xuICAgICAgLmNhbGwoem9vbSlcbiAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ2dyYWInKVxuICAgICAgLm9uKHRoaXMuem9vbSA/IG51bGwgOiAnd2hlZWwuem9vbScsIG51bGwpXG4gICAgICAub24oJ2RibGNsaWNrLnpvb20nLCBudWxsKTtcbiAgICB6b29tLmZpbHRlcigoKSA9PiAhZDMuZXZlbnQuc2hpZnRLZXkpO1xuXG4gICAgLy8gWm9vbSBidXR0b24gY29udHJvbHNcbiAgICBkMy5zZWxlY3QoJyN6b29tX2luJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgem9vbS5zY2FsZUJ5KHN2Zy50cmFuc2l0aW9uKCkuZHVyYXRpb24oNzUwKSwgMS4yKTtcbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH0pO1xuICAgIGQzLnNlbGVjdCgnI3pvb21fb3V0Jykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgem9vbS5zY2FsZUJ5KHN2Zy50cmFuc2l0aW9uKCkuZHVyYXRpb24oNzUwKSwgMC44KTtcbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH0pO1xuICAgIGQzLnNlbGVjdCgnI3pvb21fcmVzZXQnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICB6b29tLnNjYWxlVG8oc3ZnLnRyYW5zaXRpb24oKS5kdXJhdGlvbig3NTApLCAxKTtcbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH0pO1xuICAgIC8vIFpvb20gdG8gZml0IGZ1bmN0aW9uIGFuZCBCdXR0b25cbiAgICBjb25zdCBoYW5kbGVab29tVG9GaXQgPSAoKSA9PiB7XG4gICAgICBjb25zdCBub2RlQkJveCA9IHpvb21Db250YWluZXIubm9kZSgpLmdldEJCb3goKTtcblxuICAgICAgLy8gQ2FsY3VsYXRlIHNjYWxlIGFuZCB0cmFuc2xhdGUgdmFsdWVzIHRvIGZpdCBhbGwgbm9kZXNcbiAgICAgIGNvbnN0IHBhZGRpbmcgPSAzMDtcbiAgICAgIGNvbnN0IHNjYWxlWCA9IChwYXJlbnRXaWR0aCAtIHBhZGRpbmcgKiAyKSAvIG5vZGVCQm94LndpZHRoO1xuICAgICAgY29uc3Qgc2NhbGVZID0gKHBhcmVudEhlaWdodCAtIHBhZGRpbmcgKiAyKSAvIG5vZGVCQm94LmhlaWdodDtcbiAgICAgIGNvbnN0IHNjYWxlID0gTWF0aC5taW4oc2NhbGVYLCBzY2FsZVksIDEuMCk7IC8vIFJlc3RyaWN0IHNjYWxlIHRvIGEgbWF4aW11bSBvZiAxLjBcblxuICAgICAgY29uc3QgdHJhbnNsYXRlWCA9XG4gICAgICAgIC1ub2RlQkJveC54ICogc2NhbGUgKyAocGFyZW50V2lkdGggLSBub2RlQkJveC53aWR0aCAqIHNjYWxlKSAvIDI7XG4gICAgICBjb25zdCB0cmFuc2xhdGVZID1cbiAgICAgICAgLW5vZGVCQm94LnkgKiBzY2FsZSArIChwYXJlbnRIZWlnaHQgLSBub2RlQkJveC5oZWlnaHQgKiBzY2FsZSkgLyAyO1xuXG4gICAgICAvLyBHZXQgdGhlIGJvdW5kaW5nIGJveCBvZiBhbGwgbm9kZXNcbiAgICAgIGNvbnN0IGFsbE5vZGVzID0gem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKTtcbiAgICAgIGNvbnN0IGFsbE5vZGVzQkJveCA9IGFsbE5vZGVzLm5vZGVzKCkucmVkdWNlKFxuICAgICAgICAoYWNjLCBub2RlKSA9PiB7XG4gICAgICAgICAgY29uc3Qgbm9kZUJCb3ggPSBub2RlLmdldEJCb3goKTtcbiAgICAgICAgICBhY2MueCA9IE1hdGgubWluKGFjYy54LCBub2RlQkJveC54KTtcbiAgICAgICAgICBhY2MueSA9IE1hdGgubWluKGFjYy55LCBub2RlQkJveC55KTtcbiAgICAgICAgICBhY2Mud2lkdGggPSBNYXRoLm1heChhY2Mud2lkdGgsIG5vZGVCQm94LnggKyBub2RlQkJveC53aWR0aCk7XG4gICAgICAgICAgYWNjLmhlaWdodCA9IE1hdGgubWF4KGFjYy5oZWlnaHQsIG5vZGVCQm94LnkgKyBub2RlQkJveC5oZWlnaHQpO1xuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sXG4gICAgICAgIHsgeDogSW5maW5pdHksIHk6IEluZmluaXR5LCB3aWR0aDogLUluZmluaXR5LCBoZWlnaHQ6IC1JbmZpbml0eSB9XG4gICAgICApO1xuXG4gICAgICAvLyBDaGVjayBpZiBhbGwgbm9kZXMgYXJlIHdpdGhpbiB0aGUgdmlld2FibGUgY29udGFpbmVyXG4gICAgICBpZiAoXG4gICAgICAgIGFsbE5vZGVzQkJveC54ICogc2NhbGUgPj0gMCAmJlxuICAgICAgICBhbGxOb2Rlc0JCb3gueSAqIHNjYWxlID49IDAgJiZcbiAgICAgICAgYWxsTm9kZXNCQm94LndpZHRoICogc2NhbGUgPD0gcGFyZW50V2lkdGggJiZcbiAgICAgICAgYWxsTm9kZXNCQm94LmhlaWdodCAqIHNjYWxlIDw9IHBhcmVudEhlaWdodFxuICAgICAgKSB7XG4gICAgICAgIC8vIEFsbCBub2RlcyBhcmUgd2l0aGluIHRoZSB2aWV3YWJsZSBjb250YWluZXIsIG5vIG5lZWQgdG8gYXBwbHkgem9vbSB0cmFuc2Zvcm1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBNYW51YWxseSByZXNldCB0aGUgem9vbSB0cmFuc2Zvcm1cbiAgICAgIHpvb21Db250YWluZXJcbiAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAuZHVyYXRpb24oNzUwKVxuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLCAwKSBzY2FsZSgxKScpO1xuXG4gICAgICAvLyBBcHBseSB6b29tIHRyYW5zZm9ybSB0byB6b29tQ29udGFpbmVyXG4gICAgICB6b29tQ29udGFpbmVyXG4gICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgLmR1cmF0aW9uKDc1MClcbiAgICAgICAgLmF0dHIoXG4gICAgICAgICAgJ3RyYW5zZm9ybScsXG4gICAgICAgICAgYHRyYW5zbGF0ZSgke3RyYW5zbGF0ZVh9LCAke3RyYW5zbGF0ZVl9KSBzY2FsZSgke3NjYWxlfSlgXG4gICAgICAgICk7XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudFpvb20gdmFyaWFibGUgd2l0aCB0aGUgbmV3IHRyYW5zZm9ybVxuICAgICAgLy8gem9vbWVkSW5pdCAtIGNyZWF0ZWQgYmVjYXVzZSBpZiB6b29tVG9GaXQgaXMgY2FsbGVkIGJlZm9yZSBhbnl0aGluZyBlbHNlIGl0IHNjcmV3cyB1cCB0aGUgYmFzZSB0cmFuc2Zvcm0gLSBlLmcuIHNob3dDdXJyZW50TWF0Y2hcbiAgICAgIGlmICh6b29tZWRJbml0KSB7XG4gICAgICAgIGN1cnJlbnRab29tLnggPSB0cmFuc2xhdGVYO1xuICAgICAgICBjdXJyZW50Wm9vbS55ID0gdHJhbnNsYXRlWTtcbiAgICAgICAgY3VycmVudFpvb20uayA9IHNjYWxlO1xuICAgICAgfVxuICAgICAgdXBkYXRlWm9vbUxldmVsKCk7XG4gICAgfTtcblxuICAgIGQzLnNlbGVjdCgnI3pvb21fdG9fZml0Jykub24oJ2NsaWNrJywgaGFuZGxlWm9vbVRvRml0KTtcblxuICAgIC8vIENoZWNrIGlmIHpvb20gbGV2ZWwgaXMgYXQgMCUgb3IgMTAwJSBiZWZvcmUgYWxsb3dpbmcgbW91c2V3aGVlbCB6b29tIC0gdGhpcyBzdGFiaWxpc2VzIHRoZSBjYW52YXMgd2hlbiB0aGUgbGltaXQgaXMgcmVhY2hlZFxuICAgIHN2Zy5vbignd2hlZWwnLCAoKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50U2NhbGUgPSBjdXJyZW50Wm9vbS5rO1xuICAgICAgY29uc3QgbWF4U2NhbGUgPSB6b29tLnNjYWxlRXh0ZW50KClbMV07XG4gICAgICBjb25zdCBtaW5TY2FsZSA9IHpvb20uc2NhbGVFeHRlbnQoKVswXTtcbiAgICAgIGlmIChjdXJyZW50U2NhbGUgPT09IG1heFNjYWxlIHx8IGN1cnJlbnRTY2FsZSA9PT0gbWluU2NhbGUpIHtcbiAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFpvb20gRW5kXG5cbiAgICAvLyBGb3IgYXJyb3dzXG4gICAgdGhpcy5pbml0RGVmaW5pdGlvbnMoc3ZnKTtcblxuICAgIGNvbnN0IHNpbXVsYXRpb24gPSB0aGlzLmZvcmNlU2ltdWxhdGlvbihfZDMsIHtcbiAgICAgIHdpZHRoOiArc3ZnLmF0dHIoJ3dpZHRoJyksXG4gICAgICBoZWlnaHQ6ICtzdmcuYXR0cignaGVpZ2h0JyksXG4gICAgfSk7XG5cbiAgICAvLyBCcnVzaCBTdGFydFxuICAgIGxldCBnQnJ1c2hIb2xkZXIgPSBzdmcuYXBwZW5kKCdnJyk7XG5cbiAgICBsZXQgYnJ1c2ggPSBkM1xuICAgICAgLmJydXNoKClcbiAgICAgIC5vbignc3RhcnQnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuYnJ1c2hpbmcgPSB0cnVlO1xuXG4gICAgICAgIG5vZGVFbnRlci5lYWNoKChkKSA9PiB7XG4gICAgICAgICAgZC5wcmV2aW91c2x5U2VsZWN0ZWQgPSB0aGlzLnNoaWZ0S2V5ICYmIGQuc2VsZWN0ZWQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIF9kM1xuICAgICAgICAgIC5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcblxuICAgICAgICAvLyBBcHBseSBzdHlsaW5nIGZvciB0aGUgcmVjdC5zZWxlY3Rpb25cbiAgICAgICAgZDMuc2VsZWN0QWxsKCdyZWN0LnNlbGVjdGlvbicpXG4gICAgICAgICAgLnN0eWxlKCdzdHJva2UnLCAnbm9uZScpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJ3N0ZWVsYmx1ZScpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsLW9wYWNpdHknLCAwLjQpO1xuICAgICAgfSlcbiAgICAgIC5vbignYnJ1c2gnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuZXh0ZW50ID0gZDMuZXZlbnQuc2VsZWN0aW9uO1xuICAgICAgICBpZiAoIWQzLmV2ZW50LnNvdXJjZUV2ZW50IHx8ICF0aGlzLmV4dGVudCB8fCAhdGhpcy5icnVzaE1vZGUpIHJldHVybjtcbiAgICAgICAgaWYgKCFjdXJyZW50Wm9vbSkgcmV0dXJuO1xuXG4gICAgICAgIG5vZGVFbnRlclxuICAgICAgICAgIC5jbGFzc2VkKCdzZWxlY3RlZCcsIChkKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gKGQuc2VsZWN0ZWQgPVxuICAgICAgICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCBeXG4gICAgICAgICAgICAgICg8YW55PihcbiAgICAgICAgICAgICAgICAoZDMuZXZlbnQuc2VsZWN0aW9uWzBdWzBdIDw9XG4gICAgICAgICAgICAgICAgICBkLnggKiBjdXJyZW50Wm9vbS5rICsgY3VycmVudFpvb20ueCAmJlxuICAgICAgICAgICAgICAgICAgZC54ICogY3VycmVudFpvb20uayArIGN1cnJlbnRab29tLnggPFxuICAgICAgICAgICAgICAgICAgZDMuZXZlbnQuc2VsZWN0aW9uWzFdWzBdICYmXG4gICAgICAgICAgICAgICAgICBkMy5ldmVudC5zZWxlY3Rpb25bMF1bMV0gPD1cbiAgICAgICAgICAgICAgICAgIGQueSAqIGN1cnJlbnRab29tLmsgKyBjdXJyZW50Wm9vbS55ICYmXG4gICAgICAgICAgICAgICAgICBkLnkgKiBjdXJyZW50Wm9vbS5rICsgY3VycmVudFpvb20ueSA8XG4gICAgICAgICAgICAgICAgICBkMy5ldmVudC5zZWxlY3Rpb25bMV1bMV0pXG4gICAgICAgICAgICAgICkpKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zZWxlY3QoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgLmNsYXNzZWQoJ3NlbGVjdGVkJywgKGQpID0+IGQuc2VsZWN0ZWQpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgKGQpID0+IChkLnNlbGVjdGVkID8gJ2JsdWUnIDogJyM5OTknKSlcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgKGQpID0+IChkLnNlbGVjdGVkID8gNzAwIDogNDAwKSk7XG5cbiAgICAgICAgdGhpcy5leHRlbnQgPSBkMy5ldmVudC5zZWxlY3Rpb247XG4gICAgICB9KVxuICAgICAgLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgIGlmICghZDMuZXZlbnQuc291cmNlRXZlbnQgfHwgIXRoaXMuZXh0ZW50IHx8ICF0aGlzLmdCcnVzaCkgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMuZ0JydXNoLmNhbGwoYnJ1c2gubW92ZSwgbnVsbCk7XG4gICAgICAgIGlmICghdGhpcy5icnVzaE1vZGUpIHtcbiAgICAgICAgICAvLyB0aGUgc2hpZnQga2V5IGhhcyBiZWVuIHJlbGVhc2UgYmVmb3JlIHdlIGVuZGVkIG91ciBicnVzaGluZ1xuICAgICAgICAgIHRoaXMuZ0JydXNoLnJlbW92ZSgpO1xuICAgICAgICAgIHRoaXMuZ0JydXNoID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJydXNoaW5nID0gZmFsc2U7XG5cbiAgICAgICAgbm9kZUVudGVyXG4gICAgICAgICAgLnNlbGVjdCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuY2xhc3NlZCgnc2VsZWN0ZWQnKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcbiAgICAgIH0pO1xuXG4gICAgbGV0IGtleXVwID0gKCkgPT4ge1xuICAgICAgdGhpcy5zaGlmdEtleSA9IGZhbHNlO1xuICAgICAgdGhpcy5icnVzaE1vZGUgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLmdCcnVzaCAmJiAhdGhpcy5icnVzaGluZykge1xuICAgICAgICAvLyBvbmx5IHJlbW92ZSB0aGUgYnJ1c2ggaWYgd2UncmUgbm90IGFjdGl2ZWx5IGJydXNoaW5nXG4gICAgICAgIC8vIG90aGVyd2lzZSBpdCdsbCBiZSByZW1vdmVkIHdoZW4gdGhlIGJydXNoaW5nIGVuZHNcbiAgICAgICAgdGhpcy5nQnJ1c2gucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuZ0JydXNoID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgbGV0IGtleWRvd24gPSAoKSA9PiB7XG4gICAgICAvLyBBbGxvd3MgdXMgdG8gdHVybiBvZmYgZGVmYXVsdCBsaXN0ZW5lcnMgZm9yIGtleU1vZGlmaWVycyhzaGlmdClcbiAgICAgIGJydXNoLmZpbHRlcigoKSA9PiBkMy5ldmVudC5zaGlmdEtleSk7XG4gICAgICBicnVzaC5rZXlNb2RpZmllcnMoZmFsc2UpO1xuICAgICAgLy8gaG9sZGluZyBzaGlmdCBrZXlcbiAgICAgIGlmIChkMy5ldmVudC5rZXlDb2RlID09PSAxNikge1xuICAgICAgICB0aGlzLnNoaWZ0S2V5ID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIXRoaXMuZ0JydXNoKSB7XG4gICAgICAgICAgdGhpcy5icnVzaE1vZGUgPSB0cnVlO1xuICAgICAgICAgIHRoaXMuZ0JydXNoID0gZ0JydXNoSG9sZGVyLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ2JydXNoJyk7XG4gICAgICAgICAgdGhpcy5nQnJ1c2guY2FsbChicnVzaCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZDMuc2VsZWN0KCdib2R5Jykub24oJ2tleWRvd24nLCBrZXlkb3duKS5vbigna2V5dXAnLCBrZXl1cCk7XG4gICAgLy8gQnJ1c2ggRW5kXG5cbiAgICBjb25zdCBmaWx0ZXJlZExpbmUgPSB0aGlzLmxpbmtzLmZpbHRlcihcbiAgICAgICh7IHNvdXJjZSwgdGFyZ2V0IH0sIGluZGV4LCBsaW5rc0FycmF5KSA9PiB7XG4gICAgICAgIC8vIEZpbHRlciBvdXQgYW55IG9iamVjdHMgdGhhdCBoYXZlIG1hdGNoaW5nIHNvdXJjZSBhbmQgdGFyZ2V0IHByb3BlcnR5IHZhbHVlc1xuICAgICAgICAvLyBUbyBkaXNwbGF5IG9ubHkgb25lIGxpbmUgKHBhcmVudExpbmVTdHlsZSkgLSByZW1vdmVzIGh0bWwgYmxvYXQgYW5kIGEgZGFya2VuZWQgbGluZVxuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgIGluZGV4ID09PVxuICAgICAgICAgIGxpbmtzQXJyYXkuZmluZEluZGV4KFxuICAgICAgICAgICAgKG9iaikgPT4gb2JqLnNvdXJjZSA9PT0gc291cmNlICYmIG9iai50YXJnZXQgPT09IHRhcmdldFxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3QgbGluayA9IHpvb21Db250YWluZXIuc2VsZWN0QWxsKCkuZGF0YShmaWx0ZXJlZExpbmUsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gZC5pZDtcbiAgICB9KTtcblxuICAgIHpvb21Db250YWluZXIuc2VsZWN0QWxsKCdsaW5lJykuZGF0YShsaW5rKS5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICBjb25zdCBsaW5rRW50ZXIgPSBsaW5rXG4gICAgICAuam9pbignbGluZScpXG4gICAgICAuc3R5bGUoJ3N0cm9rZScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmIChkLnBhcmVudExpbmVTdHlsZSA9PT0gJ1NvbGlkJykge1xuICAgICAgICAgIHJldHVybiAnIzc3Nyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuICcjYjRiNGI0JztcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdHlsZSgnc3Ryb2tlLW9wYWNpdHknLCAnLjYnKVxuICAgICAgLnN0eWxlKCdzdHJva2UtZGFzaGFycmF5JywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKGQucGFyZW50TGluZVN0eWxlID09PSAnRG90dGVkJykge1xuICAgICAgICAgIHJldHVybiAnOCw1JztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pXG4gICAgICAuc3R5bGUoJ3N0cm9rZS13aWR0aCcsICcycHgnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2xpbmsnKVxuICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3Qgc3VmZml4ID0gJ19saW5lJztcbiAgICAgICAgY29uc3Qgc291cmNlID0gZC5zb3VyY2UgPyBkLnNvdXJjZSA6ICcnO1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBkLnRhcmdldCA/IGQudGFyZ2V0IDogJyc7XG4gICAgICAgIHJldHVybiBgJHtzb3VyY2V9XyR7dGFyZ2V0fSR7c3VmZml4fWA7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ21hcmtlci1lbmQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoZC5wYXJlbnRUYXJnZXRBcnJvdyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIHJldHVybiAndXJsKCNhcnJvd2hlYWRUYXJnZXQpJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignbWFya2VyLXN0YXJ0JywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKGQucGFyZW50U291cmNlQXJyb3cgPT09IHRydWUpIHtcbiAgICAgICAgICByZXR1cm4gJ3VybCgjYXJyb3doZWFkU291cmNlKSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9KTtcblxuICAgIGxpbmsuYXBwZW5kKCd0aXRsZScpLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLmxhYmVsO1xuICAgIH0pO1xuXG4gICAgY29uc3QgZWRnZXBhdGhzID0gem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoKS5kYXRhKHRoaXMubGlua3MsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gZC5pZDtcbiAgICB9KTtcblxuICAgIHpvb21Db250YWluZXIuc2VsZWN0QWxsKCdwYXRoJykuZGF0YShlZGdlcGF0aHMpLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgIGNvbnN0IGVkZ2VwYXRoc0VudGVyID0gZWRnZXBhdGhzXG4gICAgICAuam9pbignc3ZnOnBhdGgnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2VkZ2VwYXRoJylcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAwKVxuICAgICAgLmF0dHIoJ3N0cm9rZS1vcGFjaXR5JywgMClcbiAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgIHJldHVybiAnZWRnZXBhdGgnICsgaTtcbiAgICAgIH0pO1xuXG4gICAgY29uc3QgZWRnZWxhYmVscyA9IHpvb21Db250YWluZXIuc2VsZWN0QWxsKCkuZGF0YSh0aGlzLmxpbmtzLCBmdW5jdGlvbiAoZCkge1xuICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgfSk7XG5cbiAgICB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgndGV4dCcpLmRhdGEoZWRnZWxhYmVscykuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgY29uc3QgZWRnZWxhYmVsc0VudGVyID0gZWRnZWxhYmVsc1xuICAgICAgLmVudGVyKClcbiAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2VkZ2VsYWJlbCcpXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAnX3RleHQnO1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBkLnNvdXJjZSA/IGQuc291cmNlIDogJyc7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGQudGFyZ2V0ID8gZC50YXJnZXQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke3NvdXJjZX1fJHt0YXJnZXR9JHtzdWZmaXh9YDtcbiAgICAgIH0pXG4gICAgICAuc3R5bGUoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXG4gICAgICAuYXR0cignZm9udC1zaXplJywgMTQpXG4gICAgICAuYXR0cignZHknLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5keTtcbiAgICAgIH0pO1xuXG5cbiAgICBlZGdlbGFiZWxzRW50ZXJcbiAgICAgIC5hcHBlbmQoJ3RleHRQYXRoJylcbiAgICAgIC5hdHRyKCd4bGluazpocmVmJywgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgcmV0dXJuICcjZWRnZXBhdGgnICsgaTtcbiAgICAgIH0pXG4gICAgICAuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJylcbiAgICAgIC5hdHRyKCdkb21pbmFudC1iYXNlbGluZScsICdib3R0b20nKVxuICAgICAgLmF0dHIoJ3N0YXJ0T2Zmc2V0JywgJzUwJScpXG4gICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5sYWJlbDtcbiAgICAgIH0pO1xuXG4gICAgZWRnZWxhYmVsc0VudGVyXG4gICAgICAuc2VsZWN0QWxsKCd0ZXh0UGF0aCcpXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmxpbmtJY29uO1xuICAgICAgfSlcbiAgICAgIC5hcHBlbmQoJ3RzcGFuJylcbiAgICAgIC5zdHlsZSgnZmlsbCcsICcjODU2NDA0JylcbiAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCAnNzAwJylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdmYScpXG4gICAgICAudGV4dCgnIFxcdWYwYzEnKTtcbiAgICAvLyBvbiBub3JtYWwgbGFiZWwgbGluayBjbGljayAtIGhpZ2hsaWdodCBsYWJlbHNcbiAgICBzdmcuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIF9kMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgIG5vZGVFbnRlci5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGQuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgZC5wcmV2aW91c2x5U2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgIH0pO1xuICAgICAgbm9kZS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKVxuICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgX2QzLnNlbGVjdCh0aGlzKS5zdHlsZSgnZmlsbCcsICdibHVlJykuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNzAwKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IG5vZGUgPSB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgpLmRhdGEodGhpcy5ub2RlcywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLmlkO1xuICAgIH0pO1xuXG4gICAgem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoJ2cnKS5kYXRhKG5vZGUpLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgIGNvbnN0IG5vZGVFbnRlciA9IG5vZGVcbiAgICAgIC5qb2luKCdnJylcbiAgICAgIC5jYWxsKFxuICAgICAgICBfZDNcbiAgICAgICAgICAuZHJhZygpXG4gICAgICAgICAgLm9uKCdzdGFydCcsIGZ1bmN0aW9uIGRyYWdzdGFydGVkKGQpIHtcbiAgICAgICAgICAgIC8vIEVuYWJsZSB0aGUgc2F2ZSAmIHJlc2V0IGJ0blxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmVfZ3JhcGgnKS5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIGlmICghX2QzLmV2ZW50LmFjdGl2ZSkgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwLjkpLnJlc3RhcnQoKTtcblxuICAgICAgICAgICAgaWYgKCFkLnNlbGVjdGVkICYmICF0aGlzLnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICAgIC8vIGlmIHRoaXMgbm9kZSBpc24ndCBzZWxlY3RlZCwgdGhlbiB3ZSBoYXZlIHRvIHVuc2VsZWN0IGV2ZXJ5IG90aGVyIG5vZGVcbiAgICAgICAgICAgICAgbm9kZUVudGVyLmNsYXNzZWQoJ3NlbGVjdGVkJywgZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHAuc2VsZWN0ZWQgPSBwLnByZXZpb3VzbHlTZWxlY3RlZCA9IGZhbHNlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgc2VsZWN0ZWQgc3R5bGluZyBvbiBvdGhlciBub2RlcyBhbmQgbGFiZWxzIHdoZW4gd2UgZHJhZyBhIG5vbi1zZWxlY3RlZCBub2RlXG4gICAgICAgICAgICAgIF9kM1xuICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKVxuICAgICAgICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcbiAgICAgICAgICAgICAgX2QzXG4gICAgICAgICAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9kMy5zZWxlY3QodGhpcykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmdW5jdGlvbiAocCkge1xuICAgICAgICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9IGQuc2VsZWN0ZWQ7XG4gICAgICAgICAgICAgIHJldHVybiAoZC5zZWxlY3RlZCA9IHRydWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIG5vZGVFbnRlclxuICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQuc2VsZWN0ZWQ7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgZC5meCA9IGQueDtcbiAgICAgICAgICAgICAgICBkLmZ5ID0gZC55O1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vbignZHJhZycsIGZ1bmN0aW9uIGRyYWdnZWQoZCkge1xuICAgICAgICAgICAgbm9kZUVudGVyXG4gICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5zZWxlY3RlZDtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBkLmZ4ICs9IF9kMy5ldmVudC5keDtcbiAgICAgICAgICAgICAgICBkLmZ5ICs9IF9kMy5ldmVudC5keTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAub24oJ2VuZCcsIGZ1bmN0aW9uIGRyYWdlbmRlZChkKSB7XG4gICAgICAgICAgICBpZiAoIV9kMy5ldmVudC5hY3RpdmUpIHtcbiAgICAgICAgICAgICAgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwLjMpLnJlc3RhcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGQuZnggPSBkLng7XG4gICAgICAgICAgICBkLmZ5ID0gZC55O1xuICAgICAgICAgICAgLy8gU3Vic2NyaWJlcyB0byB1cGRhdGVkIGdyYXBoIHBvc2l0aW9ucyBmb3Igc2F2ZVxuICAgICAgICAgICAgc2VsZi5zYXZlR3JhcGhEYXRhLm5leHQoZGF0YSk7XG4gICAgICAgICAgfSlcbiAgICAgIClcbiAgICAgIC5hdHRyKCdjbGFzcycsICdub2RlLXdyYXBwZXInKVxuICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgICB9KTtcblxuICAgIC8vIG5vIGNvbGxpc2lvbiAtIGFscmVhZHkgdXNpbmcgdGhpcyBpbiBzdGF0ZW1lbnRcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIC8vIG5vZGUgY2xpY2sgYW5kIGN0cmwgKyBjbGlja1xuICAgIHN2Zy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZCkge1xuICAgICAgLy8gc28gd2UgZG9uJ3QgYWN0aXZhdGUgdGhlIGNhbnZhcyAuY2xpY2sgZXZlbnRcbiAgICAgIF9kMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgLy8gc2V0dGluZyB0aGUgc2VsZWN0IGF0dHJpYnV0ZSB0byB0aGUgb2JqZWN0IG9uIHNpbmdsZSBzZWxlY3Qgc28gd2UgY2FuIGRyYWcgdGhlbVxuICAgICAgZC5zZWxlY3RlZCA9IHRydWU7XG5cbiAgICAgIHN2Zy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdzZWxlY3RlZCcsIHRydWUpO1xuICAgICAgbm9kZUVudGVyLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgZC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIHJlbW92ZSBzdHlsZSBmcm9tIHNlbGVjdGVkIG5vZGUgYmVmb3JlIHRoZSBjbGFzcyBpcyByZW1vdmVkXG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdEFsbCgnLnNlbGVjdGVkJylcbiAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcbiAgICAgIC8vIFJlbW92ZSBzdHlsZXMgZnJvbSBhbGwgb3RoZXIgbm9kZXMgYW5kIGxhYmVscyBvbiBzaW5nbGUgbGVmdCBjbGlja1xuICAgICAgX2QzLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgLy8gQWRkIHN0eWxlIG9uIHNpbmdsZSBsZWZ0IGNsaWNrXG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdCh0aGlzKVxuICAgICAgICAuc2VsZWN0KCcubm9kZVRleHQnKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnYmx1ZScpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA3MDApO1xuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9KTtcblxuICAgIC8vY2xpY2sgb24gY2FudmFzIHRvIHJlbW92ZSBzZWxlY3RlZCBub2Rlc1xuICAgIF9kMy5zZWxlY3QoJ3N2ZycpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgIG5vZGVFbnRlci5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGQuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgZC5wcmV2aW91c2x5U2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgIH0pO1xuICAgICAgbm9kZS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKVxuICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgX2QzLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgfSk7XG5cbiAgICBub2RlRW50ZXJcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKCFkLmltYWdlVXJsIHx8IGQuaW1hZ2VVcmwgPT09ICcnKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLmFwcGVuZCgnaW1hZ2UnKVxuICAgICAgLmF0dHIoJ3hsaW5rOmhyZWYnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5pbWFnZVVybDtcbiAgICAgIH0pXG4gICAgICAuYXR0cigneCcsIC0xNSlcbiAgICAgIC5hdHRyKCd5JywgLTYwKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3Qgc3VmZml4ID0gJ2ltYWdlJztcbiAgICAgICAgY29uc3QgaWQgPSBkLmlkID8gZC5pZCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7aWR9XyR7c3VmZml4fWA7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3QgaWQgPSBkLmlkID8gZC5pZCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7aWR9YDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignd2lkdGgnLCAzMilcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCAzMilcbiAgICAgIC5hdHRyKCdjbGFzcycsICdpbWFnZScpXG4gICAgICAuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJyk7XG5cbiAgICBub2RlRW50ZXJcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKCFkLmljb24gfHwgZC5pY29uID09PSAnJykge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQuaWNvbjtcbiAgICAgIH0pXG4gICAgICAuYXR0cigneCcsIC0xOClcbiAgICAgIC5hdHRyKCd5JywgLTMwKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3Qgc3VmZml4ID0gJ2ljb24nO1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1fJHtzdWZmaXh9IGZhYDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1gO1xuICAgICAgfSlcbiAgICAgIC5zdHlsZSgnZm9udC1zaXplJywgJzM1cHgnKVxuICAgICAgLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpO1xuXG4gICAgY29uc3Qgbm9kZVRleHQgPSBub2RlRW50ZXJcbiAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAgICAgLmF0dHIoJ2lkJywgJ25vZGVUZXh0JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdub2RlVGV4dCcpXG4gICAgICAuc3R5bGUoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXG4gICAgICAuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJylcbiAgICAgIC5hdHRyKCdkeScsIC0zKVxuICAgICAgLmF0dHIoJ3knLCAtMjUpXG4gICAgICAuYXR0cigndGVzdGhvb2snLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAndGV4dCc7XG4gICAgICAgIGNvbnN0IGlkID0gZC5pZCA/IGQuaWQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke2lkfV8ke3N1ZmZpeH1gO1xuICAgICAgfSk7XG5cbiAgICBub2RlVGV4dFxuICAgICAgLnNlbGVjdEFsbCgndHNwYW4udGV4dCcpXG4gICAgICAuZGF0YSgoZCkgPT4gZC5sYWJlbClcbiAgICAgIC5lbnRlcigpXG4gICAgICAuYXBwZW5kKCd0c3BhbicpXG4gICAgICAuYXR0cignY2xhc3MnLCAnbm9kZVRleHRUc3BhbicpXG4gICAgICAudGV4dCgoZCkgPT4gZClcbiAgICAgIC5zdHlsZSgnZm9udC1zaXplJywgJzE0cHgnKVxuICAgICAgLmF0dHIoJ3gnLCAtMTApXG4gICAgICAuYXR0cignZHgnLCAxMClcbiAgICAgIC5hdHRyKCdkeScsIDE1KTtcblxuICAgIG5vZGVFbnRlclxuICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoIWQuYWRkaXRpb25hbEljb24pIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9ICdhZGRpdGlvbmFsSWNvbic7XG4gICAgICAgIGNvbnN0IGlkID0gZC5pZCA/IGQuaWQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke2lkfV8ke3N1ZmZpeH1gO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDEwMClcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCAyNSlcbiAgICAgIC5hdHRyKCd4JywgMzApXG4gICAgICAuYXR0cigneScsIC01MClcbiAgICAgIC5hdHRyKCdjbGFzcycsICdmYScpXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzg1NjQwNCcpXG4gICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5hZGRpdGlvbmFsSWNvbjtcbiAgICAgIH0pO1xuXG4gICAgLy8gdHJhbnNpdGlvbiBlZmZlY3RzIGZvciBuZXcgcHVsc2F0aW5nIG5vZGVzXG4gICAgbm9kZUVudGVyXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmICghZC5uZXdJdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLnNlbGVjdCgndGV4dCcpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCdmaWxsJywgJ2JsdWUnKVxuICAgICAgLmF0dHIoJ2ZvbnQtd2VpZ2h0JywgNzAwKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDEpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCdmaWxsJywgJ2JsdWUnKVxuICAgICAgLmF0dHIoJ2ZvbnQtd2VpZ2h0JywgNzAwKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDAuMSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnYmx1ZScpXG4gICAgICAuYXR0cignZm9udC13ZWlnaHQnLCA3MDApXG4gICAgICAuYXR0cignZmlsbC1vcGFjaXR5JywgMSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnYmx1ZScpXG4gICAgICAuYXR0cignZm9udC13ZWlnaHQnLCA3MDApXG4gICAgICAuYXR0cignZmlsbC1vcGFjaXR5JywgMC4xKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignZmlsbCcsICdibHVlJylcbiAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsIDcwMClcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAxKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignZmlsbCcsICcjMjEyNTI5JylcbiAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsIDQwMClcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAxKVxuICAgICAgLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkMy5zZWxlY3QodGhpcykuY2FsbChfZDMudHJhbnNpdGlvbik7XG4gICAgICB9KTtcblxuICAgIG5vZGVFbnRlclxuICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoIWQubmV3SXRlbSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5zZWxlY3QoJ2ltYWdlJylcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgNDUpXG4gICAgICAuYXR0cignaGVpZ2h0JywgNDUpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDMyKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDMyKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignd2lkdGgnLCA0NSlcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCA0NSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgMzIpXG4gICAgICAuYXR0cignaGVpZ2h0JywgMzIpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDQ1KVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDQ1KVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignd2lkdGgnLCAzMilcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCAzMilcbiAgICAgIC5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLmNhbGwoZDMudHJhbnNpdGlvbik7XG4gICAgICB9KTtcblxuICAgIC8vIFJlbW92ZSB0aGUgbmV3Q2xhc3Mgc28gdGhleSBkb24ndCBhbmltYXRlIG5leHQgdGltZVxuICAgIHRoaXMubm9kZXMgPSB0aGlzLnJlbW92ZU5ld0l0ZW0odGhpcy5ub2Rlcyk7XG5cbiAgICBub2RlRW50ZXIuYXBwZW5kKCd0aXRsZScpLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLmxhYmVsO1xuICAgIH0pO1xuXG4gICAgY29uc3QgbWF4VGlja3MgPSAzMDtcbiAgICBsZXQgdGlja0NvdW50ID0gMDtcbiAgICBsZXQgem9vbVRvRml0Q2FsbGVkID0gZmFsc2U7XG5cbiAgICBzaW11bGF0aW9uLm5vZGVzKHRoaXMubm9kZXMpLm9uKCd0aWNrJywgKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuem9vbVRvRml0ICYmIHRpY2tDb3VudCA+PSBtYXhUaWNrcyAmJiAhem9vbVRvRml0Q2FsbGVkKSB7XG4gICAgICAgIHNpbXVsYXRpb24uc3RvcCgpO1xuICAgICAgICBoYW5kbGVab29tVG9GaXQoKTtcbiAgICAgICAgem9vbVRvRml0Q2FsbGVkID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudGlja2VkKGxpbmtFbnRlciwgbm9kZUVudGVyLCBlZGdlcGF0aHNFbnRlcik7XG4gICAgICAgIHRpY2tDb3VudCsrO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgc2ltdWxhdGlvbi5mb3JjZSgnbGluaycpLmxpbmtzKHRoaXMubGlua3MpO1xuICAgIHNlbGYuc2F2ZUdyYXBoRGF0YS5uZXh0KGRhdGEpO1xuICB9XG5cbiAgcHVibGljIHJlc2V0R3JhcGgoaW5pdGlhbERhdGEsIGVsZW1lbnQsIHpvb20sIHpvb21Ub0ZpdCkge1xuICAgIC8vIFJlc2V0IHRoZSBkYXRhIHRvIGl0cyBpbml0aWFsIHN0YXRlXG4gICAgdGhpcy5ub2RlcyA9IFtdO1xuICAgIHRoaXMubGlua3MgPSBbXTtcbiAgICAvLyBDYWxsIHRoZSB1cGRhdGUgbWV0aG9kIGFnYWluIHRvIHJlLXNpbXVsYXRlIHRoZSBncmFwaCB3aXRoIHRoZSBuZXcgZGF0YVxuICAgIHRoaXMudXBkYXRlKGluaXRpYWxEYXRhLCBlbGVtZW50LCB6b29tLCB6b29tVG9GaXQpO1xuICB9XG59XG4iXX0=