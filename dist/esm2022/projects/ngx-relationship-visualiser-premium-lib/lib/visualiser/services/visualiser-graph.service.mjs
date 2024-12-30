import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Subject, ReplaySubject } from 'rxjs';
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
    resetSearch;
    /** RxJS subject to listen for updates of the selection */
    selectedNodesArray = new Subject();
    dblClickNodePayload = new Subject();
    dblClickLinkPayload = new Subject();
    selectedLinkArray = new Subject();
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
        let resetBtn = document.getElementById('reset_graph');
        let saveBtn = document.getElementById('save_graph');
        if (resetBtn) {
            resetBtn.setAttribute('disabled', 'true');
            saveBtn.setAttribute('disabled', 'true');
        }
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
                    .style('fill', (d) => (d.selected ? 'blue' : '#999'))
                    .style('font-weight', (d) => (d.selected ? 700 : 400));
            }
            else {
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
                _d3.selectAll('.node-wrapper').classed('selected', false);
                _d3.selectAll('.node-wrapper').classed('selected', function (p) {
                    return (p.selected = p.previouslySelected = false);
                });
                _d3
                    .selectAll('.nodeText')
                    .style('font-weight', 400)
                    .style('fill', '#212529');
            }
            // reset link style
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
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
                // If there are only two nodes selected we need to update the subject selectedNodesArray so we can create a new link with the correct nodes attached.
                const selectedSize = svg.selectAll('.selected').size();
                if (selectedSize <= 2) {
                    // get data from node
                    const localselectedNodesArray = _d3.selectAll('.selected').data();
                    const filterId = localselectedNodesArray.filter((x) => x);
                    self.selectedNodesArray.next(filterId);
                }
                // Update styles of node elements
                _d3
                    .selectAll('.nodeText')
                    .style('fill', (d) => (d.selected ? 'blue' : '#212529'))
                    .style('font-weight', (d) => (d.selected ? 700 : 400));
            }
            else if (nonSelectedCount > 0) {
                // Select all nodes if none are selected
                _d3.selectAll('.node-wrapper').classed('selected', function (p) {
                    p.previouslySelected = p.selected;
                    return (p.selected = true);
                });
                // Update styles of node elements
                _d3
                    .selectAll('.nodeText')
                    .style('font-weight', 700)
                    .style('fill', 'blue');
            }
            // Update the state of another button based on the current selection
            const updatedSelectedCount = selectedCount > 0 ? totalSize - selectedCount : totalSize;
            if (updatedSelectedCount === totalSize) {
                // Update the state of another button if all nodes are selected
                selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                selectAllNodes.style.opacity = '0.65';
            }
            else {
                // Update the state of another button if not all nodes are selected
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
            }
            // reset link style
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
        };
        d3.select('#toggle_selection').on('click', handleToggleSelection);
        // search
        const searchBtn = document.getElementById('searchButton');
        // Check to see if exists - control bool
        if (searchBtn) {
            const searchInput = document.getElementById('searchInput');
            const clearButton = document.getElementById('clearButton');
            const handleSearch = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    performSearch();
                }
            };
            let matchingNodes = [];
            let currentMatchIndex = -1;
            const showCurrentMatch = () => {
                // Remove any previously added background circle
                d3.selectAll('circle.highlight-background').remove();
                const matchingNode = matchingNodes[currentMatchIndex];
                // Highlight the matching node
                const nodeWrapper = d3.selectAll('.node-wrapper').filter(function () {
                    return d3.select(this).attr('id') === matchingNode.id;
                });
                // Add a new background circle to the entire <g> node
                const bbox = nodeWrapper.node().getBBox();
                const centerX = bbox.x + bbox.width / 2;
                const centerY = bbox.y + bbox.height / 2;
                const radius = Math.max(bbox.width + 30, bbox.height) / 2;
                const backgroundCircle = nodeWrapper
                    .insert('circle', ':first-child')
                    .attr('class', 'highlight-background')
                    .attr('fill', 'yellow')
                    .attr('opacity', '0.3')
                    .attr('cx', centerX)
                    .attr('cy', centerY);
                // Animate the background circle
                backgroundCircle
                    .transition()
                    .duration(1000)
                    .attr('r', radius)
                    .transition()
                    .duration(1000)
                    .attr('r', radius / 4)
                    .attr('opacity', '0.5')
                    .transition()
                    .duration(1000)
                    .attr('r', radius)
                    .attr('opacity', '0.3');
                // Zoom to the matching node
                const zoomTransform = d3.zoomTransform(svg.node());
                const { x, y, k } = zoomTransform;
                const { fx, fy } = matchingNode;
                const newZoomTransform = d3.zoomIdentity
                    .translate(-fx * k + parentWidth / 2, -fy * k + parentHeight / 2)
                    .scale(k);
                zoomContainer
                    .transition()
                    .duration(750)
                    .call(zoom.transform, newZoomTransform);
                // Disable/Enable navigation buttons
                const prevButton = document.getElementById('prevButton');
                const nextButton = document.getElementById('nextButton');
                prevButton.disabled = currentMatchIndex === 0;
                nextButton.disabled = currentMatchIndex === matchingNodes.length - 1;
            };
            const performSearch = () => {
                // Remove any previously added background circle
                d3.selectAll('circle.highlight-background').remove();
                const searchTerm = searchInput.value.toLowerCase().trim();
                if (searchTerm.length >= 3) {
                    // Perform the search
                    matchingNodes = this.nodes.filter((node) => {
                        const label = node.label.map((item) => item.toLowerCase());
                        return (label.some((labelItem) => labelItem.includes(searchTerm)) ||
                            node.label.some((obj) => Object.values(obj).some((value) => String(value).toLowerCase().includes(searchTerm))));
                    });
                    if (matchingNodes.length > 0) {
                        currentMatchIndex = 0;
                        showCurrentMatch();
                    }
                    else {
                        currentMatchIndex = -1;
                        showNoMatches();
                    }
                }
                else {
                    // Clear search
                    matchingNodes = [];
                    currentMatchIndex = -1;
                    showNoMatches();
                }
                updateClearButton();
            };
            const showNoMatches = () => {
                // Reset zoom level
                const newZoomTransform = d3.zoomIdentity.translate(0, 0).scale(1);
                zoomContainer
                    .transition()
                    .duration(750)
                    .call(zoom.transform, newZoomTransform);
                updateZoomLevel();
                // Disable navigation buttons
                const prevButton = document.getElementById('prevButton');
                const nextButton = document.getElementById('nextButton');
                prevButton.disabled = true;
                nextButton.disabled = true;
                // Show "no matches found" text with fade-in transition
                const noMatchesText = document.getElementById('noMatchesText');
                if (searchInput.value !== '') {
                    noMatchesText.classList.add('show');
                    // Fade away after a few seconds
                    setTimeout(() => {
                        // Hide "no matches found" text with fade-out transition
                        noMatchesText.classList.remove('show');
                    }, 3000);
                }
            };
            const navigateNext = () => {
                if (currentMatchIndex < matchingNodes.length - 1) {
                    currentMatchIndex++;
                    showCurrentMatch();
                }
            };
            const navigatePrevious = () => {
                if (currentMatchIndex > 0) {
                    currentMatchIndex--;
                    showCurrentMatch();
                }
            };
            const clearSearchInput = () => {
                searchInput.value = '';
                searchInput.focus();
                updateClearButton();
                matchingNodes = [];
                currentMatchIndex = -1;
                // Remove any previously added background circle
                d3.selectAll('circle.highlight-background').remove();
                // Disable the nextButton & prevButton
                const nextButton = document.getElementById('nextButton');
                nextButton.disabled = true;
                const prevButton = document.getElementById('prevButton');
                prevButton.disabled = true;
            };
            const updateClearButton = () => {
                clearButton.disabled = searchInput.value.trim().length === 0;
            };
            // We reset the search when we reset the data
            if (this.resetSearch) {
                clearSearchInput();
                this.resetSearch = false;
            }
            searchInput.addEventListener('input', updateClearButton);
            searchBtn.addEventListener('click', performSearch);
            clearButton.addEventListener('click', clearSearchInput);
            document
                .getElementById('searchInput')
                .addEventListener('keydown', handleSearch);
            document
                .getElementById('nextButton')
                .addEventListener('click', navigateNext);
            document
                .getElementById('prevButton')
                .addEventListener('click', navigatePrevious);
        }
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
            const totalSize = nodeEnter.size();
            const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
            const count = nonSelectedNodes.size();
            const notSelectedSize = totalSize - count;
            if (notSelectedSize === totalSize) {
                selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                selectAllNodes.style.opacity = '0.65';
            }
            else {
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
            }
            // counts number of selected classes to not exceed 2
            const selectedSize = nodeEnter.selectAll('.selected').size();
            if (selectedSize <= 2) {
                // get data from node
                const localselectedNodesArray = nodeEnter
                    .selectAll('.selected')
                    .data();
                const filterId = localselectedNodesArray.filter((x) => x);
                self.selectedNodesArray.next(filterId);
                return filterId;
            }
            else {
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
            selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
            selectAllNodes.style.opacity = '1';
            _d3
                .selectAll('.nodeText')
                .style('fill', '#212529')
                .style('font-weight', 400);
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
            _d3.select(this).style('fill', 'blue').style('font-weight', 700);
            self.selectedNodesArray.next([]);
        });
        // on right label link click - hightlight labels and package data for context menu
        svg.selectAll('.edgelabel').on('contextmenu', function (d) {
            self.selectedNodesArray.next([]);
            _d3
                .selectAll('.nodeText')
                .style('fill', '#212529')
                .style('font-weight', 400);
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
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
            .call(_d3
            .drag()
            .on('start', function dragstarted(d) {
            // Enable the save & reset btn
            if (resetBtn) {
                document
                    .getElementById('reset_graph')
                    .removeAttribute('disabled');
                document.getElementById('save_graph').removeAttribute('disabled');
            }
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
                if (notSelectedSize === totalSize) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                    selectAllNodes.style.opacity = '0.65';
                }
                // remove the single click styling on other nodes and labels
                _d3
                    .selectAll('.edgelabel')
                    .style('fill', '#212529')
                    .style('font-weight', 400);
                _d3
                    .selectAll('.nodeText')
                    .style('font-weight', 400)
                    .style('fill', '#212529');
                svg
                    .selectAll('.selected')
                    .selectAll('.nodeText')
                    .style('fill', 'blue')
                    .style('font-weight', 700);
                // counts number of selected classes to not exceed 2
                const selectedSize = svg.selectAll('.selected').size();
                if (selectedSize <= 2) {
                    // As we allow for single click without a ctrl+click to select two nodes, we have to apply d.selected to it
                    _d3
                        .selectAll('.selected')
                        .attr('selected', true)
                        .each(function (d) {
                        if (d) {
                            d.selected = true;
                        }
                    });
                    // get data from node
                    const localselectedNodesArray = _d3.selectAll('.selected').data();
                    const filterId = localselectedNodesArray.filter((x) => x);
                    self.selectedNodesArray.next(filterId);
                    return filterId;
                }
                return null;
            }
            else {
                svg.selectAll('.node-wrapper').classed('selected', false);
                d3.select(this).classed('selected', true);
                nodeEnter.each(function (d) {
                    d.selected = false;
                    d.previouslySelected = false;
                });
            }
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
            self.selectedNodesArray.next([]);
            return null;
        });
        // Right click on a node highlights for context menu
        svg.selectAll('.node-wrapper').on('contextmenu', function (d) {
            // counts number of selected classes to not exceed 2
            const selectedSize = svg
                .selectAll('.selected')
                .selectAll('.nodeText')
                .size();
            if (selectedSize !== 2) {
                // We don't want to remove style if they are obtaining the context menu for just two nodes (create link option)
                svg.selectAll('.selected').classed('selected', false);
                self.selectedNodesArray.next([]);
                _d3
                    .selectAll('.edgelabel')
                    .style('fill', '#212529')
                    .style('font-weight', 400);
                _d3
                    .selectAll('.nodeText')
                    .style('fill', '#212529')
                    .style('font-weight', 400);
                // Add style on single right click
                _d3
                    .select(this)
                    .select('.nodeText')
                    .style('fill', 'blue')
                    .style('font-weight', 700);
            }
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
            self.selectedNodesArray.next([]);
            selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
            selectAllNodes.style.opacity = '1';
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
        // To reset the search when we reset the data
        this.resetSearch = true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzdWFsaXNlci1ncmFwaC5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LXJlbGF0aW9uc2hpcC12aXN1YWxpc2VyLXByZW1pdW0tbGliL2xpYi92aXN1YWxpc2VyL3NlcnZpY2VzL3Zpc3VhbGlzZXItZ3JhcGguc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzNDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sTUFBTSxDQUFDOzs7QUFNOUMsTUFBTSxPQUFPLHNCQUFzQjtJQUNiO0lBQXBCLFlBQW9CLFlBQTBCO1FBQTFCLGlCQUFZLEdBQVosWUFBWSxDQUFjO0lBQUksQ0FBQztJQUM1QyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQ1gsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNYLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDZCxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQ2xCLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDakIsUUFBUSxDQUFDO0lBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQztJQUNkLElBQUksR0FBRyxLQUFLLENBQUM7SUFDYixTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQ2xCLFdBQVcsQ0FBQztJQUNuQiwwREFBMEQ7SUFDbkQsa0JBQWtCLEdBQUcsSUFBSSxPQUFPLEVBQVMsQ0FBQztJQUMxQyxtQkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO0lBQ3BDLG1CQUFtQixHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7SUFDcEMsaUJBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztJQUNsQyxhQUFhLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztJQUVwQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9B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UyxJQUFJLFNBQVMsSUFBSSxRQUFRLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDaEUsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNsQixlQUFlLEVBQUUsQ0FBQztnQkFDbEIsZUFBZSxHQUFHLElBQUksQ0FBQztZQUN6QixDQUFDO2lCQUFNLENBQUM7Z0JBQ04sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO2dCQUNsRCxTQUFTLEVBQUUsQ0FBQztZQUNkLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRU0sVUFBVSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVM7UUFDckQsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3hCLHNDQUFzQztRQUN0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNoQiwwRUFBMEU7UUFDMUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNyRCxDQUFDO3dHQTk4Q1Usc0JBQXNCOzRHQUF0QixzQkFBc0IsY0FGckIsTUFBTTs7NEZBRVAsc0JBQXNCO2tCQUhsQyxVQUFVO21CQUFDO29CQUNWLFVBQVUsRUFBRSxNQUFNO2lCQUNuQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCAqIGFzIGQzIGZyb20gJ2QzJztcbmltcG9ydCB7IFN1YmplY3QsIFJlcGxheVN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IERleGllU2VydmljZSB9IGZyb20gJy4uLy4uL2RiL2dyYXBoRGF0YWJhc2UnO1xuXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290Jyxcbn0pXG5leHBvcnQgY2xhc3MgVmlzdWFsaXNlckdyYXBoU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZGV4aWVTZXJ2aWNlOiBEZXhpZVNlcnZpY2UpIHsgfVxuICBwdWJsaWMgbGlua3MgPSBbXTtcbiAgcHVibGljIG5vZGVzID0gW107XG4gIHB1YmxpYyBnQnJ1c2ggPSBudWxsO1xuICBwdWJsaWMgYnJ1c2hNb2RlID0gZmFsc2U7XG4gIHB1YmxpYyBicnVzaGluZyA9IGZhbHNlO1xuICBwdWJsaWMgc2hpZnRLZXk7XG4gIHB1YmxpYyBleHRlbnQgPSBudWxsO1xuICBwdWJsaWMgem9vbSA9IGZhbHNlO1xuICBwdWJsaWMgem9vbVRvRml0ID0gZmFsc2U7XG4gIHB1YmxpYyByZXNldFNlYXJjaDtcbiAgLyoqIFJ4SlMgc3ViamVjdCB0byBsaXN0ZW4gZm9yIHVwZGF0ZXMgb2YgdGhlIHNlbGVjdGlvbiAqL1xuICBwdWJsaWMgc2VsZWN0ZWROb2Rlc0FycmF5ID0gbmV3IFN1YmplY3Q8YW55W10+KCk7XG4gIHB1YmxpYyBkYmxDbGlja05vZGVQYXlsb2FkID0gbmV3IFN1YmplY3QoKTtcbiAgcHVibGljIGRibENsaWNrTGlua1BheWxvYWQgPSBuZXcgU3ViamVjdCgpO1xuICBwdWJsaWMgc2VsZWN0ZWRMaW5rQXJyYXkgPSBuZXcgU3ViamVjdCgpO1xuICBwdWJsaWMgc2F2ZUdyYXBoRGF0YSA9IG5ldyBSZXBsYXlTdWJqZWN0KCk7XG5cbiAgcHVibGljIHVwZGF0ZShkYXRhLCBlbGVtZW50LCB6b29tLCB6b29tVG9GaXQpIHtcbiAgICBjb25zdCBzdmcgPSBkMy5zZWxlY3QoZWxlbWVudCk7XG4gICAgdGhpcy56b29tID0gem9vbTtcbiAgICB0aGlzLnpvb21Ub0ZpdCA9IHpvb21Ub0ZpdDtcbiAgICByZXR1cm4gdGhpcy5fdXBkYXRlKGQzLCBzdmcsIGRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSB0aWNrZWQobGluaywgbm9kZSwgZWRnZXBhdGhzKSB7XG4gICAgbGluay5lYWNoKGZ1bmN0aW9uIChkLCBpLCBuKSB7XG4gICAgICAvLyBUb3RhbCBkaWZmZXJlbmNlIGluIHggYW5kIHkgZnJvbSBzb3VyY2UgdG8gdGFyZ2V0XG4gICAgICBsZXQgZGlmZlggPSBkLnRhcmdldC54IC0gZC5zb3VyY2UueDtcbiAgICAgIGxldCBkaWZmWSA9IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55O1xuXG4gICAgICAvLyBMZW5ndGggb2YgcGF0aCBmcm9tIGNlbnRlciBvZiBzb3VyY2Ugbm9kZSB0byBjZW50ZXIgb2YgdGFyZ2V0IG5vZGVcbiAgICAgIGxldCBwYXRoTGVuZ3RoID0gTWF0aC5zcXJ0KGRpZmZYICogZGlmZlggKyBkaWZmWSAqIGRpZmZZKTtcblxuICAgICAgLy8geCBhbmQgeSBkaXN0YW5jZXMgZnJvbSBjZW50ZXIgdG8gb3V0c2lkZSBlZGdlIG9mIHRhcmdldCBub2RlXG4gICAgICBsZXQgb2Zmc2V0WCA9IChkaWZmWCAqIDQwKSAvIHBhdGhMZW5ndGg7XG4gICAgICBsZXQgb2Zmc2V0WSA9IChkaWZmWSAqIDQwKSAvIHBhdGhMZW5ndGg7XG5cbiAgICAgIGQzLnNlbGVjdChuW2ldKVxuICAgICAgICAuYXR0cigneDEnLCBkLnNvdXJjZS54ICsgb2Zmc2V0WClcbiAgICAgICAgLmF0dHIoJ3kxJywgZC5zb3VyY2UueSArIG9mZnNldFkpXG4gICAgICAgIC5hdHRyKCd4MicsIGQudGFyZ2V0LnggLSBvZmZzZXRYKVxuICAgICAgICAuYXR0cigneTInLCBkLnRhcmdldC55IC0gb2Zmc2V0WSk7XG4gICAgfSk7XG5cbiAgICBub2RlLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gYHRyYW5zbGF0ZSgke2QueH0sICR7ZC55ICsgNTB9KWA7XG4gICAgfSk7XG5cbiAgICAvLyBTZXRzIGEgYm91bmRyeSBmb3IgdGhlIG5vZGVzXG4gICAgLy8gbm9kZS5hdHRyKCdjeCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgLy8gICByZXR1cm4gKGQueCA9IE1hdGgubWF4KDQwLCBNYXRoLm1pbig5MDAgLSAxNSwgZC54KSkpO1xuICAgIC8vIH0pO1xuICAgIC8vIG5vZGUuYXR0cignY3knLCBmdW5jdGlvbiAoZCkge1xuICAgIC8vICAgcmV0dXJuIChkLnkgPSBNYXRoLm1heCg1MCwgTWF0aC5taW4oNjAwIC0gNDAsIGQueSkpKTtcbiAgICAvLyB9KTtcblxuICAgIGVkZ2VwYXRocy5hdHRyKCdkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBgTSAke2Quc291cmNlLnh9ICR7ZC5zb3VyY2UueX0gTCAke2QudGFyZ2V0Lnh9ICR7ZC50YXJnZXQueX1gO1xuICAgIH0pO1xuXG4gICAgZWRnZXBhdGhzLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICBpZiAoZC50YXJnZXQueCA8IGQuc291cmNlLngpIHtcbiAgICAgICAgY29uc3QgYmJveCA9IHRoaXMuZ2V0QkJveCgpO1xuICAgICAgICBjb25zdCByeCA9IGJib3gueCArIGJib3gud2lkdGggLyAyO1xuICAgICAgICBjb25zdCByeSA9IGJib3gueSArIGJib3guaGVpZ2h0IC8gMjtcbiAgICAgICAgcmV0dXJuIGByb3RhdGUoMTgwICR7cnh9ICR7cnl9KWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJ3JvdGF0ZSgwKSc7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGluaXREZWZpbml0aW9ucyhzdmcpIHtcbiAgICBjb25zdCBkZWZzID0gc3ZnLmFwcGVuZCgnZGVmcycpO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlTWFya2VyKGlkLCByZWZYLCBwYXRoKSB7XG4gICAgICBkZWZzXG4gICAgICAgIC5hcHBlbmQoJ21hcmtlcicpXG4gICAgICAgIC5hdHRyKCdpZCcsIGlkKVxuICAgICAgICAuYXR0cigndmlld0JveCcsICctMCAtNSAxMCAxMCcpXG4gICAgICAgIC5hdHRyKCdyZWZYJywgcmVmWClcbiAgICAgICAgLmF0dHIoJ3JlZlknLCAwKVxuICAgICAgICAuYXR0cignb3JpZW50JywgJ2F1dG8nKVxuICAgICAgICAuYXR0cignbWFya2VyV2lkdGgnLCA4KVxuICAgICAgICAuYXR0cignbWFya2VySGVpZ2h0JywgOClcbiAgICAgICAgLmF0dHIoJ3hvdmVyZmxvdycsICd2aXNpYmxlJylcbiAgICAgICAgLmFwcGVuZCgnc3ZnOnBhdGgnKVxuICAgICAgICAuYXR0cignZCcsIHBhdGgpXG4gICAgICAgIC5hdHRyKCdmaWxsJywgJyNiNGI0YjQnKVxuICAgICAgICAuc3R5bGUoJ3N0cm9rZScsICdub25lJyk7XG4gICAgfVxuXG4gICAgY3JlYXRlTWFya2VyKCdhcnJvd2hlYWRUYXJnZXQnLCAwLCAnTSAwLC01IEwgMTAgLDAgTCAwLDUnKTtcbiAgICBjcmVhdGVNYXJrZXIoJ2Fycm93aGVhZFNvdXJjZScsIDIsICdNIDEwIC01IEwgMCAwIEwgMTAgNScpO1xuXG4gICAgcmV0dXJuIHN2ZztcbiAgfVxuXG4gIHByaXZhdGUgZm9yY2VTaW11bGF0aW9uKF9kMywgeyB3aWR0aCwgaGVpZ2h0IH0pIHtcbiAgICByZXR1cm4gX2QzXG4gICAgICAuZm9yY2VTaW11bGF0aW9uKClcbiAgICAgIC52ZWxvY2l0eURlY2F5KDAuMSlcbiAgICAgIC5mb3JjZShcbiAgICAgICAgJ2xpbmsnLFxuICAgICAgICBfZDNcbiAgICAgICAgICAuZm9yY2VMaW5rKClcbiAgICAgICAgICAuaWQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBkLmlkO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmRpc3RhbmNlKDUwMClcbiAgICAgICAgICAuc3RyZW5ndGgoMSlcbiAgICAgIClcbiAgICAgIC5mb3JjZSgnY2hhcmdlJywgX2QzLmZvcmNlTWFueUJvZHkoKS5zdHJlbmd0aCgwLjEpKVxuICAgICAgLmZvcmNlKCdjZW50ZXInLCBfZDMuZm9yY2VDZW50ZXIod2lkdGggLyAyLCBoZWlnaHQgLyAyKSlcbiAgICAgIC5mb3JjZSgnY29sbGlzaW9uJywgX2QzLmZvcmNlQ29sbGlkZSgpLnJhZGl1cygxNSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wYXJlQW5kTWFya05vZGVzTmV3KG5vZGVzLCBvbGRfbm9kZXMpIHtcbiAgICAvLyBDcmVhdGUgYSBtYXAgb2YgaWRzIHRvIG5vZGUgb2JqZWN0cyBmb3IgdGhlIG9sZF9ub2RlcyBhcnJheVxuICAgIGNvbnN0IG9sZE1hcCA9IG9sZF9ub2Rlcy5yZWR1Y2UoKG1hcCwgbm9kZSkgPT4ge1xuICAgICAgbWFwW25vZGUuaWRdID0gbm9kZTtcbiAgICAgIHJldHVybiBtYXA7XG4gICAgfSwge30pO1xuXG4gICAgLy8gQ2hlY2sgZWFjaCBub2RlIGluIHRoZSBub2RlcyBhcnJheSB0byBzZWUgaWYgaXQncyBuZXcgb3Igbm90XG4gICAgbm9kZXMuZm9yRWFjaCgobm9kZSkgPT4ge1xuICAgICAgaWYgKCFvbGRNYXBbbm9kZS5pZF0pIHtcbiAgICAgICAgLy8gTm9kZSBpcyBuZXcsIG1hcmsgaXQgd2l0aCB0aGUgbmV3SXRlbSBwcm9wZXJ0eVxuICAgICAgICBub2RlLm5ld0l0ZW0gPSB0cnVlO1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGRhZ3JlIGNvb3JkaW5hdGVzIGZyb20gbmV3IG5vZGVzIHNvIHdlIGNhbiBzZXQgYSByYW5kb20gb25lIGluIHZpZXdcbiAgICAgICAgbm9kZS5meCA9IG51bGw7XG4gICAgICAgIG5vZGUuZnkgPSBudWxsO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGVzO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVOZXdJdGVtKG5vZGVzKSB7XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICBpZiAobm9kZS5oYXNPd25Qcm9wZXJ0eSgnbmV3SXRlbScpKSB7XG4gICAgICAgIGRlbGV0ZSBub2RlLm5ld0l0ZW07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2RlcztcbiAgfVxuXG4gIHByaXZhdGUgcmFuZG9taXNlTm9kZVBvc2l0aW9ucyhub2RlRGF0YSwgd2lkdGgsIGhlaWdodCkge1xuICAgIGxldCBtaW5EaXN0YW5jZSA9IDEwMDtcbiAgICBjb25zdCBhdmFpbGFibGVTcGFjZSA9IHdpZHRoICogaGVpZ2h0O1xuICAgIGxldCBhZGp1c3RlZFJlcXVpcmVkU3BhY2UgPSBub2RlRGF0YS5sZW5ndGggKiBtaW5EaXN0YW5jZSAqIG1pbkRpc3RhbmNlO1xuXG4gICAgaWYgKGFkanVzdGVkUmVxdWlyZWRTcGFjZSA+IGF2YWlsYWJsZVNwYWNlKSB7XG4gICAgICB3aGlsZSAoYWRqdXN0ZWRSZXF1aXJlZFNwYWNlID4gYXZhaWxhYmxlU3BhY2UgJiYgbWluRGlzdGFuY2UgPiAwKSB7XG4gICAgICAgIG1pbkRpc3RhbmNlIC09IDEwO1xuICAgICAgICBhZGp1c3RlZFJlcXVpcmVkU3BhY2UgPSBub2RlRGF0YS5sZW5ndGggKiBtaW5EaXN0YW5jZSAqIG1pbkRpc3RhbmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWRqdXN0ZWRSZXF1aXJlZFNwYWNlID4gYXZhaWxhYmxlU3BhY2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdOb3QgZW5vdWdoIHNwYWNlIHRvIGFjY29tbW9kYXRlIGFsbCBub2RlcyB3aXRob3V0IGEgZml4ZWQgcG9zaXRpb24uJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIG5vZGVEYXRhLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgIGlmIChub2RlLmZ4ID09PSBudWxsICYmIG5vZGUuZnkgPT09IG51bGwpIHtcbiAgICAgICAgbGV0IGN1cnJlbnRNaW5EaXN0YW5jZSA9IG1pbkRpc3RhbmNlO1xuICAgICAgICBsZXQgY2FuUGxhY2VOb2RlID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKCFjYW5QbGFjZU5vZGUgJiYgY3VycmVudE1pbkRpc3RhbmNlID4gMCkge1xuICAgICAgICAgIG5vZGUuZnggPSBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50MzJBcnJheSgxKSlbMF0gJSB3aWR0aDtcbiAgICAgICAgICBub2RlLmZ5ID0gY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDMyQXJyYXkoMSkpWzBdICUgaGVpZ2h0O1xuXG4gICAgICAgICAgY2FuUGxhY2VOb2RlID0gIW5vZGVEYXRhLnNvbWUoKG90aGVyTm9kZSkgPT4ge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBvdGhlck5vZGUuZnggPT09IG51bGwgfHxcbiAgICAgICAgICAgICAgb3RoZXJOb2RlLmZ5ID09PSBudWxsIHx8XG4gICAgICAgICAgICAgIG90aGVyTm9kZSA9PT0gbm9kZVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZHggPSBvdGhlck5vZGUuZnggLSBub2RlLmZ4O1xuICAgICAgICAgICAgY29uc3QgZHkgPSBvdGhlck5vZGUuZnkgLSBub2RlLmZ5O1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSkgPCBjdXJyZW50TWluRGlzdGFuY2U7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoIWNhblBsYWNlTm9kZSkge1xuICAgICAgICAgICAgY3VycmVudE1pbkRpc3RhbmNlLS07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjYW5QbGFjZU5vZGUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnTm90IGVub3VnaCBzcGFjZSB0byBhY2NvbW1vZGF0ZSBhbGwgbm9kZXMgd2l0aG91dCBhIGZpeGVkIHBvc2l0aW9uLidcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZURhdGE7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgX3VwZGF0ZShfZDMsIHN2ZywgZGF0YSkge1xuICAgIGNvbnN0IHsgbm9kZXMsIGxpbmtzIH0gPSBkYXRhO1xuICAgIHRoaXMubm9kZXMgPSBub2RlcyB8fCBbXTtcbiAgICB0aGlzLmxpbmtzID0gbGlua3MgfHwgW107XG5cbiAgICAvLyBEaXNhYmxlIHRoZSByZXNldCBidG5cbiAgICBsZXQgcmVzZXRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzZXRfZ3JhcGgnKTtcbiAgICBsZXQgc2F2ZUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlX2dyYXBoJyk7XG4gICAgaWYgKHJlc2V0QnRuKSB7XG4gICAgICByZXNldEJ0bi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgJ3RydWUnKTtcbiAgICAgIHNhdmVCdG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgfVxuICAgIC8vIFdpZHRoL0hlaWdodCBvZiBjYW52YXNcbiAgICBjb25zdCBwYXJlbnRXaWR0aCA9IF9kMy5zZWxlY3QoJ3N2ZycpLm5vZGUoKS5wYXJlbnROb2RlLmNsaWVudFdpZHRoO1xuICAgIGNvbnN0IHBhcmVudEhlaWdodCA9IF9kMy5zZWxlY3QoJ3N2ZycpLm5vZGUoKS5wYXJlbnROb2RlLmNsaWVudEhlaWdodDtcblxuICAgIC8vIENoZWNrIHRvIHNlZSBpZiBub2RlcyBhcmUgaW4gRGV4aWVcbiAgICBjb25zdCBvbGREYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKCdub2RlcycpO1xuICAgIGNvbnN0IG9sZE5vZGVzID0gb2xkRGF0YSA/IG9sZERhdGEubm9kZXMgOiBbXTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvbGROb2RlcykpIHtcbiAgICAgIC8vIENvbXBhcmUgYW5kIHNldCBwcm9wZXJ0eSBmb3IgbmV3IG5vZGVzXG4gICAgICB0aGlzLm5vZGVzID0gdGhpcy5jb21wYXJlQW5kTWFya05vZGVzTmV3KG5vZGVzLCBvbGROb2Rlcyk7XG4gICAgICAvLyBSZW1vdmUgb2xkIG5vZGVzIGZyb20gRGV4aWVcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmRlbGV0ZUdyYXBoRGF0YSgnbm9kZXMnKTtcbiAgICAgIC8vIEFkZCBuZXcgbm9kZXMgdG8gRGV4aWVcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLnNhdmVHcmFwaERhdGEoeyBkYXRhSWQ6ICdub2RlcycsIG5vZGVzOiBkYXRhLm5vZGVzLCBsaW5rczogZGF0YS5saW5rcyB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQWRkIGZpcnN0IHNldCBvZiBub2RlcyB0byBEZXhpZVxuICAgICAgYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2Uuc2F2ZUdyYXBoRGF0YSh7IGRhdGFJZDogJ25vZGVzJywgbm9kZXM6IGRhdGEubm9kZXMsIGxpbmtzOiBkYXRhLmxpbmtzIH0pO1xuICAgIH1cblxuICAgIC8vIElmIG5vZGVzIGRvbid0IGhhdmUgYSBmeC9meSBjb29yZGluYXRlIHdlIGdlbmVyYXRlIGEgcmFuZG9tIG9uZSAtIGRhZ3JlIG5vZGVzIHdpdGhvdXQgbGlua3MgYW5kIG5ldyBub2RlcyBhZGRlZCB0byBjYW52YXMgaGF2ZSBudWxsIGNvb3JkaW5hdGVzIGJ5IGRlc2lnblxuICAgIHRoaXMubm9kZXMgPSB0aGlzLnJhbmRvbWlzZU5vZGVQb3NpdGlvbnMoXG4gICAgICB0aGlzLm5vZGVzLFxuICAgICAgcGFyZW50V2lkdGgsXG4gICAgICBwYXJlbnRIZWlnaHRcbiAgICApO1xuXG4gICAgLy8gR2V0dGluZyBwYXJlbnRzIGxpbmVTdHlsZSBhbmQgYWRkaW5nIGl0IHRvIGNoaWxkIG9iamVjdHNcbiAgICBjb25zdCByZWxhdGlvbnNoaXBzQXJyYXkgPSB0aGlzLmxpbmtzLm1hcChcbiAgICAgICh7IGxpbmVTdHlsZSwgdGFyZ2V0QXJyb3csIHNvdXJjZUFycm93LCByZWxhdGlvbnNoaXBzIH0pID0+XG4gICAgICAgIHJlbGF0aW9uc2hpcHMubWFwKChyKSA9PiAoe1xuICAgICAgICAgIHBhcmVudExpbmVTdHlsZTogbGluZVN0eWxlLFxuICAgICAgICAgIHBhcmVudFNvdXJjZUFycm93OiBzb3VyY2VBcnJvdyxcbiAgICAgICAgICBwYXJlbnRUYXJnZXRBcnJvdzogdGFyZ2V0QXJyb3csXG4gICAgICAgICAgLi4ucixcbiAgICAgICAgfSkpXG4gICAgKTtcblxuICAgIC8vIEFkZGluZyBkeSB2YWx1ZSBiYXNlZCBvbiBsaW5rIG51bWJlciBhbmQgcG9zaXRpb24gaW4gcGFyZW50XG4gICAgcmVsYXRpb25zaGlwc0FycmF5Lm1hcCgobGlua1JlbGF0aW9uc2hpcCkgPT4ge1xuICAgICAgbGlua1JlbGF0aW9uc2hpcC5tYXAoKGxpbmtPYmplY3QsIGkpID0+IHtcbiAgICAgICAgLy8gZHkgaW5jcmVtZW50cyBvZiAxNXB4XG4gICAgICAgIGxpbmtPYmplY3RbJ2R5J10gPSAyMCArIGkgKiAxNTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gSUUxMSBkb2VzIG5vdCBsaWtlIC5mbGF0XG4gICAgdGhpcy5saW5rcyA9IHJlbGF0aW9uc2hpcHNBcnJheS5yZWR1Y2UoKGFjYywgdmFsKSA9PiBhY2MuY29uY2F0KHZhbCksIFtdKTtcblxuICAgIGQzLnNlbGVjdCgnc3ZnJykuYXBwZW5kKCdnJyk7XG5cbiAgICAvLyBab29tIFN0YXJ0XG4gICAgY29uc3Qgem9vbUNvbnRhaW5lciA9IF9kMy5zZWxlY3QoJ3N2ZyBnJyk7XG4gICAgbGV0IGN1cnJlbnRab29tID0gZDMuem9vbVRyYW5zZm9ybShkMy5zZWxlY3QoJ3N2ZycpLm5vZGUoKSk7XG4gICAgY29uc3QgdXBkYXRlWm9vbUxldmVsID0gKCkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudFNjYWxlID0gY3VycmVudFpvb20uaztcbiAgICAgIGNvbnN0IG1heFNjYWxlID0gem9vbS5zY2FsZUV4dGVudCgpWzFdO1xuICAgICAgY29uc3Qgem9vbVBlcmNlbnRhZ2UgPSAoKGN1cnJlbnRTY2FsZSAtIDAuNSkgLyAobWF4U2NhbGUgLSAwLjUpKSAqIDIwMDtcbiAgICAgIGNvbnN0IHpvb21MZXZlbERpc3BsYXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbV9sZXZlbCcpO1xuICAgICAgY29uc3Qgem9vbUxldmVsVGV4dCA9IGBab29tOiAke3pvb21QZXJjZW50YWdlLnRvRml4ZWQoMCl9JWA7XG4gICAgICBjb25zdCB6b29tSW5CdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbV9pbicpO1xuICAgICAgY29uc3Qgem9vbU91dEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd6b29tX291dCcpO1xuICAgICAgY29uc3Qgem9vbVJlc2V0QnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb21fcmVzZXQnKTtcblxuICAgICAgLy8gSXQgbWlnaHQgbm90IGV4aXN0IGRlcGVuZGluZyBvbiB0aGUgdGhpcy56b29tIGJvb2xlYW5cbiAgICAgIGlmICh6b29tUmVzZXRCdG4pIHtcbiAgICAgICAgem9vbVJlc2V0QnRuLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAndHJ1ZScpO1xuICAgICAgfVxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHpvb20gbGV2ZWwgaGFzIGNoYW5nZWQgYmVmb3JlIHVwZGF0aW5nIHRoZSBkaXNwbGF5IC8gYWxsb3dzIGZvciBwYW5uaW5nIHdpdGhvdXQgc2hvd2luZyB0aGUgem9vbSBwZXJjZW50YWdlXG4gICAgICBpZiAoem9vbUxldmVsRGlzcGxheSAmJiB6b29tTGV2ZWxEaXNwbGF5LmlubmVySFRNTCAhPT0gem9vbUxldmVsVGV4dCkge1xuICAgICAgICB6b29tTGV2ZWxEaXNwbGF5LmlubmVySFRNTCA9IHpvb21MZXZlbFRleHQ7XG4gICAgICAgIHpvb21MZXZlbERpc3BsYXkuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgaWYgKHpvb21MZXZlbERpc3BsYXkpIHtcbiAgICAgICAgICAgIHpvb21MZXZlbERpc3BsYXkuc3R5bGUub3BhY2l0eSA9ICcwJztcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDIwMDApO1xuICAgICAgfVxuICAgICAgLy8gRGlzYWJsZSB0aGUgem9vbUluQnRuIGlmIHRoZSB6b29tIGxldmVsIGlzIGF0IDIwMCVcbiAgICAgIGlmICh6b29tSW5CdG4pIHtcbiAgICAgICAgaWYgKHpvb21QZXJjZW50YWdlID09PSAyMDApIHtcbiAgICAgICAgICB6b29tSW5CdG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgem9vbUluQnRuLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRGlzYWJsZSB0aGUgem9vbU91dEJ0biBpZiB0aGUgem9vbSBsZXZlbCBpcyBhdCAwJVxuICAgICAgaWYgKHpvb21PdXRCdG4pIHtcbiAgICAgICAgaWYgKHpvb21QZXJjZW50YWdlID09PSAwKSB7XG4gICAgICAgICAgem9vbU91dEJ0bi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgJ3RydWUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB6b29tT3V0QnRuLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRGlzYWJsZSB0aGUgem9vbVJlc2V0QnRuIGlmIHRoZSB6b29tIGxldmVsIGlzIGF0IDEwMCVcbiAgICAgIGlmICh6b29tUmVzZXRCdG4pIHtcbiAgICAgICAgaWYgKHpvb21QZXJjZW50YWdlID09PSAxMDApIHtcbiAgICAgICAgICB6b29tUmVzZXRCdG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgem9vbVJlc2V0QnRuLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgbGV0IHpvb21lZEluaXQ7XG4gICAgY29uc3Qgem9vbWVkID0gKCkgPT4ge1xuICAgICAgY29uc3QgdHJhbnNmb3JtID0gZDMuZXZlbnQudHJhbnNmb3JtO1xuICAgICAgem9vbUNvbnRhaW5lci5hdHRyKFxuICAgICAgICAndHJhbnNmb3JtJyxcbiAgICAgICAgYHRyYW5zbGF0ZSgke3RyYW5zZm9ybS54fSwgJHt0cmFuc2Zvcm0ueX0pIHNjYWxlKCR7dHJhbnNmb3JtLmt9KWBcbiAgICAgICk7XG4gICAgICBjdXJyZW50Wm9vbSA9IHRyYW5zZm9ybTtcbiAgICAgIHpvb21lZEluaXQgPSB0cnVlO1xuICAgICAgdXBkYXRlWm9vbUxldmVsKCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHpvb20gPSBkM1xuICAgICAgLnpvb20oKVxuICAgICAgLnNjYWxlRXh0ZW50KFswLjUsIDEuNV0pXG4gICAgICAub24oJ3N0YXJ0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoJ2N1cnNvcicsIHRoaXMuem9vbSA/IG51bGwgOiAnZ3JhYmJpbmcnKTtcbiAgICAgIH0pXG4gICAgICAub24oJ3pvb20nLCB0aGlzLnpvb20gPyB6b29tZWQgOiBudWxsKVxuICAgICAgLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZSgnY3Vyc29yJywgJ2dyYWInKTtcbiAgICAgIH0pO1xuICAgIHN2Z1xuICAgICAgLmNhbGwoem9vbSlcbiAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ2dyYWInKVxuICAgICAgLm9uKHRoaXMuem9vbSA/IG51bGwgOiAnd2hlZWwuem9vbScsIG51bGwpXG4gICAgICAub24oJ2RibGNsaWNrLnpvb20nLCBudWxsKTtcbiAgICB6b29tLmZpbHRlcigoKSA9PiAhZDMuZXZlbnQuc2hpZnRLZXkpO1xuXG4gICAgLy8gWm9vbSBidXR0b24gY29udHJvbHNcbiAgICBkMy5zZWxlY3QoJyN6b29tX2luJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgem9vbS5zY2FsZUJ5KHN2Zy50cmFuc2l0aW9uKCkuZHVyYXRpb24oNzUwKSwgMS4yKTtcbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH0pO1xuICAgIGQzLnNlbGVjdCgnI3pvb21fb3V0Jykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgem9vbS5zY2FsZUJ5KHN2Zy50cmFuc2l0aW9uKCkuZHVyYXRpb24oNzUwKSwgMC44KTtcbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH0pO1xuICAgIGQzLnNlbGVjdCgnI3pvb21fcmVzZXQnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICB6b29tLnNjYWxlVG8oc3ZnLnRyYW5zaXRpb24oKS5kdXJhdGlvbig3NTApLCAxKTtcbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH0pO1xuICAgIC8vIFpvb20gdG8gZml0IGZ1bmN0aW9uIGFuZCBCdXR0b25cbiAgICBjb25zdCBoYW5kbGVab29tVG9GaXQgPSAoKSA9PiB7XG4gICAgICBjb25zdCBub2RlQkJveCA9IHpvb21Db250YWluZXIubm9kZSgpLmdldEJCb3goKTtcblxuICAgICAgLy8gQ2FsY3VsYXRlIHNjYWxlIGFuZCB0cmFuc2xhdGUgdmFsdWVzIHRvIGZpdCBhbGwgbm9kZXNcbiAgICAgIGNvbnN0IHBhZGRpbmcgPSAzMDtcbiAgICAgIGNvbnN0IHNjYWxlWCA9IChwYXJlbnRXaWR0aCAtIHBhZGRpbmcgKiAyKSAvIG5vZGVCQm94LndpZHRoO1xuICAgICAgY29uc3Qgc2NhbGVZID0gKHBhcmVudEhlaWdodCAtIHBhZGRpbmcgKiAyKSAvIG5vZGVCQm94LmhlaWdodDtcbiAgICAgIGNvbnN0IHNjYWxlID0gTWF0aC5taW4oc2NhbGVYLCBzY2FsZVksIDEuMCk7IC8vIFJlc3RyaWN0IHNjYWxlIHRvIGEgbWF4aW11bSBvZiAxLjBcblxuICAgICAgY29uc3QgdHJhbnNsYXRlWCA9XG4gICAgICAgIC1ub2RlQkJveC54ICogc2NhbGUgKyAocGFyZW50V2lkdGggLSBub2RlQkJveC53aWR0aCAqIHNjYWxlKSAvIDI7XG4gICAgICBjb25zdCB0cmFuc2xhdGVZID1cbiAgICAgICAgLW5vZGVCQm94LnkgKiBzY2FsZSArIChwYXJlbnRIZWlnaHQgLSBub2RlQkJveC5oZWlnaHQgKiBzY2FsZSkgLyAyO1xuXG4gICAgICAvLyBHZXQgdGhlIGJvdW5kaW5nIGJveCBvZiBhbGwgbm9kZXNcbiAgICAgIGNvbnN0IGFsbE5vZGVzID0gem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKTtcbiAgICAgIGNvbnN0IGFsbE5vZGVzQkJveCA9IGFsbE5vZGVzLm5vZGVzKCkucmVkdWNlKFxuICAgICAgICAoYWNjLCBub2RlKSA9PiB7XG4gICAgICAgICAgY29uc3Qgbm9kZUJCb3ggPSBub2RlLmdldEJCb3goKTtcbiAgICAgICAgICBhY2MueCA9IE1hdGgubWluKGFjYy54LCBub2RlQkJveC54KTtcbiAgICAgICAgICBhY2MueSA9IE1hdGgubWluKGFjYy55LCBub2RlQkJveC55KTtcbiAgICAgICAgICBhY2Mud2lkdGggPSBNYXRoLm1heChhY2Mud2lkdGgsIG5vZGVCQm94LnggKyBub2RlQkJveC53aWR0aCk7XG4gICAgICAgICAgYWNjLmhlaWdodCA9IE1hdGgubWF4KGFjYy5oZWlnaHQsIG5vZGVCQm94LnkgKyBub2RlQkJveC5oZWlnaHQpO1xuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sXG4gICAgICAgIHsgeDogSW5maW5pdHksIHk6IEluZmluaXR5LCB3aWR0aDogLUluZmluaXR5LCBoZWlnaHQ6IC1JbmZpbml0eSB9XG4gICAgICApO1xuXG4gICAgICAvLyBDaGVjayBpZiBhbGwgbm9kZXMgYXJlIHdpdGhpbiB0aGUgdmlld2FibGUgY29udGFpbmVyXG4gICAgICBpZiAoXG4gICAgICAgIGFsbE5vZGVzQkJveC54ICogc2NhbGUgPj0gMCAmJlxuICAgICAgICBhbGxOb2Rlc0JCb3gueSAqIHNjYWxlID49IDAgJiZcbiAgICAgICAgYWxsTm9kZXNCQm94LndpZHRoICogc2NhbGUgPD0gcGFyZW50V2lkdGggJiZcbiAgICAgICAgYWxsTm9kZXNCQm94LmhlaWdodCAqIHNjYWxlIDw9IHBhcmVudEhlaWdodFxuICAgICAgKSB7XG4gICAgICAgIC8vIEFsbCBub2RlcyBhcmUgd2l0aGluIHRoZSB2aWV3YWJsZSBjb250YWluZXIsIG5vIG5lZWQgdG8gYXBwbHkgem9vbSB0cmFuc2Zvcm1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBNYW51YWxseSByZXNldCB0aGUgem9vbSB0cmFuc2Zvcm1cbiAgICAgIHpvb21Db250YWluZXJcbiAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAuZHVyYXRpb24oNzUwKVxuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLCAwKSBzY2FsZSgxKScpO1xuXG4gICAgICAvLyBBcHBseSB6b29tIHRyYW5zZm9ybSB0byB6b29tQ29udGFpbmVyXG4gICAgICB6b29tQ29udGFpbmVyXG4gICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgLmR1cmF0aW9uKDc1MClcbiAgICAgICAgLmF0dHIoXG4gICAgICAgICAgJ3RyYW5zZm9ybScsXG4gICAgICAgICAgYHRyYW5zbGF0ZSgke3RyYW5zbGF0ZVh9LCAke3RyYW5zbGF0ZVl9KSBzY2FsZSgke3NjYWxlfSlgXG4gICAgICAgICk7XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudFpvb20gdmFyaWFibGUgd2l0aCB0aGUgbmV3IHRyYW5zZm9ybVxuICAgICAgLy8gem9vbWVkSW5pdCAtIGNyZWF0ZWQgYmVjYXVzZSBpZiB6b29tVG9GaXQgaXMgY2FsbGVkIGJlZm9yZSBhbnl0aGluZyBlbHNlIGl0IHNjcmV3cyB1cCB0aGUgYmFzZSB0cmFuc2Zvcm0gLSBlLmcuIHNob3dDdXJyZW50TWF0Y2hcbiAgICAgIGlmICh6b29tZWRJbml0KSB7XG4gICAgICAgIGN1cnJlbnRab29tLnggPSB0cmFuc2xhdGVYO1xuICAgICAgICBjdXJyZW50Wm9vbS55ID0gdHJhbnNsYXRlWTtcbiAgICAgICAgY3VycmVudFpvb20uayA9IHNjYWxlO1xuICAgICAgfVxuICAgICAgdXBkYXRlWm9vbUxldmVsKCk7XG4gICAgfTtcblxuICAgIGQzLnNlbGVjdCgnI3pvb21fdG9fZml0Jykub24oJ2NsaWNrJywgaGFuZGxlWm9vbVRvRml0KTtcblxuICAgIC8vIENoZWNrIGlmIHpvb20gbGV2ZWwgaXMgYXQgMCUgb3IgMTAwJSBiZWZvcmUgYWxsb3dpbmcgbW91c2V3aGVlbCB6b29tIC0gdGhpcyBzdGFiaWxpc2VzIHRoZSBjYW52YXMgd2hlbiB0aGUgbGltaXQgaXMgcmVhY2hlZFxuICAgIHN2Zy5vbignd2hlZWwnLCAoKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50U2NhbGUgPSBjdXJyZW50Wm9vbS5rO1xuICAgICAgY29uc3QgbWF4U2NhbGUgPSB6b29tLnNjYWxlRXh0ZW50KClbMV07XG4gICAgICBjb25zdCBtaW5TY2FsZSA9IHpvb20uc2NhbGVFeHRlbnQoKVswXTtcbiAgICAgIGlmIChjdXJyZW50U2NhbGUgPT09IG1heFNjYWxlIHx8IGN1cnJlbnRTY2FsZSA9PT0gbWluU2NhbGUpIHtcbiAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFpvb20gRW5kXG4gICAgLy8gU2VsZWN0aW9uIGJ1dHRvbnNcbiAgICBjb25zdCBzZWxlY3RBbGxOb2RlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZWxlY3RfYWxsJyk7XG4gICAgY29uc3QgaGFuZGxlU2VsZWN0QWxsTm9kZXMgPSAoKSA9PiB7XG4gICAgICBjb25zdCB0b3RhbFNpemUgPSBub2RlRW50ZXIuc2l6ZSgpO1xuICAgICAgY29uc3Qgbm9uU2VsZWN0ZWROb2RlcyA9IGQzLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcjpub3QoLnNlbGVjdGVkKScpO1xuICAgICAgY29uc3QgY291bnQgPSBub25TZWxlY3RlZE5vZGVzLnNpemUoKTtcbiAgICAgIGNvbnN0IG5vdFNlbGVjdGVkU2l6ZSA9IHRvdGFsU2l6ZSAtIGNvdW50O1xuXG4gICAgICBpZiAobm90U2VsZWN0ZWRTaXplICE9PSB0b3RhbFNpemUpIHtcbiAgICAgICAgc2VsZWN0QWxsTm9kZXMuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiYmkgYmktZ3JpZFwiPjwvaT4nO1xuICAgICAgICBzZWxlY3RBbGxOb2Rlcy5zdHlsZS5vcGFjaXR5ID0gJzAuNjUnO1xuICAgICAgICBfZDMuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyJykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmdW5jdGlvbiAocCkge1xuICAgICAgICAgIHAucHJldmlvdXNseVNlbGVjdGVkID0gcC5zZWxlY3RlZDtcbiAgICAgICAgICByZXR1cm4gKHAuc2VsZWN0ZWQgPSB0cnVlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGQzLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAoZCkgPT4gKGQuc2VsZWN0ZWQgPyAnYmx1ZScgOiAnIzk5OScpKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCAoZCkgPT4gKGQuc2VsZWN0ZWQgPyA3MDAgOiA0MDApKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGVjdEFsbE5vZGVzLmlubmVySFRNTCA9ICc8aSBjbGFzcz1cImJpIGJpLWdyaWQtZmlsbFwiPjwvaT4nO1xuICAgICAgICBzZWxlY3RBbGxOb2Rlcy5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgICAgICBfZDMuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyJykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICAgIF9kMy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgcmV0dXJuIChwLnNlbGVjdGVkID0gcC5wcmV2aW91c2x5U2VsZWN0ZWQgPSBmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBfZDNcbiAgICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcbiAgICAgIH1cbiAgICAgIC8vIHJlc2V0IGxpbmsgc3R5bGVcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMClcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcbiAgICB9O1xuICAgIGQzLnNlbGVjdCgnI3NlbGVjdF9hbGwnKS5vbignY2xpY2snLCBoYW5kbGVTZWxlY3RBbGxOb2Rlcyk7XG5cbiAgICBjb25zdCBoYW5kbGVUb2dnbGVTZWxlY3Rpb24gPSAoKSA9PiB7XG4gICAgICBjb25zdCB0b3RhbFNpemUgPSBub2RlRW50ZXIuc2l6ZSgpO1xuICAgICAgY29uc3Qgc2VsZWN0ZWROb2RlcyA9IGQzLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlci5zZWxlY3RlZCcpO1xuICAgICAgY29uc3Qgbm9uU2VsZWN0ZWROb2RlcyA9IGQzLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcjpub3QoLnNlbGVjdGVkKScpO1xuICAgICAgY29uc3Qgc2VsZWN0ZWRDb3VudCA9IHNlbGVjdGVkTm9kZXMuc2l6ZSgpO1xuICAgICAgY29uc3Qgbm9uU2VsZWN0ZWRDb3VudCA9IG5vblNlbGVjdGVkTm9kZXMuc2l6ZSgpO1xuXG4gICAgICBpZiAoc2VsZWN0ZWRDb3VudCA+IDApIHtcbiAgICAgICAgLy8gRGVzZWxlY3Qgc2VsZWN0ZWQgbm9kZXMgYW5kIHNlbGVjdCBub24tc2VsZWN0ZWQgbm9kZXNcbiAgICAgICAgc2VsZWN0ZWROb2Rlcy5jbGFzc2VkKCdzZWxlY3RlZCcsIGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgcC5wcmV2aW91c2x5U2VsZWN0ZWQgPSBwLnNlbGVjdGVkO1xuICAgICAgICAgIHJldHVybiAocC5zZWxlY3RlZCA9IGZhbHNlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbm9uU2VsZWN0ZWROb2Rlcy5jbGFzc2VkKCdzZWxlY3RlZCcsIGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgcC5wcmV2aW91c2x5U2VsZWN0ZWQgPSBwLnNlbGVjdGVkO1xuICAgICAgICAgIHJldHVybiAocC5zZWxlY3RlZCA9IHRydWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJZiB0aGVyZSBhcmUgb25seSB0d28gbm9kZXMgc2VsZWN0ZWQgd2UgbmVlZCB0byB1cGRhdGUgdGhlIHN1YmplY3Qgc2VsZWN0ZWROb2Rlc0FycmF5IHNvIHdlIGNhbiBjcmVhdGUgYSBuZXcgbGluayB3aXRoIHRoZSBjb3JyZWN0IG5vZGVzIGF0dGFjaGVkLlxuICAgICAgICBjb25zdCBzZWxlY3RlZFNpemUgPSBzdmcuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKS5zaXplKCk7XG4gICAgICAgIGlmIChzZWxlY3RlZFNpemUgPD0gMikge1xuICAgICAgICAgIC8vIGdldCBkYXRhIGZyb20gbm9kZVxuICAgICAgICAgIGNvbnN0IGxvY2Fsc2VsZWN0ZWROb2Rlc0FycmF5ID0gX2QzLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuZGF0YSgpO1xuICAgICAgICAgIGNvbnN0IGZpbHRlcklkID0gbG9jYWxzZWxlY3RlZE5vZGVzQXJyYXkuZmlsdGVyKCh4KSA9PiB4KTtcbiAgICAgICAgICBzZWxmLnNlbGVjdGVkTm9kZXNBcnJheS5uZXh0KGZpbHRlcklkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdHlsZXMgb2Ygbm9kZSBlbGVtZW50c1xuICAgICAgICBfZDNcbiAgICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsIChkKSA9PiAoZC5zZWxlY3RlZCA/ICdibHVlJyA6ICcjMjEyNTI5JykpXG4gICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIChkKSA9PiAoZC5zZWxlY3RlZCA/IDcwMCA6IDQwMCkpO1xuICAgICAgfSBlbHNlIGlmIChub25TZWxlY3RlZENvdW50ID4gMCkge1xuICAgICAgICAvLyBTZWxlY3QgYWxsIG5vZGVzIGlmIG5vbmUgYXJlIHNlbGVjdGVkXG4gICAgICAgIF9kMy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgcC5wcmV2aW91c2x5U2VsZWN0ZWQgPSBwLnNlbGVjdGVkO1xuICAgICAgICAgIHJldHVybiAocC5zZWxlY3RlZCA9IHRydWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGRhdGUgc3R5bGVzIG9mIG5vZGUgZWxlbWVudHNcbiAgICAgICAgX2QzXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNzAwKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICdibHVlJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgc3RhdGUgb2YgYW5vdGhlciBidXR0b24gYmFzZWQgb24gdGhlIGN1cnJlbnQgc2VsZWN0aW9uXG4gICAgICBjb25zdCB1cGRhdGVkU2VsZWN0ZWRDb3VudCA9XG4gICAgICAgIHNlbGVjdGVkQ291bnQgPiAwID8gdG90YWxTaXplIC0gc2VsZWN0ZWRDb3VudCA6IHRvdGFsU2l6ZTtcbiAgICAgIGlmICh1cGRhdGVkU2VsZWN0ZWRDb3VudCA9PT0gdG90YWxTaXplKSB7XG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgc3RhdGUgb2YgYW5vdGhlciBidXR0b24gaWYgYWxsIG5vZGVzIGFyZSBzZWxlY3RlZFxuICAgICAgICBzZWxlY3RBbGxOb2Rlcy5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJiaSBiaS1ncmlkXCI+PC9pPic7XG4gICAgICAgIHNlbGVjdEFsbE5vZGVzLnN0eWxlLm9wYWNpdHkgPSAnMC42NSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBVcGRhdGUgdGhlIHN0YXRlIG9mIGFub3RoZXIgYnV0dG9uIGlmIG5vdCBhbGwgbm9kZXMgYXJlIHNlbGVjdGVkXG4gICAgICAgIHNlbGVjdEFsbE5vZGVzLmlubmVySFRNTCA9ICc8aSBjbGFzcz1cImJpIGJpLWdyaWQtZmlsbFwiPjwvaT4nO1xuICAgICAgICBzZWxlY3RBbGxOb2Rlcy5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgICAgfVxuICAgICAgLy8gcmVzZXQgbGluayBzdHlsZVxuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKVxuICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgIH07XG5cbiAgICBkMy5zZWxlY3QoJyN0b2dnbGVfc2VsZWN0aW9uJykub24oJ2NsaWNrJywgaGFuZGxlVG9nZ2xlU2VsZWN0aW9uKTtcblxuICAgIC8vIHNlYXJjaFxuICAgIGNvbnN0IHNlYXJjaEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZWFyY2hCdXR0b24nKTtcbiAgICAvLyBDaGVjayB0byBzZWUgaWYgZXhpc3RzIC0gY29udHJvbCBib29sXG4gICAgaWYgKHNlYXJjaEJ0bikge1xuICAgICAgY29uc3Qgc2VhcmNoSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgJ3NlYXJjaElucHV0J1xuICAgICAgKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xuICAgICAgY29uc3QgY2xlYXJCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgJ2NsZWFyQnV0dG9uJ1xuICAgICAgKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcbiAgICAgIGNvbnN0IGhhbmRsZVNlYXJjaCA9IChldmVudDogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgICAgICBpZiAoZXZlbnQua2V5ID09PSAnRW50ZXInKSB7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBwZXJmb3JtU2VhcmNoKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGxldCBtYXRjaGluZ05vZGVzID0gW107XG4gICAgICBsZXQgY3VycmVudE1hdGNoSW5kZXggPSAtMTtcblxuICAgICAgY29uc3Qgc2hvd0N1cnJlbnRNYXRjaCA9ICgpID0+IHtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91c2x5IGFkZGVkIGJhY2tncm91bmQgY2lyY2xlXG4gICAgICAgIGQzLnNlbGVjdEFsbCgnY2lyY2xlLmhpZ2hsaWdodC1iYWNrZ3JvdW5kJykucmVtb3ZlKCk7XG5cbiAgICAgICAgY29uc3QgbWF0Y2hpbmdOb2RlID0gbWF0Y2hpbmdOb2Rlc1tjdXJyZW50TWF0Y2hJbmRleF07XG4gICAgICAgIC8vIEhpZ2hsaWdodCB0aGUgbWF0Y2hpbmcgbm9kZVxuICAgICAgICBjb25zdCBub2RlV3JhcHBlciA9IGQzLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLmZpbHRlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzKS5hdHRyKCdpZCcpID09PSBtYXRjaGluZ05vZGUuaWQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBhIG5ldyBiYWNrZ3JvdW5kIGNpcmNsZSB0byB0aGUgZW50aXJlIDxnPiBub2RlXG4gICAgICAgIGNvbnN0IGJib3ggPSBub2RlV3JhcHBlci5ub2RlKCkuZ2V0QkJveCgpO1xuICAgICAgICBjb25zdCBjZW50ZXJYID0gYmJveC54ICsgYmJveC53aWR0aCAvIDI7XG4gICAgICAgIGNvbnN0IGNlbnRlclkgPSBiYm94LnkgKyBiYm94LmhlaWdodCAvIDI7XG4gICAgICAgIGNvbnN0IHJhZGl1cyA9IE1hdGgubWF4KGJib3gud2lkdGggKyAzMCwgYmJveC5oZWlnaHQpIC8gMjtcblxuICAgICAgICBjb25zdCBiYWNrZ3JvdW5kQ2lyY2xlID0gbm9kZVdyYXBwZXJcbiAgICAgICAgICAuaW5zZXJ0KCdjaXJjbGUnLCAnOmZpcnN0LWNoaWxkJylcbiAgICAgICAgICAuYXR0cignY2xhc3MnLCAnaGlnaGxpZ2h0LWJhY2tncm91bmQnKVxuICAgICAgICAgIC5hdHRyKCdmaWxsJywgJ3llbGxvdycpXG4gICAgICAgICAgLmF0dHIoJ29wYWNpdHknLCAnMC4zJylcbiAgICAgICAgICAuYXR0cignY3gnLCBjZW50ZXJYKVxuICAgICAgICAgIC5hdHRyKCdjeScsIGNlbnRlclkpO1xuXG4gICAgICAgIC8vIEFuaW1hdGUgdGhlIGJhY2tncm91bmQgY2lyY2xlXG4gICAgICAgIGJhY2tncm91bmRDaXJjbGVcbiAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAgICAgLmF0dHIoJ3InLCByYWRpdXMpXG4gICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgICAgIC5hdHRyKCdyJywgcmFkaXVzIC8gNClcbiAgICAgICAgICAuYXR0cignb3BhY2l0eScsICcwLjUnKVxuICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgICAgICAuYXR0cigncicsIHJhZGl1cylcbiAgICAgICAgICAuYXR0cignb3BhY2l0eScsICcwLjMnKTtcblxuICAgICAgICAvLyBab29tIHRvIHRoZSBtYXRjaGluZyBub2RlXG4gICAgICAgIGNvbnN0IHpvb21UcmFuc2Zvcm0gPSBkMy56b29tVHJhbnNmb3JtKHN2Zy5ub2RlKCkpO1xuICAgICAgICBjb25zdCB7IHgsIHksIGsgfSA9IHpvb21UcmFuc2Zvcm07XG4gICAgICAgIGNvbnN0IHsgZngsIGZ5IH0gPSBtYXRjaGluZ05vZGU7XG4gICAgICAgIGNvbnN0IG5ld1pvb21UcmFuc2Zvcm0gPSBkMy56b29tSWRlbnRpdHlcbiAgICAgICAgICAudHJhbnNsYXRlKC1meCAqIGsgKyBwYXJlbnRXaWR0aCAvIDIsIC1meSAqIGsgKyBwYXJlbnRIZWlnaHQgLyAyKVxuICAgICAgICAgIC5zY2FsZShrKTtcbiAgICAgICAgem9vbUNvbnRhaW5lclxuICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZHVyYXRpb24oNzUwKVxuICAgICAgICAgIC5jYWxsKHpvb20udHJhbnNmb3JtLCBuZXdab29tVHJhbnNmb3JtKTtcblxuICAgICAgICAvLyBEaXNhYmxlL0VuYWJsZSBuYXZpZ2F0aW9uIGJ1dHRvbnNcbiAgICAgICAgY29uc3QgcHJldkJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICdwcmV2QnV0dG9uJ1xuICAgICAgICApIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgICBjb25zdCBuZXh0QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICAgJ25leHRCdXR0b24nXG4gICAgICAgICkgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XG4gICAgICAgIHByZXZCdXR0b24uZGlzYWJsZWQgPSBjdXJyZW50TWF0Y2hJbmRleCA9PT0gMDtcbiAgICAgICAgbmV4dEJ1dHRvbi5kaXNhYmxlZCA9IGN1cnJlbnRNYXRjaEluZGV4ID09PSBtYXRjaGluZ05vZGVzLmxlbmd0aCAtIDE7XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBwZXJmb3JtU2VhcmNoID0gKCkgPT4ge1xuICAgICAgICAvLyBSZW1vdmUgYW55IHByZXZpb3VzbHkgYWRkZWQgYmFja2dyb3VuZCBjaXJjbGVcbiAgICAgICAgZDMuc2VsZWN0QWxsKCdjaXJjbGUuaGlnaGxpZ2h0LWJhY2tncm91bmQnKS5yZW1vdmUoKTtcblxuICAgICAgICBjb25zdCBzZWFyY2hUZXJtID0gc2VhcmNoSW5wdXQudmFsdWUudG9Mb3dlckNhc2UoKS50cmltKCk7XG5cbiAgICAgICAgaWYgKHNlYXJjaFRlcm0ubGVuZ3RoID49IDMpIHtcbiAgICAgICAgICAvLyBQZXJmb3JtIHRoZSBzZWFyY2hcbiAgICAgICAgICBtYXRjaGluZ05vZGVzID0gdGhpcy5ub2Rlcy5maWx0ZXIoKG5vZGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gbm9kZS5sYWJlbC5tYXAoKGl0ZW0pID0+IGl0ZW0udG9Mb3dlckNhc2UoKSk7XG5cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIGxhYmVsLnNvbWUoKGxhYmVsSXRlbSkgPT4gbGFiZWxJdGVtLmluY2x1ZGVzKHNlYXJjaFRlcm0pKSB8fFxuICAgICAgICAgICAgICBub2RlLmxhYmVsLnNvbWUoKG9iaikgPT5cbiAgICAgICAgICAgICAgICBPYmplY3QudmFsdWVzKG9iaikuc29tZSgodmFsdWUpID0+XG4gICAgICAgICAgICAgICAgICBTdHJpbmcodmFsdWUpLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoVGVybSlcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAobWF0Y2hpbmdOb2Rlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjdXJyZW50TWF0Y2hJbmRleCA9IDA7XG4gICAgICAgICAgICBzaG93Q3VycmVudE1hdGNoKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGN1cnJlbnRNYXRjaEluZGV4ID0gLTE7XG4gICAgICAgICAgICBzaG93Tm9NYXRjaGVzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIENsZWFyIHNlYXJjaFxuICAgICAgICAgIG1hdGNoaW5nTm9kZXMgPSBbXTtcbiAgICAgICAgICBjdXJyZW50TWF0Y2hJbmRleCA9IC0xO1xuICAgICAgICAgIHNob3dOb01hdGNoZXMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZUNsZWFyQnV0dG9uKCk7XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBzaG93Tm9NYXRjaGVzID0gKCkgPT4ge1xuICAgICAgICAvLyBSZXNldCB6b29tIGxldmVsXG4gICAgICAgIGNvbnN0IG5ld1pvb21UcmFuc2Zvcm0gPSBkMy56b29tSWRlbnRpdHkudHJhbnNsYXRlKDAsIDApLnNjYWxlKDEpO1xuICAgICAgICB6b29tQ29udGFpbmVyXG4gICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5kdXJhdGlvbig3NTApXG4gICAgICAgICAgLmNhbGwoem9vbS50cmFuc2Zvcm0sIG5ld1pvb21UcmFuc2Zvcm0pO1xuICAgICAgICB1cGRhdGVab29tTGV2ZWwoKTtcbiAgICAgICAgLy8gRGlzYWJsZSBuYXZpZ2F0aW9uIGJ1dHRvbnNcbiAgICAgICAgY29uc3QgcHJldkJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICdwcmV2QnV0dG9uJ1xuICAgICAgICApIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgICBjb25zdCBuZXh0QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICAgJ25leHRCdXR0b24nXG4gICAgICAgICkgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XG4gICAgICAgIHByZXZCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICBuZXh0QnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcblxuICAgICAgICAvLyBTaG93IFwibm8gbWF0Y2hlcyBmb3VuZFwiIHRleHQgd2l0aCBmYWRlLWluIHRyYW5zaXRpb25cbiAgICAgICAgY29uc3Qgbm9NYXRjaGVzVGV4dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdub01hdGNoZXNUZXh0Jyk7XG4gICAgICAgIGlmIChzZWFyY2hJbnB1dC52YWx1ZSAhPT0gJycpIHtcbiAgICAgICAgICBub01hdGNoZXNUZXh0LmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcbiAgICAgICAgICAvLyBGYWRlIGF3YXkgYWZ0ZXIgYSBmZXcgc2Vjb25kc1xuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgLy8gSGlkZSBcIm5vIG1hdGNoZXMgZm91bmRcIiB0ZXh0IHdpdGggZmFkZS1vdXQgdHJhbnNpdGlvblxuICAgICAgICAgICAgbm9NYXRjaGVzVGV4dC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG4gICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IG5hdmlnYXRlTmV4dCA9ICgpID0+IHtcbiAgICAgICAgaWYgKGN1cnJlbnRNYXRjaEluZGV4IDwgbWF0Y2hpbmdOb2Rlcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgY3VycmVudE1hdGNoSW5kZXgrKztcbiAgICAgICAgICBzaG93Q3VycmVudE1hdGNoKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IG5hdmlnYXRlUHJldmlvdXMgPSAoKSA9PiB7XG4gICAgICAgIGlmIChjdXJyZW50TWF0Y2hJbmRleCA+IDApIHtcbiAgICAgICAgICBjdXJyZW50TWF0Y2hJbmRleC0tO1xuICAgICAgICAgIHNob3dDdXJyZW50TWF0Y2goKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgY29uc3QgY2xlYXJTZWFyY2hJbnB1dCA9ICgpID0+IHtcbiAgICAgICAgc2VhcmNoSW5wdXQudmFsdWUgPSAnJztcbiAgICAgICAgc2VhcmNoSW5wdXQuZm9jdXMoKTtcbiAgICAgICAgdXBkYXRlQ2xlYXJCdXR0b24oKTtcbiAgICAgICAgbWF0Y2hpbmdOb2RlcyA9IFtdO1xuICAgICAgICBjdXJyZW50TWF0Y2hJbmRleCA9IC0xO1xuICAgICAgICAvLyBSZW1vdmUgYW55IHByZXZpb3VzbHkgYWRkZWQgYmFja2dyb3VuZCBjaXJjbGVcbiAgICAgICAgZDMuc2VsZWN0QWxsKCdjaXJjbGUuaGlnaGxpZ2h0LWJhY2tncm91bmQnKS5yZW1vdmUoKTtcblxuICAgICAgICAvLyBEaXNhYmxlIHRoZSBuZXh0QnV0dG9uICYgcHJldkJ1dHRvblxuICAgICAgICBjb25zdCBuZXh0QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICAgJ25leHRCdXR0b24nXG4gICAgICAgICkgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XG4gICAgICAgIG5leHRCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICBjb25zdCBwcmV2QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICAgJ3ByZXZCdXR0b24nXG4gICAgICAgICkgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XG4gICAgICAgIHByZXZCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgdXBkYXRlQ2xlYXJCdXR0b24gPSAoKSA9PiB7XG4gICAgICAgIGNsZWFyQnV0dG9uLmRpc2FibGVkID0gc2VhcmNoSW5wdXQudmFsdWUudHJpbSgpLmxlbmd0aCA9PT0gMDtcbiAgICAgIH07XG5cbiAgICAgIC8vIFdlIHJlc2V0IHRoZSBzZWFyY2ggd2hlbiB3ZSByZXNldCB0aGUgZGF0YVxuICAgICAgaWYgKHRoaXMucmVzZXRTZWFyY2gpIHtcbiAgICAgICAgY2xlYXJTZWFyY2hJbnB1dCgpO1xuICAgICAgICB0aGlzLnJlc2V0U2VhcmNoID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHNlYXJjaElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgdXBkYXRlQ2xlYXJCdXR0b24pO1xuICAgICAgc2VhcmNoQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGVyZm9ybVNlYXJjaCk7XG4gICAgICBjbGVhckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNsZWFyU2VhcmNoSW5wdXQpO1xuICAgICAgZG9jdW1lbnRcbiAgICAgICAgLmdldEVsZW1lbnRCeUlkKCdzZWFyY2hJbnB1dCcpXG4gICAgICAgIC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxlU2VhcmNoKTtcbiAgICAgIGRvY3VtZW50XG4gICAgICAgIC5nZXRFbGVtZW50QnlJZCgnbmV4dEJ1dHRvbicpXG4gICAgICAgIC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG5hdmlnYXRlTmV4dCk7XG4gICAgICBkb2N1bWVudFxuICAgICAgICAuZ2V0RWxlbWVudEJ5SWQoJ3ByZXZCdXR0b24nKVxuICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBuYXZpZ2F0ZVByZXZpb3VzKTtcbiAgICB9XG4gICAgLy8gRm9yIGFycm93c1xuICAgIHRoaXMuaW5pdERlZmluaXRpb25zKHN2Zyk7XG5cbiAgICBjb25zdCBzaW11bGF0aW9uID0gdGhpcy5mb3JjZVNpbXVsYXRpb24oX2QzLCB7XG4gICAgICB3aWR0aDogK3N2Zy5hdHRyKCd3aWR0aCcpLFxuICAgICAgaGVpZ2h0OiArc3ZnLmF0dHIoJ2hlaWdodCcpLFxuICAgIH0pO1xuXG4gICAgLy8gQnJ1c2ggU3RhcnRcbiAgICBsZXQgZ0JydXNoSG9sZGVyID0gc3ZnLmFwcGVuZCgnZycpO1xuXG4gICAgbGV0IGJydXNoID0gZDNcbiAgICAgIC5icnVzaCgpXG4gICAgICAub24oJ3N0YXJ0JywgKCkgPT4ge1xuICAgICAgICB0aGlzLmJydXNoaW5nID0gdHJ1ZTtcblxuICAgICAgICBub2RlRW50ZXIuZWFjaCgoZCkgPT4ge1xuICAgICAgICAgIGQucHJldmlvdXNseVNlbGVjdGVkID0gdGhpcy5zaGlmdEtleSAmJiBkLnNlbGVjdGVkO1xuICAgICAgICB9KTtcblxuICAgICAgICBfZDNcbiAgICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICB9KVxuICAgICAgLm9uKCdicnVzaCcsICgpID0+IHtcbiAgICAgICAgdGhpcy5leHRlbnQgPSBkMy5ldmVudC5zZWxlY3Rpb247XG4gICAgICAgIGlmICghZDMuZXZlbnQuc291cmNlRXZlbnQgfHwgIXRoaXMuZXh0ZW50IHx8ICF0aGlzLmJydXNoTW9kZSkgcmV0dXJuO1xuICAgICAgICBpZiAoIWN1cnJlbnRab29tKSByZXR1cm47XG5cbiAgICAgICAgbm9kZUVudGVyXG4gICAgICAgICAgLmNsYXNzZWQoJ3NlbGVjdGVkJywgKGQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiAoZC5zZWxlY3RlZCA9XG4gICAgICAgICAgICAgIGQucHJldmlvdXNseVNlbGVjdGVkIF5cbiAgICAgICAgICAgICAgKDxhbnk+KFxuICAgICAgICAgICAgICAgIChkMy5ldmVudC5zZWxlY3Rpb25bMF1bMF0gPD1cbiAgICAgICAgICAgICAgICAgIGQueCAqIGN1cnJlbnRab29tLmsgKyBjdXJyZW50Wm9vbS54ICYmXG4gICAgICAgICAgICAgICAgICBkLnggKiBjdXJyZW50Wm9vbS5rICsgY3VycmVudFpvb20ueCA8XG4gICAgICAgICAgICAgICAgICBkMy5ldmVudC5zZWxlY3Rpb25bMV1bMF0gJiZcbiAgICAgICAgICAgICAgICAgIGQzLmV2ZW50LnNlbGVjdGlvblswXVsxXSA8PVxuICAgICAgICAgICAgICAgICAgZC55ICogY3VycmVudFpvb20uayArIGN1cnJlbnRab29tLnkgJiZcbiAgICAgICAgICAgICAgICAgIGQueSAqIGN1cnJlbnRab29tLmsgKyBjdXJyZW50Wm9vbS55IDxcbiAgICAgICAgICAgICAgICAgIGQzLmV2ZW50LnNlbGVjdGlvblsxXVsxXSlcbiAgICAgICAgICAgICAgKSkpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnNlbGVjdCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuY2xhc3NlZCgnc2VsZWN0ZWQnLCAoZCkgPT4gZC5zZWxlY3RlZClcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAoZCkgPT4gKGQuc2VsZWN0ZWQgPyAnYmx1ZScgOiAnIzk5OScpKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCAoZCkgPT4gKGQuc2VsZWN0ZWQgPyA3MDAgOiA0MDApKTtcblxuICAgICAgICB0aGlzLmV4dGVudCA9IGQzLmV2ZW50LnNlbGVjdGlvbjtcbiAgICAgIH0pXG4gICAgICAub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgaWYgKCFkMy5ldmVudC5zb3VyY2VFdmVudCB8fCAhdGhpcy5leHRlbnQgfHwgIXRoaXMuZ0JydXNoKSByZXR1cm47XG5cbiAgICAgICAgdGhpcy5nQnJ1c2guY2FsbChicnVzaC5tb3ZlLCBudWxsKTtcbiAgICAgICAgaWYgKCF0aGlzLmJydXNoTW9kZSkge1xuICAgICAgICAgIC8vIHRoZSBzaGlmdCBrZXkgaGFzIGJlZW4gcmVsZWFzZSBiZWZvcmUgd2UgZW5kZWQgb3VyIGJydXNoaW5nXG4gICAgICAgICAgdGhpcy5nQnJ1c2gucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5nQnJ1c2ggPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYnJ1c2hpbmcgPSBmYWxzZTtcblxuICAgICAgICBub2RlRW50ZXJcbiAgICAgICAgICAuc2VsZWN0KCcubm9kZVRleHQnKVxuICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICFkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5jbGFzc2VkKCdzZWxlY3RlZCcpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuXG4gICAgICAgIGNvbnN0IHRvdGFsU2l6ZSA9IG5vZGVFbnRlci5zaXplKCk7XG4gICAgICAgIGNvbnN0IG5vblNlbGVjdGVkTm9kZXMgPSBkMy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXI6bm90KC5zZWxlY3RlZCknKTtcbiAgICAgICAgY29uc3QgY291bnQgPSBub25TZWxlY3RlZE5vZGVzLnNpemUoKTtcbiAgICAgICAgY29uc3Qgbm90U2VsZWN0ZWRTaXplID0gdG90YWxTaXplIC0gY291bnQ7XG5cbiAgICAgICAgaWYgKG5vdFNlbGVjdGVkU2l6ZSA9PT0gdG90YWxTaXplKSB7XG4gICAgICAgICAgc2VsZWN0QWxsTm9kZXMuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiYmkgYmktZ3JpZFwiPjwvaT4nO1xuICAgICAgICAgIHNlbGVjdEFsbE5vZGVzLnN0eWxlLm9wYWNpdHkgPSAnMC42NSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VsZWN0QWxsTm9kZXMuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiYmkgYmktZ3JpZC1maWxsXCI+PC9pPic7XG4gICAgICAgICAgc2VsZWN0QWxsTm9kZXMuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvdW50cyBudW1iZXIgb2Ygc2VsZWN0ZWQgY2xhc3NlcyB0byBub3QgZXhjZWVkIDJcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRTaXplID0gbm9kZUVudGVyLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuc2l6ZSgpO1xuICAgICAgICBpZiAoc2VsZWN0ZWRTaXplIDw9IDIpIHtcbiAgICAgICAgICAvLyBnZXQgZGF0YSBmcm9tIG5vZGVcbiAgICAgICAgICBjb25zdCBsb2NhbHNlbGVjdGVkTm9kZXNBcnJheSA9IG5vZGVFbnRlclxuICAgICAgICAgICAgLnNlbGVjdEFsbCgnLnNlbGVjdGVkJylcbiAgICAgICAgICAgIC5kYXRhKCk7XG4gICAgICAgICAgY29uc3QgZmlsdGVySWQgPSBsb2NhbHNlbGVjdGVkTm9kZXNBcnJheS5maWx0ZXIoKHgpID0+IHgpO1xuICAgICAgICAgIHNlbGYuc2VsZWN0ZWROb2Rlc0FycmF5Lm5leHQoZmlsdGVySWQpO1xuICAgICAgICAgIHJldHVybiBmaWx0ZXJJZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLnNlbGVjdGVkTm9kZXNBcnJheS5uZXh0KFtdKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICBsZXQga2V5dXAgPSAoKSA9PiB7XG4gICAgICB0aGlzLnNoaWZ0S2V5ID0gZmFsc2U7XG4gICAgICB0aGlzLmJydXNoTW9kZSA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMuZ0JydXNoICYmICF0aGlzLmJydXNoaW5nKSB7XG4gICAgICAgIC8vIG9ubHkgcmVtb3ZlIHRoZSBicnVzaCBpZiB3ZSdyZSBub3QgYWN0aXZlbHkgYnJ1c2hpbmdcbiAgICAgICAgLy8gb3RoZXJ3aXNlIGl0J2xsIGJlIHJlbW92ZWQgd2hlbiB0aGUgYnJ1c2hpbmcgZW5kc1xuICAgICAgICB0aGlzLmdCcnVzaC5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5nQnJ1c2ggPSBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBsZXQga2V5ZG93biA9ICgpID0+IHtcbiAgICAgIC8vIEFsbG93cyB1cyB0byB0dXJuIG9mZiBkZWZhdWx0IGxpc3RlbmVycyBmb3Iga2V5TW9kaWZpZXJzKHNoaWZ0KVxuICAgICAgYnJ1c2guZmlsdGVyKCgpID0+IGQzLmV2ZW50LnNoaWZ0S2V5KTtcbiAgICAgIGJydXNoLmtleU1vZGlmaWVycyhmYWxzZSk7XG4gICAgICAvLyBob2xkaW5nIHNoaWZ0IGtleVxuICAgICAgaWYgKGQzLmV2ZW50LmtleUNvZGUgPT09IDE2KSB7XG4gICAgICAgIHRoaXMuc2hpZnRLZXkgPSB0cnVlO1xuXG4gICAgICAgIGlmICghdGhpcy5nQnJ1c2gpIHtcbiAgICAgICAgICB0aGlzLmJydXNoTW9kZSA9IHRydWU7XG4gICAgICAgICAgdGhpcy5nQnJ1c2ggPSBnQnJ1c2hIb2xkZXIuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnYnJ1c2gnKTtcbiAgICAgICAgICB0aGlzLmdCcnVzaC5jYWxsKGJydXNoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBkMy5zZWxlY3QoJ2JvZHknKS5vbigna2V5ZG93bicsIGtleWRvd24pLm9uKCdrZXl1cCcsIGtleXVwKTtcbiAgICAvLyBCcnVzaCBFbmRcblxuICAgIGNvbnN0IGZpbHRlcmVkTGluZSA9IHRoaXMubGlua3MuZmlsdGVyKFxuICAgICAgKHsgc291cmNlLCB0YXJnZXQgfSwgaW5kZXgsIGxpbmtzQXJyYXkpID0+IHtcbiAgICAgICAgLy8gRmlsdGVyIG91dCBhbnkgb2JqZWN0cyB0aGF0IGhhdmUgbWF0Y2hpbmcgc291cmNlIGFuZCB0YXJnZXQgcHJvcGVydHkgdmFsdWVzXG4gICAgICAgIC8vIFRvIGRpc3BsYXkgb25seSBvbmUgbGluZSAocGFyZW50TGluZVN0eWxlKSAtIHJlbW92ZXMgaHRtbCBibG9hdCBhbmQgYSBkYXJrZW5lZCBsaW5lXG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgaW5kZXggPT09XG4gICAgICAgICAgbGlua3NBcnJheS5maW5kSW5kZXgoXG4gICAgICAgICAgICAob2JqKSA9PiBvYmouc291cmNlID09PSBzb3VyY2UgJiYgb2JqLnRhcmdldCA9PT0gdGFyZ2V0XG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCBsaW5rID0gem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoKS5kYXRhKGZpbHRlcmVkTGluZSwgZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLmlkO1xuICAgIH0pO1xuXG4gICAgem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoJ2xpbmUnKS5kYXRhKGxpbmspLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgIGNvbnN0IGxpbmtFbnRlciA9IGxpbmtcbiAgICAgIC5qb2luKCdsaW5lJylcbiAgICAgIC5zdHlsZSgnc3Ryb2tlJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKGQucGFyZW50TGluZVN0eWxlID09PSAnU29saWQnKSB7XG4gICAgICAgICAgcmV0dXJuICcjNzc3JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gJyNiNGI0YjQnO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0eWxlKCdzdHJva2Utb3BhY2l0eScsICcuNicpXG4gICAgICAuc3R5bGUoJ3N0cm9rZS1kYXNoYXJyYXknLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoZC5wYXJlbnRMaW5lU3R5bGUgPT09ICdEb3R0ZWQnKSB7XG4gICAgICAgICAgcmV0dXJuICc4LDUnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSlcbiAgICAgIC5zdHlsZSgnc3Ryb2tlLXdpZHRoJywgJzJweCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnbGluaycpXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAnX2xpbmUnO1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBkLnNvdXJjZSA/IGQuc291cmNlIDogJyc7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGQudGFyZ2V0ID8gZC50YXJnZXQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke3NvdXJjZX1fJHt0YXJnZXR9JHtzdWZmaXh9YDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignbWFya2VyLWVuZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmIChkLnBhcmVudFRhcmdldEFycm93ID09PSB0cnVlKSB7XG4gICAgICAgICAgcmV0dXJuICd1cmwoI2Fycm93aGVhZFRhcmdldCknO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCdtYXJrZXItc3RhcnQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoZC5wYXJlbnRTb3VyY2VBcnJvdyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIHJldHVybiAndXJsKCNhcnJvd2hlYWRTb3VyY2UpJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pO1xuXG4gICAgbGluay5hcHBlbmQoJ3RpdGxlJykudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgcmV0dXJuIGQubGFiZWw7XG4gICAgfSk7XG5cbiAgICBjb25zdCBlZGdlcGF0aHMgPSB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgpLmRhdGEodGhpcy5saW5rcywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLmlkO1xuICAgIH0pO1xuXG4gICAgem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoJ3BhdGgnKS5kYXRhKGVkZ2VwYXRocykuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgY29uc3QgZWRnZXBhdGhzRW50ZXIgPSBlZGdlcGF0aHNcbiAgICAgIC5qb2luKCdzdmc6cGF0aCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnZWRnZXBhdGgnKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDApXG4gICAgICAuYXR0cignc3Ryb2tlLW9wYWNpdHknLCAwKVxuICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgcmV0dXJuICdlZGdlcGF0aCcgKyBpO1xuICAgICAgfSk7XG5cbiAgICBjb25zdCBlZGdlbGFiZWxzID0gem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoKS5kYXRhKHRoaXMubGlua3MsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gZC5pZDtcbiAgICB9KTtcblxuICAgIHpvb21Db250YWluZXIuc2VsZWN0QWxsKCd0ZXh0JykuZGF0YShlZGdlbGFiZWxzKS5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICBjb25zdCBlZGdlbGFiZWxzRW50ZXIgPSBlZGdlbGFiZWxzXG4gICAgICAuZW50ZXIoKVxuICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnZWRnZWxhYmVsJylcbiAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9ICdfdGV4dCc7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGQuc291cmNlID8gZC5zb3VyY2UgOiAnJztcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZC50YXJnZXQgPyBkLnRhcmdldCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7c291cmNlfV8ke3RhcmdldH0ke3N1ZmZpeH1gO1xuICAgICAgfSlcbiAgICAgIC5zdHlsZSgndGV4dC1hbmNob3InLCAnbWlkZGxlJylcbiAgICAgIC5hdHRyKCdmb250LXNpemUnLCAxNClcbiAgICAgIC5hdHRyKCdkeScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmR5O1xuICAgICAgfSk7XG5cbiAgICBzdmcuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJykub24oJ2RibGNsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3QgZGJsQ2xpY2sgPSBkMy5zZWxlY3QodGhpcykuZGF0YSgpO1xuICAgICAgc2VsZi5kYmxDbGlja0xpbmtQYXlsb2FkLm5leHQoZGJsQ2xpY2spO1xuICAgIH0pO1xuXG4gICAgZWRnZWxhYmVsc0VudGVyXG4gICAgICAuYXBwZW5kKCd0ZXh0UGF0aCcpXG4gICAgICAuYXR0cigneGxpbms6aHJlZicsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgIHJldHVybiAnI2VkZ2VwYXRoJyArIGk7XG4gICAgICB9KVxuICAgICAgLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpXG4gICAgICAuYXR0cignZG9taW5hbnQtYmFzZWxpbmUnLCAnYm90dG9tJylcbiAgICAgIC5hdHRyKCdzdGFydE9mZnNldCcsICc1MCUnKVxuICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQubGFiZWw7XG4gICAgICB9KTtcblxuICAgIGVkZ2VsYWJlbHNFbnRlclxuICAgICAgLnNlbGVjdEFsbCgndGV4dFBhdGgnKVxuICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5saW5rSWNvbjtcbiAgICAgIH0pXG4gICAgICAuYXBwZW5kKCd0c3BhbicpXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzg1NjQwNCcpXG4gICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgJzcwMCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnZmEnKVxuICAgICAgLnRleHQoJyBcXHVmMGMxJyk7XG4gICAgLy8gb24gbm9ybWFsIGxhYmVsIGxpbmsgY2xpY2sgLSBoaWdobGlnaHQgbGFiZWxzXG4gICAgc3ZnLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChkKSB7XG4gICAgICBfZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICBub2RlRW50ZXIuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICBkLnNlbGVjdGVkID0gZmFsc2U7XG4gICAgICAgIGQucHJldmlvdXNseVNlbGVjdGVkID0gZmFsc2U7XG4gICAgICB9KTtcbiAgICAgIG5vZGUuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICBzZWxlY3RBbGxOb2Rlcy5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJiaSBiaS1ncmlkLWZpbGxcIj48L2k+JztcbiAgICAgIHNlbGVjdEFsbE5vZGVzLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMClcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcbiAgICAgIF9kMy5zZWxlY3QodGhpcykuc3R5bGUoJ2ZpbGwnLCAnYmx1ZScpLnN0eWxlKCdmb250LXdlaWdodCcsIDcwMCk7XG4gICAgICBzZWxmLnNlbGVjdGVkTm9kZXNBcnJheS5uZXh0KFtdKTtcbiAgICB9KTtcblxuICAgIC8vIG9uIHJpZ2h0IGxhYmVsIGxpbmsgY2xpY2sgLSBoaWdodGxpZ2h0IGxhYmVscyBhbmQgcGFja2FnZSBkYXRhIGZvciBjb250ZXh0IG1lbnVcbiAgICBzdmcuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJykub24oJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIHNlbGYuc2VsZWN0ZWROb2Rlc0FycmF5Lm5leHQoW10pO1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICBfZDMuc2VsZWN0KHRoaXMpLnN0eWxlKCdmaWxsJywgJ2JsdWUnKS5zdHlsZSgnZm9udC13ZWlnaHQnLCA3MDApO1xuICAgICAgY29uc3QgbG9jYWxTZWxlY3RlZExpbmtBcnJheSA9IGQzLnNlbGVjdCh0aGlzKS5kYXRhKCk7XG4gICAgICBzZWxmLnNlbGVjdGVkTGlua0FycmF5Lm5leHQobG9jYWxTZWxlY3RlZExpbmtBcnJheSk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBub2RlID0gem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoKS5kYXRhKHRoaXMubm9kZXMsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gZC5pZDtcbiAgICB9KTtcblxuICAgIHpvb21Db250YWluZXIuc2VsZWN0QWxsKCdnJykuZGF0YShub2RlKS5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICBjb25zdCBub2RlRW50ZXIgPSBub2RlXG4gICAgICAuam9pbignZycpXG4gICAgICAuY2FsbChcbiAgICAgICAgX2QzXG4gICAgICAgICAgLmRyYWcoKVxuICAgICAgICAgIC5vbignc3RhcnQnLCBmdW5jdGlvbiBkcmFnc3RhcnRlZChkKSB7XG4gICAgICAgICAgICAvLyBFbmFibGUgdGhlIHNhdmUgJiByZXNldCBidG5cbiAgICAgICAgICAgIGlmIChyZXNldEJ0bikge1xuICAgICAgICAgICAgICBkb2N1bWVudFxuICAgICAgICAgICAgICAgIC5nZXRFbGVtZW50QnlJZCgncmVzZXRfZ3JhcGgnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlX2dyYXBoJykucmVtb3ZlQXR0cmlidXRlKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfZDMuZXZlbnQuYWN0aXZlKSBzaW11bGF0aW9uLmFscGhhVGFyZ2V0KDAuOSkucmVzdGFydCgpO1xuXG4gICAgICAgICAgICBpZiAoIWQuc2VsZWN0ZWQgJiYgIXRoaXMuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgICAgLy8gaWYgdGhpcyBub2RlIGlzbid0IHNlbGVjdGVkLCB0aGVuIHdlIGhhdmUgdG8gdW5zZWxlY3QgZXZlcnkgb3RoZXIgbm9kZVxuICAgICAgICAgICAgICBub2RlRW50ZXIuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmdW5jdGlvbiAocCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAocC5zZWxlY3RlZCA9IHAucHJldmlvdXNseVNlbGVjdGVkID0gZmFsc2UpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgLy8gcmVtb3ZlIHRoZSBzZWxlY3RlZCBzdHlsaW5nIG9uIG90aGVyIG5vZGVzIGFuZCBsYWJlbHMgd2hlbiB3ZSBkcmFnIGEgbm9uLXNlbGVjdGVkIG5vZGVcbiAgICAgICAgICAgICAgX2QzXG4gICAgICAgICAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgICAgICAgICBfZDNcbiAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApXG4gICAgICAgICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX2QzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgICAgIGQucHJldmlvdXNseVNlbGVjdGVkID0gZC5zZWxlY3RlZDtcbiAgICAgICAgICAgICAgcmV0dXJuIChkLnNlbGVjdGVkID0gdHJ1ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbm9kZUVudGVyXG4gICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5zZWxlY3RlZDtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBkLmZ4ID0gZC54O1xuICAgICAgICAgICAgICAgIGQuZnkgPSBkLnk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9uKCdkcmFnJywgZnVuY3Rpb24gZHJhZ2dlZChkKSB7XG4gICAgICAgICAgICBub2RlRW50ZXJcbiAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkLnNlbGVjdGVkO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGQuZnggKz0gX2QzLmV2ZW50LmR4O1xuICAgICAgICAgICAgICAgIGQuZnkgKz0gX2QzLmV2ZW50LmR5O1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vbignZW5kJywgZnVuY3Rpb24gZHJhZ2VuZGVkKGQpIHtcbiAgICAgICAgICAgIGlmICghX2QzLmV2ZW50LmFjdGl2ZSkge1xuICAgICAgICAgICAgICBzaW11bGF0aW9uLmFscGhhVGFyZ2V0KDAuMykucmVzdGFydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZC5meCA9IGQueDtcbiAgICAgICAgICAgIGQuZnkgPSBkLnk7XG4gICAgICAgICAgICAvLyBTdWJzY3JpYmVzIHRvIHVwZGF0ZWQgZ3JhcGggcG9zaXRpb25zIGZvciBzYXZlXG4gICAgICAgICAgICBzZWxmLnNhdmVHcmFwaERhdGEubmV4dChkYXRhKTtcbiAgICAgICAgICB9KVxuICAgICAgKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ25vZGUtd3JhcHBlcicpXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5pZDtcbiAgICAgIH0pO1xuXG4gICAgLy8gbm8gY29sbGlzaW9uIC0gYWxyZWFkeSB1c2luZyB0aGlzIGluIHN0YXRlbWVudFxuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgc3ZnLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0IGRibENsaWNrID0gZDMuc2VsZWN0KHRoaXMpLmRhdGEoKTtcbiAgICAgIHNlbGYuZGJsQ2xpY2tOb2RlUGF5bG9hZC5uZXh0KGRibENsaWNrKTtcbiAgICB9KTtcblxuICAgIC8vIG5vZGUgY2xpY2sgYW5kIGN0cmwgKyBjbGlja1xuICAgIHN2Zy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZCkge1xuICAgICAgLy8gc28gd2UgZG9uJ3QgYWN0aXZhdGUgdGhlIGNhbnZhcyAuY2xpY2sgZXZlbnRcbiAgICAgIF9kMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgLy8gc2V0dGluZyB0aGUgc2VsZWN0IGF0dHJpYnV0ZSB0byB0aGUgb2JqZWN0IG9uIHNpbmdsZSBzZWxlY3Qgc28gd2UgY2FuIGRyYWcgdGhlbVxuICAgICAgZC5zZWxlY3RlZCA9IHRydWU7XG5cbiAgICAgIHNlbGVjdEFsbE5vZGVzLmlubmVySFRNTCA9ICc8aSBjbGFzcz1cImJpIGJpLWdyaWQtZmlsbFwiPjwvaT4nO1xuICAgICAgc2VsZWN0QWxsTm9kZXMuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgIC8vIElmIGN0cmwga2V5IGlzIGhlbGQgb24gY2xpY2tcbiAgICAgIGlmIChfZDMuZXZlbnQuY3RybEtleSkge1xuICAgICAgICAvLyB0b2dnbGUgdGhlIGNsYXNzIG9uIGFuZCBvZmYgd2hlbiBjdHJsIGNsaWNrIGlzIGFjdGl2ZVxuICAgICAgICBjb25zdCBjbGlja2VkTm9kZSA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGNsaWNrZWROb2RlLmNsYXNzZWQoJ3NlbGVjdGVkJyk7XG4gICAgICAgIGNsaWNrZWROb2RlLmNsYXNzZWQoJ3NlbGVjdGVkJywgIWlzU2VsZWN0ZWQpO1xuICAgICAgICBkLnNlbGVjdGVkID0gIWlzU2VsZWN0ZWQ7XG4gICAgICAgIGQucHJldmlvdXNseVNlbGVjdGVkID0gIWlzU2VsZWN0ZWQ7XG5cbiAgICAgICAgY29uc3QgdG90YWxTaXplID0gbm9kZUVudGVyLnNpemUoKTtcbiAgICAgICAgY29uc3Qgbm9uU2VsZWN0ZWROb2RlcyA9IGQzLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcjpub3QoLnNlbGVjdGVkKScpO1xuICAgICAgICBjb25zdCBjb3VudCA9IG5vblNlbGVjdGVkTm9kZXMuc2l6ZSgpO1xuICAgICAgICBjb25zdCBub3RTZWxlY3RlZFNpemUgPSB0b3RhbFNpemUgLSBjb3VudDtcblxuICAgICAgICBpZiAobm90U2VsZWN0ZWRTaXplID09PSB0b3RhbFNpemUpIHtcbiAgICAgICAgICBzZWxlY3RBbGxOb2Rlcy5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJiaSBiaS1ncmlkXCI+PC9pPic7XG4gICAgICAgICAgc2VsZWN0QWxsTm9kZXMuc3R5bGUub3BhY2l0eSA9ICcwLjY1JztcbiAgICAgICAgfVxuICAgICAgICAvLyByZW1vdmUgdGhlIHNpbmdsZSBjbGljayBzdHlsaW5nIG9uIG90aGVyIG5vZGVzIGFuZCBsYWJlbHNcbiAgICAgICAgX2QzXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgICBfZDNcbiAgICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcbiAgICAgICAgc3ZnXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLnNlbGVjdGVkJylcbiAgICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICdibHVlJylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNzAwKTtcbiAgICAgICAgLy8gY291bnRzIG51bWJlciBvZiBzZWxlY3RlZCBjbGFzc2VzIHRvIG5vdCBleGNlZWQgMlxuICAgICAgICBjb25zdCBzZWxlY3RlZFNpemUgPSBzdmcuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKS5zaXplKCk7XG5cbiAgICAgICAgaWYgKHNlbGVjdGVkU2l6ZSA8PSAyKSB7XG4gICAgICAgICAgLy8gQXMgd2UgYWxsb3cgZm9yIHNpbmdsZSBjbGljayB3aXRob3V0IGEgY3RybCtjbGljayB0byBzZWxlY3QgdHdvIG5vZGVzLCB3ZSBoYXZlIHRvIGFwcGx5IGQuc2VsZWN0ZWQgdG8gaXRcbiAgICAgICAgICBfZDNcbiAgICAgICAgICAgIC5zZWxlY3RBbGwoJy5zZWxlY3RlZCcpXG4gICAgICAgICAgICAuYXR0cignc2VsZWN0ZWQnLCB0cnVlKVxuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgaWYgKGQpIHtcbiAgICAgICAgICAgICAgICBkLnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgLy8gZ2V0IGRhdGEgZnJvbSBub2RlXG4gICAgICAgICAgY29uc3QgbG9jYWxzZWxlY3RlZE5vZGVzQXJyYXkgPSBfZDMuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKS5kYXRhKCk7XG4gICAgICAgICAgY29uc3QgZmlsdGVySWQgPSBsb2NhbHNlbGVjdGVkTm9kZXNBcnJheS5maWx0ZXIoKHgpID0+IHgpO1xuICAgICAgICAgIHNlbGYuc2VsZWN0ZWROb2Rlc0FycmF5Lm5leHQoZmlsdGVySWQpO1xuICAgICAgICAgIHJldHVybiBmaWx0ZXJJZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN2Zy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgICAgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ3NlbGVjdGVkJywgdHJ1ZSk7XG4gICAgICAgIG5vZGVFbnRlci5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgZC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICAgIGQucHJldmlvdXNseVNlbGVjdGVkID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyByZW1vdmUgc3R5bGUgZnJvbSBzZWxlY3RlZCBub2RlIGJlZm9yZSB0aGUgY2xhc3MgaXMgcmVtb3ZlZFxuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5zZWxlY3RlZCcpXG4gICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICAvLyBSZW1vdmUgc3R5bGVzIGZyb20gYWxsIG90aGVyIG5vZGVzIGFuZCBsYWJlbHMgb24gc2luZ2xlIGxlZnQgY2xpY2tcbiAgICAgIF9kMy5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKS5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcbiAgICAgIC8vIEFkZCBzdHlsZSBvbiBzaW5nbGUgbGVmdCBjbGlja1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3QodGhpcylcbiAgICAgICAgLnNlbGVjdCgnLm5vZGVUZXh0JylcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJ2JsdWUnKVxuICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNzAwKTtcbiAgICAgIHNlbGYuc2VsZWN0ZWROb2Rlc0FycmF5Lm5leHQoW10pO1xuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9KTtcblxuICAgIC8vIFJpZ2h0IGNsaWNrIG9uIGEgbm9kZSBoaWdobGlnaHRzIGZvciBjb250ZXh0IG1lbnVcbiAgICBzdmcuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyJykub24oJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIC8vIGNvdW50cyBudW1iZXIgb2Ygc2VsZWN0ZWQgY2xhc3NlcyB0byBub3QgZXhjZWVkIDJcbiAgICAgIGNvbnN0IHNlbGVjdGVkU2l6ZSA9IHN2Z1xuICAgICAgICAuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKVxuICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAuc2l6ZSgpO1xuXG4gICAgICBpZiAoc2VsZWN0ZWRTaXplICE9PSAyKSB7XG4gICAgICAgIC8vIFdlIGRvbid0IHdhbnQgdG8gcmVtb3ZlIHN0eWxlIGlmIHRoZXkgYXJlIG9idGFpbmluZyB0aGUgY29udGV4dCBtZW51IGZvciBqdXN0IHR3byBub2RlcyAoY3JlYXRlIGxpbmsgb3B0aW9uKVxuICAgICAgICBzdmcuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgICAgc2VsZi5zZWxlY3RlZE5vZGVzQXJyYXkubmV4dChbXSk7XG4gICAgICAgIF9kM1xuICAgICAgICAgIC5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcbiAgICAgICAgX2QzXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICAgIC8vIEFkZCBzdHlsZSBvbiBzaW5nbGUgcmlnaHQgY2xpY2tcbiAgICAgICAgX2QzXG4gICAgICAgICAgLnNlbGVjdCh0aGlzKVxuICAgICAgICAgIC5zZWxlY3QoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJ2JsdWUnKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA3MDApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy9jbGljayBvbiBjYW52YXMgdG8gcmVtb3ZlIHNlbGVjdGVkIG5vZGVzXG4gICAgX2QzLnNlbGVjdCgnc3ZnJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgbm9kZUVudGVyLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgZC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgICBub2RlLmNsYXNzZWQoJ3NlbGVjdGVkJywgZmFsc2UpO1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5zZWxlY3RlZCcpXG4gICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICBfZDMuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcbiAgICAgIHNlbGYuc2VsZWN0ZWROb2Rlc0FycmF5Lm5leHQoW10pO1xuICAgICAgc2VsZWN0QWxsTm9kZXMuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiYmkgYmktZ3JpZC1maWxsXCI+PC9pPic7XG4gICAgICBzZWxlY3RBbGxOb2Rlcy5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgIH0pO1xuXG4gICAgbm9kZUVudGVyXG4gICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgaWYgKCFkLmltYWdlVXJsIHx8IGQuaW1hZ2VVcmwgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSlcbiAgICAgIC5hcHBlbmQoJ2ltYWdlJylcbiAgICAgIC5hdHRyKCd4bGluazpocmVmJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQuaW1hZ2VVcmw7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ3gnLCAtMTUpXG4gICAgICAuYXR0cigneScsIC02MClcbiAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9ICdpbWFnZSc7XG4gICAgICAgIGNvbnN0IGlkID0gZC5pZCA/IGQuaWQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke2lkfV8ke3N1ZmZpeH1gO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGNvbnN0IGlkID0gZC5pZCA/IGQuaWQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke2lkfWA7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ3dpZHRoJywgMzIpXG4gICAgICAuYXR0cignaGVpZ2h0JywgMzIpXG4gICAgICAuYXR0cignY2xhc3MnLCAnaW1hZ2UnKVxuICAgICAgLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpO1xuXG4gICAgICBub2RlRW50ZXJcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKCFkLmljb24gfHwgZC5pY29uID09PSAnJykge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQuaWNvbjtcbiAgICAgIH0pXG4gICAgICAuYXR0cigneCcsIC0xOClcbiAgICAgIC5hdHRyKCd5JywgLTMwKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3Qgc3VmZml4ID0gJ2ljb24nO1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1fJHtzdWZmaXh9IGZhYDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1gO1xuICAgICAgfSlcbiAgICAgIC5zdHlsZSgnZm9udC1zaXplJywgJzM1cHgnKVxuICAgICAgLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpO1xuICAgIFxuXG4gICAgY29uc3Qgbm9kZVRleHQgPSBub2RlRW50ZXJcbiAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAgICAgLmF0dHIoJ2lkJywgJ25vZGVUZXh0JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdub2RlVGV4dCcpXG4gICAgICAuc3R5bGUoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXG4gICAgICAuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJylcbiAgICAgIC5hdHRyKCdkeScsIC0zKVxuICAgICAgLmF0dHIoJ3knLCAtMjUpXG4gICAgICAuYXR0cigndGVzdGhvb2snLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAndGV4dCc7XG4gICAgICAgIGNvbnN0IGlkID0gZC5pZCA/IGQuaWQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke2lkfV8ke3N1ZmZpeH1gO1xuICAgICAgfSk7XG5cbiAgICBub2RlVGV4dFxuICAgICAgLnNlbGVjdEFsbCgndHNwYW4udGV4dCcpXG4gICAgICAuZGF0YSgoZCkgPT4gZC5sYWJlbClcbiAgICAgIC5lbnRlcigpXG4gICAgICAuYXBwZW5kKCd0c3BhbicpXG4gICAgICAuYXR0cignY2xhc3MnLCAnbm9kZVRleHRUc3BhbicpXG4gICAgICAudGV4dCgoZCkgPT4gZClcbiAgICAgIC5zdHlsZSgnZm9udC1zaXplJywgJzE0cHgnKVxuICAgICAgLmF0dHIoJ3gnLCAtMTApXG4gICAgICAuYXR0cignZHgnLCAxMClcbiAgICAgIC5hdHRyKCdkeScsIDE1KTtcblxuICAgIG5vZGVFbnRlclxuICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoIWQuYWRkaXRpb25hbEljb24pIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9ICdhZGRpdGlvbmFsSWNvbic7XG4gICAgICAgIGNvbnN0IGlkID0gZC5pZCA/IGQuaWQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke2lkfV8ke3N1ZmZpeH1gO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDEwMClcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCAyNSlcbiAgICAgIC5hdHRyKCd4JywgMzApXG4gICAgICAuYXR0cigneScsIC01MClcbiAgICAgIC5hdHRyKCdjbGFzcycsICdmYScpXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzg1NjQwNCcpXG4gICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5hZGRpdGlvbmFsSWNvbjtcbiAgICAgIH0pO1xuXG4gICAgLy8gdHJhbnNpdGlvbiBlZmZlY3RzIGZvciBuZXcgcHVsc2F0aW5nIG5vZGVzXG4gICAgbm9kZUVudGVyXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmICghZC5uZXdJdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLnNlbGVjdCgndGV4dCcpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCdmaWxsJywgJ2JsdWUnKVxuICAgICAgLmF0dHIoJ2ZvbnQtd2VpZ2h0JywgNzAwKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDEpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCdmaWxsJywgJ2JsdWUnKVxuICAgICAgLmF0dHIoJ2ZvbnQtd2VpZ2h0JywgNzAwKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDAuMSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnYmx1ZScpXG4gICAgICAuYXR0cignZm9udC13ZWlnaHQnLCA3MDApXG4gICAgICAuYXR0cignZmlsbC1vcGFjaXR5JywgMSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnYmx1ZScpXG4gICAgICAuYXR0cignZm9udC13ZWlnaHQnLCA3MDApXG4gICAgICAuYXR0cignZmlsbC1vcGFjaXR5JywgMC4xKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignZmlsbCcsICdibHVlJylcbiAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsIDcwMClcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAxKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignZmlsbCcsICcjMjEyNTI5JylcbiAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsIDQwMClcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAxKVxuICAgICAgLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkMy5zZWxlY3QodGhpcykuY2FsbChfZDMudHJhbnNpdGlvbik7XG4gICAgICB9KTtcblxuICAgIG5vZGVFbnRlclxuICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoIWQubmV3SXRlbSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5zZWxlY3QoJ2ltYWdlJylcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgNDUpXG4gICAgICAuYXR0cignaGVpZ2h0JywgNDUpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDMyKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDMyKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignd2lkdGgnLCA0NSlcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCA0NSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgMzIpXG4gICAgICAuYXR0cignaGVpZ2h0JywgMzIpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDQ1KVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDQ1KVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignd2lkdGgnLCAzMilcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCAzMilcbiAgICAgIC5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLmNhbGwoZDMudHJhbnNpdGlvbik7XG4gICAgICB9KTtcblxuICAgIC8vIFJlbW92ZSB0aGUgbmV3Q2xhc3Mgc28gdGhleSBkb24ndCBhbmltYXRlIG5leHQgdGltZVxuICAgIHRoaXMubm9kZXMgPSB0aGlzLnJlbW92ZU5ld0l0ZW0odGhpcy5ub2Rlcyk7XG5cbiAgICBub2RlRW50ZXIuYXBwZW5kKCd0aXRsZScpLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLmxhYmVsO1xuICAgIH0pO1xuXG4gICAgY29uc3QgbWF4VGlja3MgPSAzMDtcbiAgICBsZXQgdGlja0NvdW50ID0gMDtcbiAgICBsZXQgem9vbVRvRml0Q2FsbGVkID0gZmFsc2U7XG5cbiAgICBzaW11bGF0aW9uLm5vZGVzKHRoaXMubm9kZXMpLm9uKCd0aWNrJywgKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuem9vbVRvRml0ICYmIHRpY2tDb3VudCA+PSBtYXhUaWNrcyAmJiAhem9vbVRvRml0Q2FsbGVkKSB7XG4gICAgICAgIHNpbXVsYXRpb24uc3RvcCgpO1xuICAgICAgICBoYW5kbGVab29tVG9GaXQoKTtcbiAgICAgICAgem9vbVRvRml0Q2FsbGVkID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudGlja2VkKGxpbmtFbnRlciwgbm9kZUVudGVyLCBlZGdlcGF0aHNFbnRlcik7XG4gICAgICAgIHRpY2tDb3VudCsrO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgc2ltdWxhdGlvbi5mb3JjZSgnbGluaycpLmxpbmtzKHRoaXMubGlua3MpO1xuICAgIHNlbGYuc2F2ZUdyYXBoRGF0YS5uZXh0KGRhdGEpO1xuICB9XG5cbiAgcHVibGljIHJlc2V0R3JhcGgoaW5pdGlhbERhdGEsIGVsZW1lbnQsIHpvb20sIHpvb21Ub0ZpdCkge1xuICAgIC8vIFRvIHJlc2V0IHRoZSBzZWFyY2ggd2hlbiB3ZSByZXNldCB0aGUgZGF0YVxuICAgIHRoaXMucmVzZXRTZWFyY2ggPSB0cnVlO1xuICAgIC8vIFJlc2V0IHRoZSBkYXRhIHRvIGl0cyBpbml0aWFsIHN0YXRlXG4gICAgdGhpcy5ub2RlcyA9IFtdO1xuICAgIHRoaXMubGlua3MgPSBbXTtcbiAgICAvLyBDYWxsIHRoZSB1cGRhdGUgbWV0aG9kIGFnYWluIHRvIHJlLXNpbXVsYXRlIHRoZSBncmFwaCB3aXRoIHRoZSBuZXcgZGF0YVxuICAgIHRoaXMudXBkYXRlKGluaXRpYWxEYXRhLCBlbGVtZW50LCB6b29tLCB6b29tVG9GaXQpO1xuICB9XG59XG4iXX0=