/**
 * Force-Directed Graph Generator
 */
class FDG {
    constructor (d3, selector) {
        this.timelinePadding = 30
        this.timelineHeight = 50

        this.d3 = d3
        this.selector = selector
        this.container = this.d3.select(this.selector)
        this.graphContainer = this.container.append('div')
            .attr('class', 'graph-container')
            .style('width', this.container.style('width'))
            .style('height', parseInt(this.container.style('height')) - this.timelineHeight + 'px')
        this.timelineContainer = this.container.append('div')
            .attr('class', 'timeline-container')
            .style('width', this.container.style('width'))
            .style('height', this.timelineHeight + 'px')
        this.graphSvg = this.graphContainer
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
        this.timelineSvg = this.timelineContainer
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
        this.width = parseInt(this.graphSvg.style('width'))
        this.height = parseInt(this.graphSvg.style('height'))
        this.links = null
        this.weight_list = []
        this.year_list = []
        this.nodes = []
        this.color = this.d3.scaleOrdinal(d3.schemePaired);
        this.simulation = null
        this.brushData = null
        this.initialized = false
        this.selection = []
    }

    /**
     * The entry function
     * Get the json data
     * @param {string} url path of the json file
     */
    init (url) {
        if (!url) return
        this.url = url
        this.d3.json(url).then((res) => {
            this.weight_list = res.relationship_weight
            this.data = JSON.stringify(res)
            this.prepareData()
            if (this.year_list.length >= 4) {
                this.selection = [new Date(this.year_list[1], 0, 1), new Date(this.year_list[this.year_list.length - 2], 0, 1)]
                this.brush_gen()
                this.timeChanged()
            }
        }, (err) => {
            if (err)
                console.log(err)
        })
    }

    /**
     * Prepare the Nodes Array and years Set
     */
    prepareData () {
        this.links = JSON.parse(this.data).data
        let years = new Set()
        for (let link of this.links) {
            years.add(link.year)
        }
        this.year_list = Array.from(years)
        this.year_list.sort((a, b) => {return a- b})
    }

    /**
     * Generate Brush and Timeline
     */
    brush_gen() {
        let that = this
        let width = this.width - 2 * this.timelinePadding
        let height = this.timelineHeight - 20
        let axisX = d3.scaleTime()
            .domain([new Date(this.year_list[0], 0, 1), new Date(this.year_list[this.year_list.length - 1], 0, 1)])
            .rangeRound([0, width])
        let container = this.timelineSvg.append('g')
            .attr('width', width + 'px')
            .attr('transform', 'translate(' + this.timelinePadding + ', 0)')
        container.append('g')
            .attr('class', 'axis axis-grid')
            .attr('transform', 'translate(0, ' + height + ')')
            .call(this.d3.axisBottom(axisX)
                .ticks(this.d3.timeYear)
                .tickSize(-height)
                .tickFormat(() => {
                    return null
                }))
            .selectAll('.tick')
            .classed('tick-mirror', (d) => {
                return d.getFullYear()
            })

        container.append('g')
            .attr('class', 'axis axis-x')
            .attr('transform', 'translate(0, ' + height + ')')
            .call(this.d3.axisBottom(axisX)
                .ticks(this.d3.timeYear)
                .tickPadding(0))
            .attr('text-anchor', null)
            .selectAll('text')

        let brushX = this.d3.brushX()
            .extent([
                [0, 0],
                [width, height]
            ])
            .on('end', function () {
                that.brushended(this, axisX)
            })
        let group = container.append('g')
            .attr('class', 'brush')
            .call(brushX)
        if (!this.initialized) {
            group.call(brushX.move, this.selection.map(axisX))
            this.initialized = true
        }
    }

