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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzdWFsaXNlci1ncmFwaC5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LXJlbGF0aW9uc2hpcC12aXN1YWxpc2VyLWxpYi9saWIvdmlzdWFsaXNlci9zZXJ2aWNlcy92aXN1YWxpc2VyLWdyYXBoLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sTUFBTSxDQUFDOzs7QUFNckMsTUFBTSxPQUFPLHNCQUFzQjtJQUNiO0lBQXBCLFlBQW9CLFlBQTBCO1FBQTFCLGlCQUFZLEdBQVosWUFBWSxDQUFjO0lBQUksQ0FBQztJQUM1QyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQ1gsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNYLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDZCxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQ2xCLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDakIsUUFBUSxDQUFDO0lBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQztJQUNkLElBQUksR0FBRyxLQUFLLENBQUM7SUFDYixTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQ2xCLGFBQWEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO0lBRXBDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTO1FBQzFDLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVB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LFVBQVU7bUJBQUM7b0JBQ1YsVUFBVSxFQUFFLE1BQU07aUJBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0ICogYXMgZDMgZnJvbSAnZDMnO1xuaW1wb3J0IHsgUmVwbGF5U3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgRGV4aWVTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vZGIvZ3JhcGhEYXRhYmFzZSc7XG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnLFxufSlcbmV4cG9ydCBjbGFzcyBWaXN1YWxpc2VyR3JhcGhTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBkZXhpZVNlcnZpY2U6IERleGllU2VydmljZSkgeyB9XG4gIHB1YmxpYyBsaW5rcyA9IFtdO1xuICBwdWJsaWMgbm9kZXMgPSBbXTtcbiAgcHVibGljIGdCcnVzaCA9IG51bGw7XG4gIHB1YmxpYyBicnVzaE1vZGUgPSBmYWxzZTtcbiAgcHVibGljIGJydXNoaW5nID0gZmFsc2U7XG4gIHB1YmxpYyBzaGlmdEtleTtcbiAgcHVibGljIGV4dGVudCA9IG51bGw7XG4gIHB1YmxpYyB6b29tID0gZmFsc2U7XG4gIHB1YmxpYyB6b29tVG9GaXQgPSBmYWxzZTtcbiAgcHVibGljIHNhdmVHcmFwaERhdGEgPSBuZXcgUmVwbGF5U3ViamVjdCgpO1xuXG4gIHB1YmxpYyB1cGRhdGUoZGF0YSwgZWxlbWVudCwgem9vbSwgem9vbVRvRml0KSB7XG4gICAgY29uc3Qgc3ZnID0gZDMuc2VsZWN0KGVsZW1lbnQpO1xuICAgIHRoaXMuem9vbSA9IHpvb207XG4gICAgdGhpcy56b29tVG9GaXQgPSB6b29tVG9GaXQ7XG4gICAgcmV0dXJuIHRoaXMuX3VwZGF0ZShkMywgc3ZnLCBkYXRhKTtcbiAgfVxuXG4gIHByaXZhdGUgdGlja2VkKGxpbmssIG5vZGUsIGVkZ2VwYXRocykge1xuICAgIGxpbmsuZWFjaChmdW5jdGlvbiAoZCwgaSwgbikge1xuICAgICAgLy8gVG90YWwgZGlmZmVyZW5jZSBpbiB4IGFuZCB5IGZyb20gc291cmNlIHRvIHRhcmdldFxuICAgICAgbGV0IGRpZmZYID0gZC50YXJnZXQueCAtIGQuc291cmNlLng7XG4gICAgICBsZXQgZGlmZlkgPSBkLnRhcmdldC55IC0gZC5zb3VyY2UueTtcblxuICAgICAgLy8gTGVuZ3RoIG9mIHBhdGggZnJvbSBjZW50ZXIgb2Ygc291cmNlIG5vZGUgdG8gY2VudGVyIG9mIHRhcmdldCBub2RlXG4gICAgICBsZXQgcGF0aExlbmd0aCA9IE1hdGguc3FydChkaWZmWCAqIGRpZmZYICsgZGlmZlkgKiBkaWZmWSk7XG5cbiAgICAgIC8vIHggYW5kIHkgZGlzdGFuY2VzIGZyb20gY2VudGVyIHRvIG91dHNpZGUgZWRnZSBvZiB0YXJnZXQgbm9kZVxuICAgICAgbGV0IG9mZnNldFggPSAoZGlmZlggKiA0MCkgLyBwYXRoTGVuZ3RoO1xuICAgICAgbGV0IG9mZnNldFkgPSAoZGlmZlkgKiA0MCkgLyBwYXRoTGVuZ3RoO1xuXG4gICAgICBkMy5zZWxlY3QobltpXSlcbiAgICAgICAgLmF0dHIoJ3gxJywgZC5zb3VyY2UueCArIG9mZnNldFgpXG4gICAgICAgIC5hdHRyKCd5MScsIGQuc291cmNlLnkgKyBvZmZzZXRZKVxuICAgICAgICAuYXR0cigneDInLCBkLnRhcmdldC54IC0gb2Zmc2V0WClcbiAgICAgICAgLmF0dHIoJ3kyJywgZC50YXJnZXQueSAtIG9mZnNldFkpO1xuICAgIH0pO1xuXG4gICAgbm9kZS5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbiAoZCkge1xuICAgICAgcmV0dXJuIGB0cmFuc2xhdGUoJHtkLnh9LCAke2QueSArIDUwfSlgO1xuICAgIH0pO1xuXG4gICAgLy8gU2V0cyBhIGJvdW5kcnkgZm9yIHRoZSBub2Rlc1xuICAgIC8vIG5vZGUuYXR0cignY3gnLCBmdW5jdGlvbiAoZCkge1xuICAgIC8vICAgcmV0dXJuIChkLnggPSBNYXRoLm1heCg0MCwgTWF0aC5taW4oOTAwIC0gMTUsIGQueCkpKTtcbiAgICAvLyB9KTtcbiAgICAvLyBub2RlLmF0dHIoJ2N5JywgZnVuY3Rpb24gKGQpIHtcbiAgICAvLyAgIHJldHVybiAoZC55ID0gTWF0aC5tYXgoNTAsIE1hdGgubWluKDYwMCAtIDQwLCBkLnkpKSk7XG4gICAgLy8gfSk7XG5cbiAgICBlZGdlcGF0aHMuYXR0cignZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gYE0gJHtkLnNvdXJjZS54fSAke2Quc291cmNlLnl9IEwgJHtkLnRhcmdldC54fSAke2QudGFyZ2V0Lnl9YDtcbiAgICB9KTtcblxuICAgIGVkZ2VwYXRocy5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbiAoZCkge1xuICAgICAgaWYgKGQudGFyZ2V0LnggPCBkLnNvdXJjZS54KSB7XG4gICAgICAgIGNvbnN0IGJib3ggPSB0aGlzLmdldEJCb3goKTtcbiAgICAgICAgY29uc3QgcnggPSBiYm94LnggKyBiYm94LndpZHRoIC8gMjtcbiAgICAgICAgY29uc3QgcnkgPSBiYm94LnkgKyBiYm94LmhlaWdodCAvIDI7XG4gICAgICAgIHJldHVybiBgcm90YXRlKDE4MCAke3J4fSAke3J5fSlgO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICdyb3RhdGUoMCknO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBpbml0RGVmaW5pdGlvbnMoc3ZnKSB7XG4gICAgY29uc3QgZGVmcyA9IHN2Zy5hcHBlbmQoJ2RlZnMnKTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZU1hcmtlcihpZCwgcmVmWCwgcGF0aCkge1xuICAgICAgZGVmc1xuICAgICAgICAuYXBwZW5kKCdtYXJrZXInKVxuICAgICAgICAuYXR0cignaWQnLCBpZClcbiAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCAnLTAgLTUgMTAgMTAnKVxuICAgICAgICAuYXR0cigncmVmWCcsIHJlZlgpXG4gICAgICAgIC5hdHRyKCdyZWZZJywgMClcbiAgICAgICAgLmF0dHIoJ29yaWVudCcsICdhdXRvJylcbiAgICAgICAgLmF0dHIoJ21hcmtlcldpZHRoJywgOClcbiAgICAgICAgLmF0dHIoJ21hcmtlckhlaWdodCcsIDgpXG4gICAgICAgIC5hdHRyKCd4b3ZlcmZsb3cnLCAndmlzaWJsZScpXG4gICAgICAgIC5hcHBlbmQoJ3N2ZzpwYXRoJylcbiAgICAgICAgLmF0dHIoJ2QnLCBwYXRoKVxuICAgICAgICAuYXR0cignZmlsbCcsICcjYjRiNGI0JylcbiAgICAgICAgLnN0eWxlKCdzdHJva2UnLCAnbm9uZScpO1xuICAgIH1cblxuICAgIGNyZWF0ZU1hcmtlcignYXJyb3doZWFkVGFyZ2V0JywgMCwgJ00gMCwtNSBMIDEwICwwIEwgMCw1Jyk7XG4gICAgY3JlYXRlTWFya2VyKCdhcnJvd2hlYWRTb3VyY2UnLCAyLCAnTSAxMCAtNSBMIDAgMCBMIDEwIDUnKTtcblxuICAgIHJldHVybiBzdmc7XG4gIH1cblxuICBwcml2YXRlIGZvcmNlU2ltdWxhdGlvbihfZDMsIHsgd2lkdGgsIGhlaWdodCB9KSB7XG4gICAgcmV0dXJuIF9kM1xuICAgICAgLmZvcmNlU2ltdWxhdGlvbigpXG4gICAgICAudmVsb2NpdHlEZWNheSgwLjEpXG4gICAgICAuZm9yY2UoXG4gICAgICAgICdsaW5rJyxcbiAgICAgICAgX2QzXG4gICAgICAgICAgLmZvcmNlTGluaygpXG4gICAgICAgICAgLmlkKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICByZXR1cm4gZC5pZDtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5kaXN0YW5jZSg1MDApXG4gICAgICAgICAgLnN0cmVuZ3RoKDEpXG4gICAgICApXG4gICAgICAuZm9yY2UoJ2NoYXJnZScsIF9kMy5mb3JjZU1hbnlCb2R5KCkuc3RyZW5ndGgoMC4xKSlcbiAgICAgIC5mb3JjZSgnY2VudGVyJywgX2QzLmZvcmNlQ2VudGVyKHdpZHRoIC8gMiwgaGVpZ2h0IC8gMikpXG4gICAgICAuZm9yY2UoJ2NvbGxpc2lvbicsIF9kMy5mb3JjZUNvbGxpZGUoKS5yYWRpdXMoMTUpKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcGFyZUFuZE1hcmtOb2Rlc05ldyhub2Rlcywgb2xkX25vZGVzKSB7XG4gICAgLy8gQ3JlYXRlIGEgbWFwIG9mIGlkcyB0byBub2RlIG9iamVjdHMgZm9yIHRoZSBvbGRfbm9kZXMgYXJyYXlcbiAgICBjb25zdCBvbGRNYXAgPSBvbGRfbm9kZXMucmVkdWNlKChtYXAsIG5vZGUpID0+IHtcbiAgICAgIG1hcFtub2RlLmlkXSA9IG5vZGU7XG4gICAgICByZXR1cm4gbWFwO1xuICAgIH0sIHt9KTtcblxuICAgIC8vIENoZWNrIGVhY2ggbm9kZSBpbiB0aGUgbm9kZXMgYXJyYXkgdG8gc2VlIGlmIGl0J3MgbmV3IG9yIG5vdFxuICAgIG5vZGVzLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgIGlmICghb2xkTWFwW25vZGUuaWRdKSB7XG4gICAgICAgIC8vIE5vZGUgaXMgbmV3LCBtYXJrIGl0IHdpdGggdGhlIG5ld0l0ZW0gcHJvcGVydHlcbiAgICAgICAgbm9kZS5uZXdJdGVtID0gdHJ1ZTtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBkYWdyZSBjb29yZGluYXRlcyBmcm9tIG5ldyBub2RlcyBzbyB3ZSBjYW4gc2V0IGEgcmFuZG9tIG9uZSBpbiB2aWV3XG4gICAgICAgIG5vZGUuZnggPSBudWxsO1xuICAgICAgICBub2RlLmZ5ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBub2RlcztcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlTmV3SXRlbShub2Rlcykge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgaWYgKG5vZGUuaGFzT3duUHJvcGVydHkoJ25ld0l0ZW0nKSkge1xuICAgICAgICBkZWxldGUgbm9kZS5uZXdJdGVtO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZXM7XG4gIH1cblxuICBwcml2YXRlIHJhbmRvbWlzZU5vZGVQb3NpdGlvbnMobm9kZURhdGEsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICBsZXQgbWluRGlzdGFuY2UgPSAxMDA7XG4gICAgY29uc3QgYXZhaWxhYmxlU3BhY2UgPSB3aWR0aCAqIGhlaWdodDtcbiAgICBsZXQgYWRqdXN0ZWRSZXF1aXJlZFNwYWNlID0gbm9kZURhdGEubGVuZ3RoICogbWluRGlzdGFuY2UgKiBtaW5EaXN0YW5jZTtcblxuICAgIGlmIChhZGp1c3RlZFJlcXVpcmVkU3BhY2UgPiBhdmFpbGFibGVTcGFjZSkge1xuICAgICAgd2hpbGUgKGFkanVzdGVkUmVxdWlyZWRTcGFjZSA+IGF2YWlsYWJsZVNwYWNlICYmIG1pbkRpc3RhbmNlID4gMCkge1xuICAgICAgICBtaW5EaXN0YW5jZSAtPSAxMDtcbiAgICAgICAgYWRqdXN0ZWRSZXF1aXJlZFNwYWNlID0gbm9kZURhdGEubGVuZ3RoICogbWluRGlzdGFuY2UgKiBtaW5EaXN0YW5jZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFkanVzdGVkUmVxdWlyZWRTcGFjZSA+IGF2YWlsYWJsZVNwYWNlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnTm90IGVub3VnaCBzcGFjZSB0byBhY2NvbW1vZGF0ZSBhbGwgbm9kZXMgd2l0aG91dCBhIGZpeGVkIHBvc2l0aW9uLidcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBub2RlRGF0YS5mb3JFYWNoKChub2RlKSA9PiB7XG4gICAgICBpZiAobm9kZS5meCA9PT0gbnVsbCAmJiBub2RlLmZ5ID09PSBudWxsKSB7XG4gICAgICAgIGxldCBjdXJyZW50TWluRGlzdGFuY2UgPSBtaW5EaXN0YW5jZTtcbiAgICAgICAgbGV0IGNhblBsYWNlTm9kZSA9IGZhbHNlO1xuXG4gICAgICAgIHdoaWxlICghY2FuUGxhY2VOb2RlICYmIGN1cnJlbnRNaW5EaXN0YW5jZSA+IDApIHtcbiAgICAgICAgICBub2RlLmZ4ID0gY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDMyQXJyYXkoMSkpWzBdICUgd2lkdGg7XG4gICAgICAgICAgbm9kZS5meSA9IGNyeXB0by5nZXRSYW5kb21WYWx1ZXMobmV3IFVpbnQzMkFycmF5KDEpKVswXSAlIGhlaWdodDtcblxuICAgICAgICAgIGNhblBsYWNlTm9kZSA9ICFub2RlRGF0YS5zb21lKChvdGhlck5vZGUpID0+IHtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgb3RoZXJOb2RlLmZ4ID09PSBudWxsIHx8XG4gICAgICAgICAgICAgIG90aGVyTm9kZS5meSA9PT0gbnVsbCB8fFxuICAgICAgICAgICAgICBvdGhlck5vZGUgPT09IG5vZGVcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGR4ID0gb3RoZXJOb2RlLmZ4IC0gbm9kZS5meDtcbiAgICAgICAgICAgIGNvbnN0IGR5ID0gb3RoZXJOb2RlLmZ5IC0gbm9kZS5meTtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpIDwgY3VycmVudE1pbkRpc3RhbmNlO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKCFjYW5QbGFjZU5vZGUpIHtcbiAgICAgICAgICAgIGN1cnJlbnRNaW5EaXN0YW5jZS0tO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY2FuUGxhY2VOb2RlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ05vdCBlbm91Z2ggc3BhY2UgdG8gYWNjb21tb2RhdGUgYWxsIG5vZGVzIHdpdGhvdXQgYSBmaXhlZCBwb3NpdGlvbi4nXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGVEYXRhO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIF91cGRhdGUoX2QzLCBzdmcsIGRhdGEpIHtcbiAgICBjb25zdCB7IG5vZGVzLCBsaW5rcyB9ID0gZGF0YTtcbiAgICB0aGlzLm5vZGVzID0gbm9kZXMgfHwgW107XG4gICAgdGhpcy5saW5rcyA9IGxpbmtzIHx8IFtdO1xuXG4gICAgLy8gRGlzYWJsZSB0aGUgcmVzZXQgYnRuXG5cbiAgICBsZXQgc2F2ZUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlX2dyYXBoJyk7XG4gICAgc2F2ZUJ0bi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgJ3RydWUnKTtcbiAgICAvLyBXaWR0aC9IZWlnaHQgb2YgY2FudmFzXG4gICAgY29uc3QgcGFyZW50V2lkdGggPSBfZDMuc2VsZWN0KCdzdmcnKS5ub2RlKCkucGFyZW50Tm9kZS5jbGllbnRXaWR0aDtcbiAgICBjb25zdCBwYXJlbnRIZWlnaHQgPSBfZDMuc2VsZWN0KCdzdmcnKS5ub2RlKCkucGFyZW50Tm9kZS5jbGllbnRIZWlnaHQ7XG5cbiAgICAvLyBDaGVjayB0byBzZWUgaWYgbm9kZXMgYXJlIGluIERleGllXG4gICAgY29uc3Qgb2xkRGF0YSA9IGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmdldEdyYXBoRGF0YSgnbm9kZXMnKTtcbiAgICBjb25zdCBvbGROb2RlcyA9IG9sZERhdGEgPyBvbGREYXRhLm5vZGVzIDogW107XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2xkTm9kZXMpKSB7XG4gICAgICAvLyBDb21wYXJlIGFuZCBzZXQgcHJvcGVydHkgZm9yIG5ldyBub2Rlc1xuICAgICAgdGhpcy5ub2RlcyA9IHRoaXMuY29tcGFyZUFuZE1hcmtOb2Rlc05ldyhub2Rlcywgb2xkTm9kZXMpO1xuICAgICAgLy8gUmVtb3ZlIG9sZCBub2RlcyBmcm9tIERleGllXG4gICAgICBhd2FpdCB0aGlzLmRleGllU2VydmljZS5kZWxldGVHcmFwaERhdGEoJ25vZGVzJyk7XG4gICAgICAvLyBBZGQgbmV3IG5vZGVzIHRvIERleGllXG4gICAgICBhd2FpdCB0aGlzLmRleGllU2VydmljZS5zYXZlR3JhcGhEYXRhKHsgZGF0YUlkOiAnbm9kZXMnLCBub2RlczogZGF0YS5ub2RlcywgbGlua3M6IGRhdGEubGlua3MgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEFkZCBmaXJzdCBzZXQgb2Ygbm9kZXMgdG8gRGV4aWVcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLnNhdmVHcmFwaERhdGEoeyBkYXRhSWQ6ICdub2RlcycsIG5vZGVzOiBkYXRhLm5vZGVzLCBsaW5rczogZGF0YS5saW5rcyB9KTtcbiAgICB9XG5cbiAgICAvLyBJZiBub2RlcyBkb24ndCBoYXZlIGEgZngvZnkgY29vcmRpbmF0ZSB3ZSBnZW5lcmF0ZSBhIHJhbmRvbSBvbmUgLSBkYWdyZSBub2RlcyB3aXRob3V0IGxpbmtzIGFuZCBuZXcgbm9kZXMgYWRkZWQgdG8gY2FudmFzIGhhdmUgbnVsbCBjb29yZGluYXRlcyBieSBkZXNpZ25cbiAgICB0aGlzLm5vZGVzID0gdGhpcy5yYW5kb21pc2VOb2RlUG9zaXRpb25zKFxuICAgICAgdGhpcy5ub2RlcyxcbiAgICAgIHBhcmVudFdpZHRoLFxuICAgICAgcGFyZW50SGVpZ2h0XG4gICAgKTtcblxuICAgIC8vIEdldHRpbmcgcGFyZW50cyBsaW5lU3R5bGUgYW5kIGFkZGluZyBpdCB0byBjaGlsZCBvYmplY3RzXG4gICAgY29uc3QgcmVsYXRpb25zaGlwc0FycmF5ID0gdGhpcy5saW5rcy5tYXAoXG4gICAgICAoeyBsaW5lU3R5bGUsIHRhcmdldEFycm93LCBzb3VyY2VBcnJvdywgcmVsYXRpb25zaGlwcyB9KSA9PlxuICAgICAgICByZWxhdGlvbnNoaXBzLm1hcCgocikgPT4gKHtcbiAgICAgICAgICBwYXJlbnRMaW5lU3R5bGU6IGxpbmVTdHlsZSxcbiAgICAgICAgICBwYXJlbnRTb3VyY2VBcnJvdzogc291cmNlQXJyb3csXG4gICAgICAgICAgcGFyZW50VGFyZ2V0QXJyb3c6IHRhcmdldEFycm93LFxuICAgICAgICAgIC4uLnIsXG4gICAgICAgIH0pKVxuICAgICk7XG5cbiAgICAvLyBBZGRpbmcgZHkgdmFsdWUgYmFzZWQgb24gbGluayBudW1iZXIgYW5kIHBvc2l0aW9uIGluIHBhcmVudFxuICAgIHJlbGF0aW9uc2hpcHNBcnJheS5tYXAoKGxpbmtSZWxhdGlvbnNoaXApID0+IHtcbiAgICAgIGxpbmtSZWxhdGlvbnNoaXAubWFwKChsaW5rT2JqZWN0LCBpKSA9PiB7XG4gICAgICAgIC8vIGR5IGluY3JlbWVudHMgb2YgMTVweFxuICAgICAgICBsaW5rT2JqZWN0WydkeSddID0gMjAgKyBpICogMTU7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIElFMTEgZG9lcyBub3QgbGlrZSAuZmxhdFxuICAgIHRoaXMubGlua3MgPSByZWxhdGlvbnNoaXBzQXJyYXkucmVkdWNlKChhY2MsIHZhbCkgPT4gYWNjLmNvbmNhdCh2YWwpLCBbXSk7XG5cbiAgICBkMy5zZWxlY3QoJ3N2ZycpLmFwcGVuZCgnZycpO1xuXG4gICAgLy8gWm9vbSBTdGFydFxuICAgIGNvbnN0IHpvb21Db250YWluZXIgPSBfZDMuc2VsZWN0KCdzdmcgZycpO1xuICAgIGxldCBjdXJyZW50Wm9vbSA9IGQzLnpvb21UcmFuc2Zvcm0oZDMuc2VsZWN0KCdzdmcnKS5ub2RlKCkpO1xuICAgIGNvbnN0IHVwZGF0ZVpvb21MZXZlbCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnRTY2FsZSA9IGN1cnJlbnRab29tLms7XG4gICAgICBjb25zdCBtYXhTY2FsZSA9IHpvb20uc2NhbGVFeHRlbnQoKVsxXTtcbiAgICAgIGNvbnN0IHpvb21QZXJjZW50YWdlID0gKChjdXJyZW50U2NhbGUgLSAwLjUpIC8gKG1heFNjYWxlIC0gMC41KSkgKiAyMDA7XG4gICAgICBjb25zdCB6b29tTGV2ZWxEaXNwbGF5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb21fbGV2ZWwnKTtcbiAgICAgIGNvbnN0IHpvb21MZXZlbFRleHQgPSBgWm9vbTogJHt6b29tUGVyY2VudGFnZS50b0ZpeGVkKDApfSVgO1xuICAgICAgY29uc3Qgem9vbUluQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb21faW4nKTtcbiAgICAgIGNvbnN0IHpvb21PdXRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbV9vdXQnKTtcbiAgICAgIGNvbnN0IHpvb21SZXNldEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd6b29tX3Jlc2V0Jyk7XG5cbiAgICAgIC8vIEl0IG1pZ2h0IG5vdCBleGlzdCBkZXBlbmRpbmcgb24gdGhlIHRoaXMuem9vbSBib29sZWFuXG4gICAgICBpZiAoem9vbVJlc2V0QnRuKSB7XG4gICAgICAgIHpvb21SZXNldEJ0bi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgJ3RydWUnKTtcbiAgICAgIH1cbiAgICAgIC8vIENoZWNrIGlmIHRoZSB6b29tIGxldmVsIGhhcyBjaGFuZ2VkIGJlZm9yZSB1cGRhdGluZyB0aGUgZGlzcGxheSAvIGFsbG93cyBmb3IgcGFubmluZyB3aXRob3V0IHNob3dpbmcgdGhlIHpvb20gcGVyY2VudGFnZVxuICAgICAgaWYgKHpvb21MZXZlbERpc3BsYXkgJiYgem9vbUxldmVsRGlzcGxheS5pbm5lckhUTUwgIT09IHpvb21MZXZlbFRleHQpIHtcbiAgICAgICAgem9vbUxldmVsRGlzcGxheS5pbm5lckhUTUwgPSB6b29tTGV2ZWxUZXh0O1xuICAgICAgICB6b29tTGV2ZWxEaXNwbGF5LnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIGlmICh6b29tTGV2ZWxEaXNwbGF5KSB7XG4gICAgICAgICAgICB6b29tTGV2ZWxEaXNwbGF5LnN0eWxlLm9wYWNpdHkgPSAnMCc7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAyMDAwKTtcbiAgICAgIH1cbiAgICAgIC8vIERpc2FibGUgdGhlIHpvb21JbkJ0biBpZiB0aGUgem9vbSBsZXZlbCBpcyBhdCAyMDAlXG4gICAgICBpZiAoem9vbUluQnRuKSB7XG4gICAgICAgIGlmICh6b29tUGVyY2VudGFnZSA9PT0gMjAwKSB7XG4gICAgICAgICAgem9vbUluQnRuLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAndHJ1ZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHpvb21JbkJ0bi5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIERpc2FibGUgdGhlIHpvb21PdXRCdG4gaWYgdGhlIHpvb20gbGV2ZWwgaXMgYXQgMCVcbiAgICAgIGlmICh6b29tT3V0QnRuKSB7XG4gICAgICAgIGlmICh6b29tUGVyY2VudGFnZSA9PT0gMCkge1xuICAgICAgICAgIHpvb21PdXRCdG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgem9vbU91dEJ0bi5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIERpc2FibGUgdGhlIHpvb21SZXNldEJ0biBpZiB0aGUgem9vbSBsZXZlbCBpcyBhdCAxMDAlXG4gICAgICBpZiAoem9vbVJlc2V0QnRuKSB7XG4gICAgICAgIGlmICh6b29tUGVyY2VudGFnZSA9PT0gMTAwKSB7XG4gICAgICAgICAgem9vbVJlc2V0QnRuLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAndHJ1ZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHpvb21SZXNldEJ0bi5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIGxldCB6b29tZWRJbml0O1xuICAgIGNvbnN0IHpvb21lZCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IGQzLmV2ZW50LnRyYW5zZm9ybTtcbiAgICAgIHpvb21Db250YWluZXIuYXR0cihcbiAgICAgICAgJ3RyYW5zZm9ybScsXG4gICAgICAgIGB0cmFuc2xhdGUoJHt0cmFuc2Zvcm0ueH0sICR7dHJhbnNmb3JtLnl9KSBzY2FsZSgke3RyYW5zZm9ybS5rfSlgXG4gICAgICApO1xuICAgICAgY3VycmVudFpvb20gPSB0cmFuc2Zvcm07XG4gICAgICB6b29tZWRJbml0ID0gdHJ1ZTtcbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH07XG5cbiAgICBjb25zdCB6b29tID0gZDNcbiAgICAgIC56b29tKClcbiAgICAgIC5zY2FsZUV4dGVudChbMC41LCAxLjVdKVxuICAgICAgLm9uKCdzdGFydCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnN0eWxlKCdjdXJzb3InLCB0aGlzLnpvb20gPyBudWxsIDogJ2dyYWJiaW5nJyk7XG4gICAgICB9KVxuICAgICAgLm9uKCd6b29tJywgdGhpcy56b29tID8gem9vbWVkIDogbnVsbClcbiAgICAgIC5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoJ2N1cnNvcicsICdncmFiJyk7XG4gICAgICB9KTtcbiAgICBzdmdcbiAgICAgIC5jYWxsKHpvb20pXG4gICAgICAuc3R5bGUoJ2N1cnNvcicsICdncmFiJylcbiAgICAgIC5vbih0aGlzLnpvb20gPyBudWxsIDogJ3doZWVsLnpvb20nLCBudWxsKVxuICAgICAgLm9uKCdkYmxjbGljay56b29tJywgbnVsbCk7XG4gICAgem9vbS5maWx0ZXIoKCkgPT4gIWQzLmV2ZW50LnNoaWZ0S2V5KTtcblxuICAgIC8vIFpvb20gYnV0dG9uIGNvbnRyb2xzXG4gICAgZDMuc2VsZWN0KCcjem9vbV9pbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHpvb20uc2NhbGVCeShzdmcudHJhbnNpdGlvbigpLmR1cmF0aW9uKDc1MCksIDEuMik7XG4gICAgICB1cGRhdGVab29tTGV2ZWwoKTtcbiAgICB9KTtcbiAgICBkMy5zZWxlY3QoJyN6b29tX291dCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHpvb20uc2NhbGVCeShzdmcudHJhbnNpdGlvbigpLmR1cmF0aW9uKDc1MCksIDAuOCk7XG4gICAgICB1cGRhdGVab29tTGV2ZWwoKTtcbiAgICB9KTtcbiAgICBkMy5zZWxlY3QoJyN6b29tX3Jlc2V0Jykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgem9vbS5zY2FsZVRvKHN2Zy50cmFuc2l0aW9uKCkuZHVyYXRpb24oNzUwKSwgMSk7XG4gICAgICB1cGRhdGVab29tTGV2ZWwoKTtcbiAgICB9KTtcbiAgICAvLyBab29tIHRvIGZpdCBmdW5jdGlvbiBhbmQgQnV0dG9uXG4gICAgY29uc3QgaGFuZGxlWm9vbVRvRml0ID0gKCkgPT4ge1xuICAgICAgY29uc3Qgbm9kZUJCb3ggPSB6b29tQ29udGFpbmVyLm5vZGUoKS5nZXRCQm94KCk7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBzY2FsZSBhbmQgdHJhbnNsYXRlIHZhbHVlcyB0byBmaXQgYWxsIG5vZGVzXG4gICAgICBjb25zdCBwYWRkaW5nID0gMzA7XG4gICAgICBjb25zdCBzY2FsZVggPSAocGFyZW50V2lkdGggLSBwYWRkaW5nICogMikgLyBub2RlQkJveC53aWR0aDtcbiAgICAgIGNvbnN0IHNjYWxlWSA9IChwYXJlbnRIZWlnaHQgLSBwYWRkaW5nICogMikgLyBub2RlQkJveC5oZWlnaHQ7XG4gICAgICBjb25zdCBzY2FsZSA9IE1hdGgubWluKHNjYWxlWCwgc2NhbGVZLCAxLjApOyAvLyBSZXN0cmljdCBzY2FsZSB0byBhIG1heGltdW0gb2YgMS4wXG5cbiAgICAgIGNvbnN0IHRyYW5zbGF0ZVggPVxuICAgICAgICAtbm9kZUJCb3gueCAqIHNjYWxlICsgKHBhcmVudFdpZHRoIC0gbm9kZUJCb3gud2lkdGggKiBzY2FsZSkgLyAyO1xuICAgICAgY29uc3QgdHJhbnNsYXRlWSA9XG4gICAgICAgIC1ub2RlQkJveC55ICogc2NhbGUgKyAocGFyZW50SGVpZ2h0IC0gbm9kZUJCb3guaGVpZ2h0ICogc2NhbGUpIC8gMjtcblxuICAgICAgLy8gR2V0IHRoZSBib3VuZGluZyBib3ggb2YgYWxsIG5vZGVzXG4gICAgICBjb25zdCBhbGxOb2RlcyA9IHpvb21Db250YWluZXIuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyJyk7XG4gICAgICBjb25zdCBhbGxOb2Rlc0JCb3ggPSBhbGxOb2Rlcy5ub2RlcygpLnJlZHVjZShcbiAgICAgICAgKGFjYywgbm9kZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IG5vZGVCQm94ID0gbm9kZS5nZXRCQm94KCk7XG4gICAgICAgICAgYWNjLnggPSBNYXRoLm1pbihhY2MueCwgbm9kZUJCb3gueCk7XG4gICAgICAgICAgYWNjLnkgPSBNYXRoLm1pbihhY2MueSwgbm9kZUJCb3gueSk7XG4gICAgICAgICAgYWNjLndpZHRoID0gTWF0aC5tYXgoYWNjLndpZHRoLCBub2RlQkJveC54ICsgbm9kZUJCb3gud2lkdGgpO1xuICAgICAgICAgIGFjYy5oZWlnaHQgPSBNYXRoLm1heChhY2MuaGVpZ2h0LCBub2RlQkJveC55ICsgbm9kZUJCb3guaGVpZ2h0KTtcbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LFxuICAgICAgICB7IHg6IEluZmluaXR5LCB5OiBJbmZpbml0eSwgd2lkdGg6IC1JbmZpbml0eSwgaGVpZ2h0OiAtSW5maW5pdHkgfVxuICAgICAgKTtcblxuICAgICAgLy8gQ2hlY2sgaWYgYWxsIG5vZGVzIGFyZSB3aXRoaW4gdGhlIHZpZXdhYmxlIGNvbnRhaW5lclxuICAgICAgaWYgKFxuICAgICAgICBhbGxOb2Rlc0JCb3gueCAqIHNjYWxlID49IDAgJiZcbiAgICAgICAgYWxsTm9kZXNCQm94LnkgKiBzY2FsZSA+PSAwICYmXG4gICAgICAgIGFsbE5vZGVzQkJveC53aWR0aCAqIHNjYWxlIDw9IHBhcmVudFdpZHRoICYmXG4gICAgICAgIGFsbE5vZGVzQkJveC5oZWlnaHQgKiBzY2FsZSA8PSBwYXJlbnRIZWlnaHRcbiAgICAgICkge1xuICAgICAgICAvLyBBbGwgbm9kZXMgYXJlIHdpdGhpbiB0aGUgdmlld2FibGUgY29udGFpbmVyLCBubyBuZWVkIHRvIGFwcGx5IHpvb20gdHJhbnNmb3JtXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTWFudWFsbHkgcmVzZXQgdGhlIHpvb20gdHJhbnNmb3JtXG4gICAgICB6b29tQ29udGFpbmVyXG4gICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgLmR1cmF0aW9uKDc1MClcbiAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoMCwgMCkgc2NhbGUoMSknKTtcblxuICAgICAgLy8gQXBwbHkgem9vbSB0cmFuc2Zvcm0gdG8gem9vbUNvbnRhaW5lclxuICAgICAgem9vbUNvbnRhaW5lclxuICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgIC5kdXJhdGlvbig3NTApXG4gICAgICAgIC5hdHRyKFxuICAgICAgICAgICd0cmFuc2Zvcm0nLFxuICAgICAgICAgIGB0cmFuc2xhdGUoJHt0cmFuc2xhdGVYfSwgJHt0cmFuc2xhdGVZfSkgc2NhbGUoJHtzY2FsZX0pYFxuICAgICAgICApO1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnRab29tIHZhcmlhYmxlIHdpdGggdGhlIG5ldyB0cmFuc2Zvcm1cbiAgICAgIC8vIHpvb21lZEluaXQgLSBjcmVhdGVkIGJlY2F1c2UgaWYgem9vbVRvRml0IGlzIGNhbGxlZCBiZWZvcmUgYW55dGhpbmcgZWxzZSBpdCBzY3Jld3MgdXAgdGhlIGJhc2UgdHJhbnNmb3JtIC0gZS5nLiBzaG93Q3VycmVudE1hdGNoXG4gICAgICBpZiAoem9vbWVkSW5pdCkge1xuICAgICAgICBjdXJyZW50Wm9vbS54ID0gdHJhbnNsYXRlWDtcbiAgICAgICAgY3VycmVudFpvb20ueSA9IHRyYW5zbGF0ZVk7XG4gICAgICAgIGN1cnJlbnRab29tLmsgPSBzY2FsZTtcbiAgICAgIH1cbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH07XG5cbiAgICBkMy5zZWxlY3QoJyN6b29tX3RvX2ZpdCcpLm9uKCdjbGljaycsIGhhbmRsZVpvb21Ub0ZpdCk7XG5cbiAgICAvLyBDaGVjayBpZiB6b29tIGxldmVsIGlzIGF0IDAlIG9yIDEwMCUgYmVmb3JlIGFsbG93aW5nIG1vdXNld2hlZWwgem9vbSAtIHRoaXMgc3RhYmlsaXNlcyB0aGUgY2FudmFzIHdoZW4gdGhlIGxpbWl0IGlzIHJlYWNoZWRcbiAgICBzdmcub24oJ3doZWVsJywgKCkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudFNjYWxlID0gY3VycmVudFpvb20uaztcbiAgICAgIGNvbnN0IG1heFNjYWxlID0gem9vbS5zY2FsZUV4dGVudCgpWzFdO1xuICAgICAgY29uc3QgbWluU2NhbGUgPSB6b29tLnNjYWxlRXh0ZW50KClbMF07XG4gICAgICBpZiAoY3VycmVudFNjYWxlID09PSBtYXhTY2FsZSB8fCBjdXJyZW50U2NhbGUgPT09IG1pblNjYWxlKSB7XG4gICAgICAgIGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBab29tIEVuZFxuXG4gICAgLy8gRm9yIGFycm93c1xuICAgIHRoaXMuaW5pdERlZmluaXRpb25zKHN2Zyk7XG5cbiAgICBjb25zdCBzaW11bGF0aW9uID0gdGhpcy5mb3JjZVNpbXVsYXRpb24oX2QzLCB7XG4gICAgICB3aWR0aDogK3N2Zy5hdHRyKCd3aWR0aCcpLFxuICAgICAgaGVpZ2h0OiArc3ZnLmF0dHIoJ2hlaWdodCcpLFxuICAgIH0pO1xuXG4gICAgLy8gQnJ1c2ggU3RhcnRcbiAgICBsZXQgZ0JydXNoSG9sZGVyID0gc3ZnLmFwcGVuZCgnZycpO1xuXG4gICAgbGV0IGJydXNoID0gZDNcbiAgICAgIC5icnVzaCgpXG4gICAgICAub24oJ3N0YXJ0JywgKCkgPT4ge1xuICAgICAgICB0aGlzLmJydXNoaW5nID0gdHJ1ZTtcblxuICAgICAgICBub2RlRW50ZXIuZWFjaCgoZCkgPT4ge1xuICAgICAgICAgIGQucHJldmlvdXNseVNlbGVjdGVkID0gdGhpcy5zaGlmdEtleSAmJiBkLnNlbGVjdGVkO1xuICAgICAgICB9KTtcblxuICAgICAgICBfZDNcbiAgICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICB9KVxuICAgICAgLm9uKCdicnVzaCcsICgpID0+IHtcbiAgICAgICAgdGhpcy5leHRlbnQgPSBkMy5ldmVudC5zZWxlY3Rpb247XG4gICAgICAgIGlmICghZDMuZXZlbnQuc291cmNlRXZlbnQgfHwgIXRoaXMuZXh0ZW50IHx8ICF0aGlzLmJydXNoTW9kZSkgcmV0dXJuO1xuICAgICAgICBpZiAoIWN1cnJlbnRab29tKSByZXR1cm47XG5cbiAgICAgICAgbm9kZUVudGVyXG4gICAgICAgICAgLmNsYXNzZWQoJ3NlbGVjdGVkJywgKGQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiAoZC5zZWxlY3RlZCA9XG4gICAgICAgICAgICAgIGQucHJldmlvdXNseVNlbGVjdGVkIF5cbiAgICAgICAgICAgICAgKDxhbnk+KFxuICAgICAgICAgICAgICAgIChkMy5ldmVudC5zZWxlY3Rpb25bMF1bMF0gPD1cbiAgICAgICAgICAgICAgICAgIGQueCAqIGN1cnJlbnRab29tLmsgKyBjdXJyZW50Wm9vbS54ICYmXG4gICAgICAgICAgICAgICAgICBkLnggKiBjdXJyZW50Wm9vbS5rICsgY3VycmVudFpvb20ueCA8XG4gICAgICAgICAgICAgICAgICBkMy5ldmVudC5zZWxlY3Rpb25bMV1bMF0gJiZcbiAgICAgICAgICAgICAgICAgIGQzLmV2ZW50LnNlbGVjdGlvblswXVsxXSA8PVxuICAgICAgICAgICAgICAgICAgZC55ICogY3VycmVudFpvb20uayArIGN1cnJlbnRab29tLnkgJiZcbiAgICAgICAgICAgICAgICAgIGQueSAqIGN1cnJlbnRab29tLmsgKyBjdXJyZW50Wm9vbS55IDxcbiAgICAgICAgICAgICAgICAgIGQzLmV2ZW50LnNlbGVjdGlvblsxXVsxXSlcbiAgICAgICAgICAgICAgKSkpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnNlbGVjdCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuY2xhc3NlZCgnc2VsZWN0ZWQnLCAoZCkgPT4gZC5zZWxlY3RlZClcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAoZCkgPT4gKGQuc2VsZWN0ZWQgPyAnYmx1ZScgOiAnIzk5OScpKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCAoZCkgPT4gKGQuc2VsZWN0ZWQgPyA3MDAgOiA0MDApKTtcblxuICAgICAgICB0aGlzLmV4dGVudCA9IGQzLmV2ZW50LnNlbGVjdGlvbjtcbiAgICAgIH0pXG4gICAgICAub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgaWYgKCFkMy5ldmVudC5zb3VyY2VFdmVudCB8fCAhdGhpcy5leHRlbnQgfHwgIXRoaXMuZ0JydXNoKSByZXR1cm47XG5cbiAgICAgICAgdGhpcy5nQnJ1c2guY2FsbChicnVzaC5tb3ZlLCBudWxsKTtcbiAgICAgICAgaWYgKCF0aGlzLmJydXNoTW9kZSkge1xuICAgICAgICAgIC8vIHRoZSBzaGlmdCBrZXkgaGFzIGJlZW4gcmVsZWFzZSBiZWZvcmUgd2UgZW5kZWQgb3VyIGJydXNoaW5nXG4gICAgICAgICAgdGhpcy5nQnJ1c2gucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5nQnJ1c2ggPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYnJ1c2hpbmcgPSBmYWxzZTtcblxuICAgICAgICBub2RlRW50ZXJcbiAgICAgICAgICAuc2VsZWN0KCcubm9kZVRleHQnKVxuICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICFkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5jbGFzc2VkKCdzZWxlY3RlZCcpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgfSk7XG5cbiAgICBsZXQga2V5dXAgPSAoKSA9PiB7XG4gICAgICB0aGlzLnNoaWZ0S2V5ID0gZmFsc2U7XG4gICAgICB0aGlzLmJydXNoTW9kZSA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMuZ0JydXNoICYmICF0aGlzLmJydXNoaW5nKSB7XG4gICAgICAgIC8vIG9ubHkgcmVtb3ZlIHRoZSBicnVzaCBpZiB3ZSdyZSBub3QgYWN0aXZlbHkgYnJ1c2hpbmdcbiAgICAgICAgLy8gb3RoZXJ3aXNlIGl0J2xsIGJlIHJlbW92ZWQgd2hlbiB0aGUgYnJ1c2hpbmcgZW5kc1xuICAgICAgICB0aGlzLmdCcnVzaC5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5nQnJ1c2ggPSBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBsZXQga2V5ZG93biA9ICgpID0+IHtcbiAgICAgIC8vIEFsbG93cyB1cyB0byB0dXJuIG9mZiBkZWZhdWx0IGxpc3RlbmVycyBmb3Iga2V5TW9kaWZpZXJzKHNoaWZ0KVxuICAgICAgYnJ1c2guZmlsdGVyKCgpID0+IGQzLmV2ZW50LnNoaWZ0S2V5KTtcbiAgICAgIGJydXNoLmtleU1vZGlmaWVycyhmYWxzZSk7XG4gICAgICAvLyBob2xkaW5nIHNoaWZ0IGtleVxuICAgICAgaWYgKGQzLmV2ZW50LmtleUNvZGUgPT09IDE2KSB7XG4gICAgICAgIHRoaXMuc2hpZnRLZXkgPSB0cnVlO1xuXG4gICAgICAgIGlmICghdGhpcy5nQnJ1c2gpIHtcbiAgICAgICAgICB0aGlzLmJydXNoTW9kZSA9IHRydWU7XG4gICAgICAgICAgdGhpcy5nQnJ1c2ggPSBnQnJ1c2hIb2xkZXIuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnYnJ1c2gnKTtcbiAgICAgICAgICB0aGlzLmdCcnVzaC5jYWxsKGJydXNoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBkMy5zZWxlY3QoJ2JvZHknKS5vbigna2V5ZG93bicsIGtleWRvd24pLm9uKCdrZXl1cCcsIGtleXVwKTtcbiAgICAvLyBCcnVzaCBFbmRcblxuICAgIGNvbnN0IGZpbHRlcmVkTGluZSA9IHRoaXMubGlua3MuZmlsdGVyKFxuICAgICAgKHsgc291cmNlLCB0YXJnZXQgfSwgaW5kZXgsIGxpbmtzQXJyYXkpID0+IHtcbiAgICAgICAgLy8gRmlsdGVyIG91dCBhbnkgb2JqZWN0cyB0aGF0IGhhdmUgbWF0Y2hpbmcgc291cmNlIGFuZCB0YXJnZXQgcHJvcGVydHkgdmFsdWVzXG4gICAgICAgIC8vIFRvIGRpc3BsYXkgb25seSBvbmUgbGluZSAocGFyZW50TGluZVN0eWxlKSAtIHJlbW92ZXMgaHRtbCBibG9hdCBhbmQgYSBkYXJrZW5lZCBsaW5lXG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgaW5kZXggPT09XG4gICAgICAgICAgbGlua3NBcnJheS5maW5kSW5kZXgoXG4gICAgICAgICAgICAob2JqKSA9PiBvYmouc291cmNlID09PSBzb3VyY2UgJiYgb2JqLnRhcmdldCA9PT0gdGFyZ2V0XG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCBsaW5rID0gem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoKS5kYXRhKGZpbHRlcmVkTGluZSwgZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLmlkO1xuICAgIH0pO1xuXG4gICAgem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoJ2xpbmUnKS5kYXRhKGxpbmspLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgIGNvbnN0IGxpbmtFbnRlciA9IGxpbmtcbiAgICAgIC5qb2luKCdsaW5lJylcbiAgICAgIC5zdHlsZSgnc3Ryb2tlJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKGQucGFyZW50TGluZVN0eWxlID09PSAnU29saWQnKSB7XG4gICAgICAgICAgcmV0dXJuICcjNzc3JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gJyNiNGI0YjQnO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0eWxlKCdzdHJva2Utb3BhY2l0eScsICcuNicpXG4gICAgICAuc3R5bGUoJ3N0cm9rZS1kYXNoYXJyYXknLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoZC5wYXJlbnRMaW5lU3R5bGUgPT09ICdEb3R0ZWQnKSB7XG4gICAgICAgICAgcmV0dXJuICc4LDUnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSlcbiAgICAgIC5zdHlsZSgnc3Ryb2tlLXdpZHRoJywgJzJweCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnbGluaycpXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAnX2xpbmUnO1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBkLnNvdXJjZSA/IGQuc291cmNlIDogJyc7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGQudGFyZ2V0ID8gZC50YXJnZXQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke3NvdXJjZX1fJHt0YXJnZXR9JHtzdWZmaXh9YDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignbWFya2VyLWVuZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmIChkLnBhcmVudFRhcmdldEFycm93ID09PSB0cnVlKSB7XG4gICAgICAgICAgcmV0dXJuICd1cmwoI2Fycm93aGVhZFRhcmdldCknO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCdtYXJrZXItc3RhcnQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoZC5wYXJlbnRTb3VyY2VBcnJvdyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIHJldHVybiAndXJsKCNhcnJvd2hlYWRTb3VyY2UpJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pO1xuXG4gICAgbGluay5hcHBlbmQoJ3RpdGxlJykudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgcmV0dXJuIGQubGFiZWw7XG4gICAgfSk7XG5cbiAgICBjb25zdCBlZGdlcGF0aHMgPSB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgpLmRhdGEodGhpcy5saW5rcywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLmlkO1xuICAgIH0pO1xuXG4gICAgem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoJ3BhdGgnKS5kYXRhKGVkZ2VwYXRocykuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgY29uc3QgZWRnZXBhdGhzRW50ZXIgPSBlZGdlcGF0aHNcbiAgICAgIC5qb2luKCdzdmc6cGF0aCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnZWRnZXBhdGgnKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDApXG4gICAgICAuYXR0cignc3Ryb2tlLW9wYWNpdHknLCAwKVxuICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgcmV0dXJuICdlZGdlcGF0aCcgKyBpO1xuICAgICAgfSk7XG5cbiAgICBjb25zdCBlZGdlbGFiZWxzID0gem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoKS5kYXRhKHRoaXMubGlua3MsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gZC5pZDtcbiAgICB9KTtcblxuICAgIHpvb21Db250YWluZXIuc2VsZWN0QWxsKCd0ZXh0JykuZGF0YShlZGdlbGFiZWxzKS5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICBjb25zdCBlZGdlbGFiZWxzRW50ZXIgPSBlZGdlbGFiZWxzXG4gICAgICAuZW50ZXIoKVxuICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnZWRnZWxhYmVsJylcbiAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9ICdfdGV4dCc7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGQuc291cmNlID8gZC5zb3VyY2UgOiAnJztcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZC50YXJnZXQgPyBkLnRhcmdldCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7c291cmNlfV8ke3RhcmdldH0ke3N1ZmZpeH1gO1xuICAgICAgfSlcbiAgICAgIC5zdHlsZSgndGV4dC1hbmNob3InLCAnbWlkZGxlJylcbiAgICAgIC5hdHRyKCdmb250LXNpemUnLCAxNClcbiAgICAgIC5hdHRyKCdkeScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmR5O1xuICAgICAgfSk7XG5cblxuICAgIGVkZ2VsYWJlbHNFbnRlclxuICAgICAgLmFwcGVuZCgndGV4dFBhdGgnKVxuICAgICAgLmF0dHIoJ3hsaW5rOmhyZWYnLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICByZXR1cm4gJyNlZGdlcGF0aCcgKyBpO1xuICAgICAgfSlcbiAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ3BvaW50ZXInKVxuICAgICAgLmF0dHIoJ2RvbWluYW50LWJhc2VsaW5lJywgJ2JvdHRvbScpXG4gICAgICAuYXR0cignc3RhcnRPZmZzZXQnLCAnNTAlJylcbiAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmxhYmVsO1xuICAgICAgfSk7XG5cbiAgICBlZGdlbGFiZWxzRW50ZXJcbiAgICAgIC5zZWxlY3RBbGwoJ3RleHRQYXRoJylcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQubGlua0ljb247XG4gICAgICB9KVxuICAgICAgLmFwcGVuZCgndHNwYW4nKVxuICAgICAgLnN0eWxlKCdmaWxsJywgJyM4NTY0MDQnKVxuICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsICc3MDAnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ZhJylcbiAgICAgIC50ZXh0KCcgXFx1ZjBjMScpO1xuICAgIC8vIG9uIG5vcm1hbCBsYWJlbCBsaW5rIGNsaWNrIC0gaGlnaGxpZ2h0IGxhYmVsc1xuICAgIHN2Zy5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZCkge1xuICAgICAgX2QzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgbm9kZUVudGVyLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgZC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgICBub2RlLmNsYXNzZWQoJ3NlbGVjdGVkJywgZmFsc2UpO1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICBfZDMuc2VsZWN0KHRoaXMpLnN0eWxlKCdmaWxsJywgJ2JsdWUnKS5zdHlsZSgnZm9udC13ZWlnaHQnLCA3MDApO1xuICAgIH0pO1xuXG4gICAgY29uc3Qgbm9kZSA9IHpvb21Db250YWluZXIuc2VsZWN0QWxsKCkuZGF0YSh0aGlzLm5vZGVzLCBmdW5jdGlvbiAoZCkge1xuICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgfSk7XG5cbiAgICB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgnZycpLmRhdGEobm9kZSkuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgY29uc3Qgbm9kZUVudGVyID0gbm9kZVxuICAgICAgLmpvaW4oJ2cnKVxuICAgICAgLmNhbGwoXG4gICAgICAgIF9kM1xuICAgICAgICAgIC5kcmFnKClcbiAgICAgICAgICAub24oJ3N0YXJ0JywgZnVuY3Rpb24gZHJhZ3N0YXJ0ZWQoZCkge1xuICAgICAgICAgICAgLy8gRW5hYmxlIHRoZSBzYXZlICYgcmVzZXQgYnRuXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZV9ncmFwaCcpLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgaWYgKCFfZDMuZXZlbnQuYWN0aXZlKSBzaW11bGF0aW9uLmFscGhhVGFyZ2V0KDAuOSkucmVzdGFydCgpO1xuXG4gICAgICAgICAgICBpZiAoIWQuc2VsZWN0ZWQgJiYgIXRoaXMuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgICAgLy8gaWYgdGhpcyBub2RlIGlzbid0IHNlbGVjdGVkLCB0aGVuIHdlIGhhdmUgdG8gdW5zZWxlY3QgZXZlcnkgb3RoZXIgbm9kZVxuICAgICAgICAgICAgICBub2RlRW50ZXIuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmdW5jdGlvbiAocCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAocC5zZWxlY3RlZCA9IHAucHJldmlvdXNseVNlbGVjdGVkID0gZmFsc2UpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgLy8gcmVtb3ZlIHRoZSBzZWxlY3RlZCBzdHlsaW5nIG9uIG90aGVyIG5vZGVzIGFuZCBsYWJlbHMgd2hlbiB3ZSBkcmFnIGEgbm9uLXNlbGVjdGVkIG5vZGVcbiAgICAgICAgICAgICAgX2QzXG4gICAgICAgICAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgICAgICAgICBfZDNcbiAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApXG4gICAgICAgICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX2QzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgICAgIGQucHJldmlvdXNseVNlbGVjdGVkID0gZC5zZWxlY3RlZDtcbiAgICAgICAgICAgICAgcmV0dXJuIChkLnNlbGVjdGVkID0gdHJ1ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbm9kZUVudGVyXG4gICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5zZWxlY3RlZDtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBkLmZ4ID0gZC54O1xuICAgICAgICAgICAgICAgIGQuZnkgPSBkLnk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9uKCdkcmFnJywgZnVuY3Rpb24gZHJhZ2dlZChkKSB7XG4gICAgICAgICAgICBub2RlRW50ZXJcbiAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkLnNlbGVjdGVkO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGQuZnggKz0gX2QzLmV2ZW50LmR4O1xuICAgICAgICAgICAgICAgIGQuZnkgKz0gX2QzLmV2ZW50LmR5O1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vbignZW5kJywgZnVuY3Rpb24gZHJhZ2VuZGVkKGQpIHtcbiAgICAgICAgICAgIGlmICghX2QzLmV2ZW50LmFjdGl2ZSkge1xuICAgICAgICAgICAgICBzaW11bGF0aW9uLmFscGhhVGFyZ2V0KDAuMykucmVzdGFydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZC5meCA9IGQueDtcbiAgICAgICAgICAgIGQuZnkgPSBkLnk7XG4gICAgICAgICAgICAvLyBTdWJzY3JpYmVzIHRvIHVwZGF0ZWQgZ3JhcGggcG9zaXRpb25zIGZvciBzYXZlXG4gICAgICAgICAgICBzZWxmLnNhdmVHcmFwaERhdGEubmV4dChkYXRhKTtcbiAgICAgICAgICB9KVxuICAgICAgKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ25vZGUtd3JhcHBlcicpXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5pZDtcbiAgICAgIH0pO1xuXG4gICAgLy8gbm8gY29sbGlzaW9uIC0gYWxyZWFkeSB1c2luZyB0aGlzIGluIHN0YXRlbWVudFxuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gbm9kZSBjbGljayBhbmQgY3RybCArIGNsaWNrXG4gICAgc3ZnLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAvLyBzbyB3ZSBkb24ndCBhY3RpdmF0ZSB0aGUgY2FudmFzIC5jbGljayBldmVudFxuICAgICAgX2QzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICAvLyBzZXR0aW5nIHRoZSBzZWxlY3QgYXR0cmlidXRlIHRvIHRoZSBvYmplY3Qgb24gc2luZ2xlIHNlbGVjdCBzbyB3ZSBjYW4gZHJhZyB0aGVtXG4gICAgICBkLnNlbGVjdGVkID0gdHJ1ZTtcblxuICAgICAgc3ZnLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLmNsYXNzZWQoJ3NlbGVjdGVkJywgZmFsc2UpO1xuICAgICAgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ3NlbGVjdGVkJywgdHJ1ZSk7XG4gICAgICBub2RlRW50ZXIuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICBkLnNlbGVjdGVkID0gZmFsc2U7XG4gICAgICAgIGQucHJldmlvdXNseVNlbGVjdGVkID0gZmFsc2U7XG4gICAgICB9KTtcblxuICAgICAgLy8gcmVtb3ZlIHN0eWxlIGZyb20gc2VsZWN0ZWQgbm9kZSBiZWZvcmUgdGhlIGNsYXNzIGlzIHJlbW92ZWRcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKVxuICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgLy8gUmVtb3ZlIHN0eWxlcyBmcm9tIGFsbCBvdGhlciBub2RlcyBhbmQgbGFiZWxzIG9uIHNpbmdsZSBsZWZ0IGNsaWNrXG4gICAgICBfZDMuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJykuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICAvLyBBZGQgc3R5bGUgb24gc2luZ2xlIGxlZnQgY2xpY2tcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0KHRoaXMpXG4gICAgICAgIC5zZWxlY3QoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICdibHVlJylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDcwMCk7XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0pO1xuXG4gICAgLy9jbGljayBvbiBjYW52YXMgdG8gcmVtb3ZlIHNlbGVjdGVkIG5vZGVzXG4gICAgX2QzLnNlbGVjdCgnc3ZnJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgbm9kZUVudGVyLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgZC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgICBub2RlLmNsYXNzZWQoJ3NlbGVjdGVkJywgZmFsc2UpO1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5zZWxlY3RlZCcpXG4gICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICBfZDMuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcbiAgICB9KTtcblxuICAgIG5vZGVFbnRlclxuICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoIWQuaW1hZ2VVcmwgfHwgZC5pbWFnZVVybCA9PT0gJycpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAuYXBwZW5kKCdpbWFnZScpXG4gICAgICAuYXR0cigneGxpbms6aHJlZicsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmltYWdlVXJsO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCd4JywgLTE1KVxuICAgICAgLmF0dHIoJ3knLCAtNjApXG4gICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAnaW1hZ2UnO1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1fJHtzdWZmaXh9YDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1gO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDMyKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDMyKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ltYWdlJylcbiAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ3BvaW50ZXInKTtcblxuICAgIG5vZGVFbnRlclxuICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoIWQuaWNvbiB8fCBkLmljb24gPT09ICcnKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5pY29uO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCd4JywgLTE4KVxuICAgICAgLmF0dHIoJ3knLCAtMzApXG4gICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAnaWNvbic7XG4gICAgICAgIGNvbnN0IGlkID0gZC5pZCA/IGQuaWQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke2lkfV8ke3N1ZmZpeH0gZmFgO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGNvbnN0IGlkID0gZC5pZCA/IGQuaWQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke2lkfWA7XG4gICAgICB9KVxuICAgICAgLnN0eWxlKCdmb250LXNpemUnLCAnMzVweCcpXG4gICAgICAuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJyk7XG5cbiAgICBjb25zdCBub2RlVGV4dCA9IG5vZGVFbnRlclxuICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAuYXR0cignaWQnLCAnbm9kZVRleHQnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ25vZGVUZXh0JylcbiAgICAgIC5zdHlsZSgndGV4dC1hbmNob3InLCAnbWlkZGxlJylcbiAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ3BvaW50ZXInKVxuICAgICAgLmF0dHIoJ2R5JywgLTMpXG4gICAgICAuYXR0cigneScsIC0yNSlcbiAgICAgIC5hdHRyKCd0ZXN0aG9vaycsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9ICd0ZXh0JztcbiAgICAgICAgY29uc3QgaWQgPSBkLmlkID8gZC5pZCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7aWR9XyR7c3VmZml4fWA7XG4gICAgICB9KTtcblxuICAgIG5vZGVUZXh0XG4gICAgICAuc2VsZWN0QWxsKCd0c3Bhbi50ZXh0JylcbiAgICAgIC5kYXRhKChkKSA9PiBkLmxhYmVsKVxuICAgICAgLmVudGVyKClcbiAgICAgIC5hcHBlbmQoJ3RzcGFuJylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdub2RlVGV4dFRzcGFuJylcbiAgICAgIC50ZXh0KChkKSA9PiBkKVxuICAgICAgLnN0eWxlKCdmb250LXNpemUnLCAnMTRweCcpXG4gICAgICAuYXR0cigneCcsIC0xMClcbiAgICAgIC5hdHRyKCdkeCcsIDEwKVxuICAgICAgLmF0dHIoJ2R5JywgMTUpO1xuXG4gICAgbm9kZUVudGVyXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmICghZC5hZGRpdGlvbmFsSWNvbikge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3Qgc3VmZml4ID0gJ2FkZGl0aW9uYWxJY29uJztcbiAgICAgICAgY29uc3QgaWQgPSBkLmlkID8gZC5pZCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7aWR9XyR7c3VmZml4fWA7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ3dpZHRoJywgMTAwKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDI1KVxuICAgICAgLmF0dHIoJ3gnLCAzMClcbiAgICAgIC5hdHRyKCd5JywgLTUwKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ZhJylcbiAgICAgIC5zdHlsZSgnZmlsbCcsICcjODU2NDA0JylcbiAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmFkZGl0aW9uYWxJY29uO1xuICAgICAgfSk7XG5cbiAgICAvLyB0cmFuc2l0aW9uIGVmZmVjdHMgZm9yIG5ldyBwdWxzYXRpbmcgbm9kZXNcbiAgICBub2RlRW50ZXJcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKCFkLm5ld0l0ZW0pIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAuc2VsZWN0KCd0ZXh0JylcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnYmx1ZScpXG4gICAgICAuYXR0cignZm9udC13ZWlnaHQnLCA3MDApXG4gICAgICAuYXR0cignZmlsbC1vcGFjaXR5JywgMSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnYmx1ZScpXG4gICAgICAuYXR0cignZm9udC13ZWlnaHQnLCA3MDApXG4gICAgICAuYXR0cignZmlsbC1vcGFjaXR5JywgMC4xKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignZmlsbCcsICdibHVlJylcbiAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsIDcwMClcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAxKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignZmlsbCcsICdibHVlJylcbiAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsIDcwMClcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAwLjEpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCdmaWxsJywgJ2JsdWUnKVxuICAgICAgLmF0dHIoJ2ZvbnQtd2VpZ2h0JywgNzAwKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDEpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgLmF0dHIoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDEpXG4gICAgICAub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzKS5jYWxsKF9kMy50cmFuc2l0aW9uKTtcbiAgICAgIH0pO1xuXG4gICAgbm9kZUVudGVyXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmICghZC5uZXdJdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLnNlbGVjdCgnaW1hZ2UnKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignd2lkdGgnLCA0NSlcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCA0NSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgMzIpXG4gICAgICAuYXR0cignaGVpZ2h0JywgMzIpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDQ1KVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDQ1KVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignd2lkdGgnLCAzMilcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCAzMilcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgNDUpXG4gICAgICAuYXR0cignaGVpZ2h0JywgNDUpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDMyKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDMyKVxuICAgICAgLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkMy5zZWxlY3QodGhpcykuY2FsbChkMy50cmFuc2l0aW9uKTtcbiAgICAgIH0pO1xuXG4gICAgLy8gUmVtb3ZlIHRoZSBuZXdDbGFzcyBzbyB0aGV5IGRvbid0IGFuaW1hdGUgbmV4dCB0aW1lXG4gICAgdGhpcy5ub2RlcyA9IHRoaXMucmVtb3ZlTmV3SXRlbSh0aGlzLm5vZGVzKTtcblxuICAgIG5vZGVFbnRlci5hcHBlbmQoJ3RpdGxlJykudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgcmV0dXJuIGQubGFiZWw7XG4gICAgfSk7XG5cbiAgICBjb25zdCBtYXhUaWNrcyA9IDMwO1xuICAgIGxldCB0aWNrQ291bnQgPSAwO1xuICAgIGxldCB6b29tVG9GaXRDYWxsZWQgPSBmYWxzZTtcblxuICAgIHNpbXVsYXRpb24ubm9kZXModGhpcy5ub2Rlcykub24oJ3RpY2snLCAoKSA9PiB7XG4gICAgICBpZiAodGhpcy56b29tVG9GaXQgJiYgdGlja0NvdW50ID49IG1heFRpY2tzICYmICF6b29tVG9GaXRDYWxsZWQpIHtcbiAgICAgICAgc2ltdWxhdGlvbi5zdG9wKCk7XG4gICAgICAgIGhhbmRsZVpvb21Ub0ZpdCgpO1xuICAgICAgICB6b29tVG9GaXRDYWxsZWQgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy50aWNrZWQobGlua0VudGVyLCBub2RlRW50ZXIsIGVkZ2VwYXRoc0VudGVyKTtcbiAgICAgICAgdGlja0NvdW50Kys7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBzaW11bGF0aW9uLmZvcmNlKCdsaW5rJykubGlua3ModGhpcy5saW5rcyk7XG4gICAgc2VsZi5zYXZlR3JhcGhEYXRhLm5leHQoZGF0YSk7XG4gIH1cblxuICBwdWJsaWMgcmVzZXRHcmFwaChpbml0aWFsRGF0YSwgZWxlbWVudCwgem9vbSwgem9vbVRvRml0KSB7XG4gICAgLy8gUmVzZXQgdGhlIGRhdGEgdG8gaXRzIGluaXRpYWwgc3RhdGVcbiAgICB0aGlzLm5vZGVzID0gW107XG4gICAgdGhpcy5saW5rcyA9IFtdO1xuICAgIC8vIENhbGwgdGhlIHVwZGF0ZSBtZXRob2QgYWdhaW4gdG8gcmUtc2ltdWxhdGUgdGhlIGdyYXBoIHdpdGggdGhlIG5ldyBkYXRhXG4gICAgdGhpcy51cGRhdGUoaW5pdGlhbERhdGEsIGVsZW1lbnQsIHpvb20sIHpvb21Ub0ZpdCk7XG4gIH1cbn1cbiJdfQ==