    /**
     * Create the force simulation, and start generate
     */
    start() {
        this.simulation = this.d3.forceSimulation(this.nodes)
            .force('link', d3.forceLink().id((d) => {return d.name}).distance([100]))
            .force("charge", d3.forceManyBody().strength([-50]))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))

        let link = this.link_gen()
        let linkDesc = this.link_desc_gen()
        let node = this.node_gen(link, linkDesc)

        this.simulation.nodes(this.nodes)
            .on('tick', () => {
                this.ticked(link, linkDesc, node)
            })

        this.simulation.force('link')
            .links(this.links)
    }

    /**
     * Generate links -- lines between nodes
     */
    link_gen () {
        let link = this.graphSvg.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(this.links)
            .enter()
            .append('line')
            .attr('stroke-width', (d) => {
                for (let v of this.weight_list) {
                    if (v.id == d.value) {
                        return v.weight
                    }
                }
            })
        return link
    }

    /**
     * Generate link's description
     */
    link_desc_gen () {
        let linkDesc = this.graphSvg.append('g')
            .attr('class', 'link-desc')
            .selectAll('text')
            .data(this.links)
            .enter()
            .append('text')
            .text((d) => {
                return d.relationship
            })
        return linkDesc
    }

    /**
     * Generate nodes
     * @param {Selection} link The selection of links
     * @param {Selection} linkDesc The selection of link's description
     */
    node_gen(link, linkDesc) {
        let node = this.graphSvg.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(this.nodes)
            .enter()
            .append('g')
            .on('mouseover', (d) => {
                linkDesc.style('fill-opacity', (line) => {
                    if (line.source === d || line.target === d) {
                        return 1
                    }
                })
                link.style('stroke', (line) => {
                    if (line.source === d || line.target === d) {
                        return '#000'
                    }
                })
            })
            .on('mouseout', (d) => {
                linkDesc.style('fill-opacity', (line) => {
                    if (line.source === d || line.target === d) {
                        return 0
                    }
                })
                link.style('stroke', (line) => {
                    if (line.source === d || line.target === d) {
                        return '#999'
                    }
                })
            })
            .call(d3.drag()
                .on("start", (d) => { this.dragstarted(d) })
                .on("drag", (d) => { this.dragged(d) })
                .on("end", (d) => { this.dragended(d) }));
        node.append('circle')
            .attr('r', 10)
            .attr('fill', (d) => {
                return this.color(d.group)
            })
            .append('title')
            .text((d) => {
                return d.name
            })
        node.append('text')
            .attr('fill', (d) => {
                return this.color(d.group);
            })
            .attr("y", -22)
            .attr("dy", 10)
            .text((d) => { return d.name })
        return node
    }

    /**
     * Force simulator tick event
     * link nodes
     * @param {Selection} link The selection of links
     * @param {Selection} linkDesc The selection of link's description
     * @param {Selection} node The selection od nodes
     */
    ticked (link, linkDesc, node) {
        link
            .attr("x1", (d) => { return d.source.x; })
            .attr("y1", (d) => { return d.source.y; })
            .attr("x2", (d) => { return d.target.x; })
            .attr("y2", (d) => { return d.target.y; });

        linkDesc
            .attr("x", (d) => { return (d.source.x + d.target.x) / 2; })
            .attr("y", (d) => { return (d.source.y + d.target.y) / 2; })

        node
            .attr("transform", (d) => { return "translate(" + d.x + "," + d.y + ")"; })
    }

    /**
     * Brush end event
     * Snap grid
     * @param {Group} brush brush's group
     * @param {Continuous} axisX  continuous x axis
     */
    brushended (brush, axisX) {
        if (!this.d3.event.sourceEvent) return
        if (!this.d3.event.selection) {
            this.d3.select(brush).transition().call(this.d3.event.target.move, this.selection.map(axisX))
            return
        }
        let d0 = this.d3.event.selection.map(axisX.invert)
        let d1 = d0.map(this.d3.timeYear.round)
        if (d1[0] >= d1[1]) {
            d1[0] = this.d3.timeYear.floor(d0[0])
            d1[1] = this.d3.timeYear.offset(d1[0])
        }

        this.d3.select(brush).transition().call(this.d3.event.target.move, d1.map(axisX))

        this.timeChanged(d1)
    }

    /**
     * Change Links list and Nodes list
     * @param {Array} t Date Array
     */
    timeChanged (t) {
        if (t) this.selection = t
        else if (this.selection) t = this.selection
        else return
        let minYear = t[0].getFullYear()
        let maxYear = t[1].getFullYear()
        this.links = []
        this.nodes = []
        let nodes = new Set()
        for (let link of JSON.parse(this.data).data) {
            if (link.year >= minYear && link.year <= maxYear) {
                this.links.push(link)
                nodes.add(link.source)
                nodes.add(link.target)
            }
        }
        let count = 1
        for (let node of nodes) {
            this.nodes.push({
                name: node,
                group: count
            })
            count++
        }
        this.refresh()
    }

    /**
     * Node drag start event
     * @param {Object} d Node data object
     */
    dragstarted (d) {
        if (!d3.event.active) this.simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
    }

    /**
     * Node drag event
     * @param {Object} d Node data object
     */
    dragged (d) {
        d.fx = d3.event.x
        d.fy = d3.event.y
    }

    /**
     * Node drag end event
     * @param {Object} d Node data object
     */
    dragended (d) {
        if (!d3.event.active) this.simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
    }

    /**
     * Refresh svg
     * * @param {Event} evt Click event
     */
    refresh (evt) {
        if (this.graphSvg) this.graphSvg.remove()
        this.graphSvg = this.graphContainer
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
        if (evt) {
            this.timeChanged(this.selection)
        } else {
            this.start()
        }
    }
}