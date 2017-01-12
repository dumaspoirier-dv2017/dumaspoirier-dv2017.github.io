/* Display setup */
var pathviewHeight = 50,
	margin = {top: 20, right: 20, bottom: 20, left: 20},
	displayArea = getWindowSize(pathviewHeight, margin),
	body = d3.select("body"),
	svgPathView = body.append("svg")
        .attr("width", displayArea.width * 2)
        .attr("height", pathviewHeight),
    svgOverview = body.append("svg")
        .attr("width", displayArea.width)
        .attr("height", displayArea.height)
		.classed("bordered", true),
	svgMainView = body.append("svg")
        .attr("width", displayArea.width)
        .attr("height", displayArea.height)
		.classed("bordered", true),
	pathview = { // File path view
		width: svgPathView.attr("width") - margin.left - margin.right,
		height: svgPathView.attr("height") - margin.top - margin.bottom,
		g: svgPathView.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
		fontSize: 45
	},
    overview = { // Tree view
		width: svgOverview.attr("width") - margin.left - margin.right,
		height: svgOverview.attr("height") - margin.top - margin.bottom,
		g: svgOverview.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
		transform: d3.zoomIdentity,
		i: 0,
	    duration: 750,
		collapse: function(d){
			if(d.children) {
		      d._children = d.children
		      d._children.forEach(overview.collapse)
		      d.children = null
		    }
		},
		searchTree: function(obj,search,path){

			if(obj.data.filename === search){ //if search is found return, add the object to the path and return it
				path.push(obj);
				return path;
			}
			else if(obj.children || obj._children){ //if children are collapsed d3 object will have them instantiated as _children
				var children = (obj.children) ? obj.children : obj._children;
				for(var i=0;i<children.length;i++){
					path.push(obj);// we assume this path is the right one
					var found = overview.searchTree(children[i],search,path);
					if(found){// we were right, this should return the bubbled-up path from the first if statement
						return found;
					}
					else{//we were wrong, remove this parent from the path and continue iterating
						path.pop();
					}
				}
			}
			else{//not the right object, return false so it will continue to iterate in the loop
				return false;
			}
		},
		extract_select2_data: function(node,leaves,index){
	        if (node.children){
	            for(var i = 0;i<node.children.length;i++){
	                index = overview.extract_select2_data(node.children[i],leaves,index)[0];
	            }
	        }
	        else {
	            leaves.push({id:++index,text:node.filename});
	        }
	        return [index,leaves];
		},
		collapse: function(d){
			if(d.children) {
		      d._children = d.children
		      d._children.forEach(overview.collapse)
		      d.children = null
		    }
		},
		openPaths: function(paths){
			for(var i =0;i<paths.length;i++){
				if(paths[i].id !== "/"){//i.e. not root
					paths[i].found = true;
					if(paths[i]._children && i != paths.length - 1){ //if children are hidden: open them, otherwise: don't do anything
						paths[i].children = paths[i]._children;
		    			paths[i]._children = null;
					}
					overview.update(paths[i]);
				}
			}
		},
		update: function(source){
			var nodes = overview.tree(overview.root).descendants(),
				links = overview.tree(overview.root).descendants().slice(1);

			nodes.forEach(function(d){ d.y = d.depth * 180});

			var node = overview.g.selectAll("g.node")
				.data(nodes, function(d) {return d.id || (d.id = ++i); });

		  	nodes.forEach(function(d){
		      d.x0 = d.x;
		      d.y0 = d.y;
		    });


			var nodeEnter = node.enter().append("g")
				.attr("class", 'node')
				.attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
				.on('click', click);

		    nodeEnter.append("circle")
			  	.attr('class', function(d){
					var cl = "node";
					if(d.found || d.data.found){
						cl += " found"
					}
					return "node"
				})
			    .attr("r", 1e-6)
			  	.style("fill", function(d) {
		            return d._children ? "#2171b5" : "lightsteelblue";
		        });

		    nodeEnter.append("text")
		        .attr("dy", ".35em")
		        .attr("x", function(d) { return d.children ? -13 : 13; })
		        .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
		        .text(function(d) {
					return d.id.substring(d.id.lastIndexOf("/") + 1);
				});

		  	var nodeUpdate = nodeEnter.merge(node);

			nodeUpdate.transition()
			.duration(overview.duration)
			.attr("transform", function(d) {
				return "translate(" + d.y + "," + d.x + ")";
			});

			nodeUpdate.select('circle.node')
				.attr('r', 10)
				.style("fill", function(d) {
					if(d.found){return "#fc8d59"}
					else{return d._children ? "#2171b5" : "lightsteelblue";}
				})
				.attr('cursor', 'pointer');



		  	var nodeExit = node.exit().transition()
		        .duration(overview.duration)
		        .attr("transform", function(d) {
		            return "translate(" + source.y + "," + source.x + ")";
		        })
		        .remove();

		  	nodeExit.select('circle')
		      .attr('r', 1e-6);

		  	nodeExit.select('text')
		      .style('fill-opacity', 1e-6);


		  	var link = overview.g.selectAll("path.link")
		      .data(links, function(d) { return d.id; });

		  	var linkEnter = link.enter().insert('path', "g")
		        .attr("class", "link")
		        .attr("d", function(d){
		          var o = {x: source.x0, y: source.y0}
		          return diagonal(o, o)
		        });

		  	var linkUpdate = linkEnter.merge(link);

		  	linkUpdate.transition()
		        .duration(overview.duration)
		        .attr('d', function(d){ return diagonal(d, d.parent) })
			.style("stroke",function(d){
				if(d.found){
					return "#fc8d59";
				}
			})
			.style("stroke-opacity",function(d){
				if(d.found){
					return "0.8";
				}
			});

		  	var linkExit = link.exit().transition()
		        .duration(overview.duration)
		        .attr('d', function(d) {
		        	var o = {x: source.x, y: source.y}
		        	return diagonal(o, o)
		        })
		        .remove();


		    function diagonal(s, d) {
		    	path = `M ${s.y} ${s.x}
		              C ${(s.y + d.y) / 2} ${s.x},
		                ${(s.y + d.y) / 2} ${d.x},
		                ${d.y} ${d.x}`;

		    	return path;
		    }

		    function click(d) {
		    	if (d.children) {
		        	d._children = d.children;
		        	d.children = null;
		        } else {
		        	d.children = d._children;
		        	d._children = null;
		        }
		    	overview.update(d);
		    }


			svgOverview.call(d3.zoom()
		    	.scaleExtent([1 / 2, 8])
		    	.on("zoom", zoomed));

			function zoomed() {
		  		overview.g.attr("transform", d3.event.transform);
		  	}
		},
		find: function(id){
			overview.g.selectAll("circle")
				.attr("class", function(d){
					d.found = false;
					return "node";
				});

			var paths = overview.searchTree(overview.root,id,[]);
			if(typeof(paths) !== "undefined"){
				overview.openPaths(paths);
			}
		}
	},
	mainview = { // Bubbles/Radial view
		width: svgMainView.attr("width") - margin.left - margin.right,
		height: svgMainView.attr("height") - margin.top - margin.bottom,
		g: svgMainView.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
        colorTypes: ["Depth", "Owner", "File extension", "Date"],
        colorType: "Depth",
        colorFiletype: d3.scaleOrdinal(d3.schemeCategory20),
        colorOwner: d3.scaleOrdinal(d3.schemeCategory10),
        colorDepth: d3.scaleQuantile().range(['#ffffcc','#d9f0a3','#addd8e','#78c679','#31a354','#006837']),
        colorDate: d3.scaleQuantile().range(['#fee0d2','#fcbba1','#fc9272','#fb6a4a','#ef3b2c','#cb181d','#a50f15']),
		colorFct: function() {
			switch(mainview.colorType){
				case "Owner":
					return mainview.colorOwner;
					break;
				case "File extension":
					return mainview.colorFiletype;
					break;
				case "Date":
					return mainview.colorDate;
					break;
				default:
					return mainview.colorDepth;
					break;
			}
		},
        color: function(node){
            return function(){
                switch(mainview.colorType){
                    case "Owner":
                        return mainview.colorOwner(node.data.owner);
                        break;
                    case "File extension":
                        return mainview.colorFiletype(node.data.fileext);
                        break;
                    case "Date":
                        return mainview.colorDate(node.data.timestamp);
                        break;
                    default:
                        return mainview.colorDepth(node.depth - (currNode?currNode.depth:1) + 2);
                        break;
                }
            }
        },
		collapse: function(startingDepth){
			return function(node){
				if(node.children) {
					if(node.depth - startingDepth >= mainview.maxDepth) {
						node._children = node.children;
						node._children.forEach(mainview.collapse(startingDepth));
						node.children = null;
					} else {
						node.children.forEach(mainview.collapse(startingDepth));
					}
			    }
			};
		},
		maxDepth: 4,
		root: undefined,
        viewFiles: true
	},
	r = Math.min(mainview.height, mainview.width),
	x = d3.scaleLinear().range([0, r]),
	y = d3.scaleLinear().range([0, r]),
    currNode,
	prevNode = {depth: 0};

overview.tree = d3.tree().size([overview.width, overview.height]);

var selectColorType = body
    .append('select')
        .attr('id','selectColorType')
        .attr('class','select')
        .style("top", margin.top + 6)
        .style("left", displayArea.width * 2 - 180)
        .on('change', function() {
            mainview.colorType = d3.select('#selectColorType').property('value');
            refreshColors();
        });

selectColorType
    .selectAll('option')
    .data(mainview.colorTypes).enter()
    .append('option')
        .attr("id", function (d, i) { return i; })
        .text(function (d) { return d; });

var legendPicto = d3.select('#legendPicto')
        .attr('class','legend_picto')
		.attr('width', 64)
		.attr('height', 32)
        .style("top", margin.top)
        .style("left", displayArea.width * 2 - 64)
        .on('mouseover', function() {
            displayLegendTooltip();
        })
		.on('mouseout', function() {
            legendTooltip.classed('hidden', true);
        });


var tooltip = d3.select('body').append('div')
	.attr('class', 'hidden tooltip');

var legendTooltip = d3.select('body').append('div')
	.attr('class', 'hidden tooltip legend')
	.style("top", margin.top + 36)
	.style("left", displayArea.width * 2 - 100 - margin.right);

var pack = d3.pack()
    .size([mainview.width - 2, mainview.height - 2])
    .padding(3);

/* Format and conversion  functions */
var displayDate = d3.timeFormat("%d/%m/%Y - %H:%M");
var displayDateNoHour = d3.timeFormat("%d/%m/%Y");
var fileSizeFormat = d3.format(",.1f");
var stratify = d3.stratify()
	.id(function(d){ return d.filename; })
    .parentId(function(d) {
		var parent = d.filename.substring(0, d.filename.lastIndexOf("/"));
		return (parent.length > 0 ? parent : (d.filename.length == 1 ? null : "/"));
	});

function getWindowSize(pathViewSize, margin){
	var w = window,
	    d = document,
	    e = d.documentElement,
	    g = d.getElementsByTagName('body')[0],
	    x = w.innerWidth || e.clientWidth || g.clientWidth,
	    y = w.innerHeight|| e.clientHeight|| g.clientHeight;

	var maxW = Math.min(x / 2 - margin.left - margin.right - 2, y - pathViewSize - margin.top)

	return {width: maxW, height: maxW}
}

function downloadVariableAsFile(variable){
	var hiddenElement = document.createElement('a');

	hiddenElement.href = 'data:attachment/text,' + encodeURI(variable);
	hiddenElement.target = '_blank';
	hiddenElement.download = 'variable.json';
	hiddenElement.click();
	delete hiddenElement;
}

function readableFileSize(aSize){ // http://blog.niap3d.com/fr/5,10,news-16-convertir-des-octets-en-javascript.html
	aSize = Math.abs(parseInt(aSize, 10));
	var def = [[1, 'octets'], [1024, 'ko'], [1024*1024, 'Mo'], [1024*1024*1024, 'Go'], [1024*1024*1024*1024, 'To']];
	for(var i=0; i<def.length; i++){
		if(aSize < def[i][0]){
			var category = Math.max(i-1, 0);
            return fileSizeFormat(aSize/def[category][0]) + ' ' + def[category][1];
        }
	}
}

/* Setup functions */
function init(){
    d3.queue()
    	.defer(d3.csv, "./outputfile.csv")
    	.defer(d3.csv, "./file_extensions.csv")
    	.await(processData);

}

function processData(error, data, file_extensions){
    if (error) throw error;

    /* Building directory tree */

	//var data2 = [];
	var types = new Set();
	var owners = new Set();
    var maxDepth = 0;
    var minDate = Number.MAX_SAFE_INTEGER;
    var maxDate = 0;
	data.forEach(function(d){
		// Collect different file types + extensions
		types.add("" + d.filetype + d.fileext);
		owners.add(d.owner);
        maxDepth = (d.depth > maxDepth) ? d.depth : maxDepth;
        time = parseInt(d.timestamp)
        maxDate = (time > maxDate) ? parseInt(time) : maxDate;
        minDate = (time < minDate && time > 1451602800) ? time : minDate;

		/*if(d.depth <= mainview.maxDepth && (mainview.viewFiles || (d.filetype == "d"))){
			data2.push(d);
		}*/
	});

	data.sort(function(a, b) { return b.size - a.size; });

	/* Treeview */
    var overviewRoot = stratify(data)
		.sum(function(d) { return d.size;})
		.sort(function(a, b) { return b.size - a.size; });

	overview.root = overviewRoot;
	select2_data = overview.extract_select2_data(data,[],0)[1];
	overview.root.children.forEach(overview.collapse);
	overview.update(overview.root);

	/* Main view (pack layout) */
	mainview.root = stratify(data)
		.sum(function(d) { return d.size;})
		.sort(function(a, b) { return b.size - a.size; });
	mainview.root.children.forEach(mainview.collapse(0));
	pack(mainview.root);


	// downloadVariableAsFile(root);

	mainview.colorFiletype.domain(file_extensions.map(function(line){ return line.extension; })).unknown('rgb(200, 200, 200)');
	// mainview.colorFiletype.domain( Array.from(types)).unknown('rgb(200, 200, 200)');
	mainview.colorOwner.domain(Array.from(owners)).unknown('rgb(200, 200, 200)');
	mainview.colorDepth.domain([0, 5]);
	mainview.colorDate.domain([minDate, maxDate]);

    currNode = mainview.root;

	initLegendToolTip();
    displayMainView(mainview.root);
    displayPathView(mainview.root);
}

function getFileName(node){
    var path = node.data.filename;
    var name = path.split("/");
    name = name[name.length - 1]
    return name.length > 0 ? name : "/";
}

function hovered(hover) {
	return function(d) {
		d3.selectAll(d.ancestors().map(function(d) { return d.node; })).classed("node--hover", hover);

		tooltip.classed('hidden', !hover);
	};
}

/* Display functions */
function refresh(){
    currNode
		&& zoom(currNode)
		&& displayPathView(currNode);
	legendTooltip.select("svg").remove();
	initLegendToolTip();
}

function refreshColors(){
	setTimeout(function(){
		// Change colors of pathview ...
		pathview.g
			.selectAll("g").select(".pathPoly")
				.style("fill", function(d){ return mainview.color(d)() } );

		// ... and mainview
		mainview.g.selectAll("circle")
			.style("fill", function(d){ return mainview.color(d)() } );

		// Change legend colors
		legendTooltip.select("svg").remove();
		initLegendToolTip();
	}, 1);
}

function displayTooltip(d){
	var mouse = d3.mouse(svgMainView.node()).map(function(d2) {
		return parseInt(d2);
	});
	tooltip.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 60 + mainview.width) + 'px; top:' + (mouse[1] + 70) + 'px')
        .html("<table>" +
			"<tr>" +
				"<td>" + (d.data.filetype == "d" ? "Dir" : "File") + "</td>" +
				"<td>" + d.data.filename + "</td>" +
			"</tr>" +
			"<tr>" +
				"<td>Owner</td>" +
				"<td>" + d.data.owner + "</td>" +
			"</tr>" +
			"<tr>" +
				"<td>Size</td>" +
				"<td>" + readableFileSize(d.data.size) + "</td>" +
			"</tr>" +
			"<tr>" +
				"<td>Date</td>" +
				"<td>" + displayDate(d.data.timestamp * 1000) + "</td>" +
			"</tr>" +
		"</table>");
}

function initLegendToolTip() {
	legendTooltip.append("svg")
	    .attr("width", 100)
	    .attr("height", function(){
			switch(mainview.colorType){
				case "Owner":
				case "File extension":
					return mainview.colorFct().domain().length * 20;
					break;
				default:
					return mainview.colorFct().range().length * 20 + 2;
					break;
			}
		});
}

function displayLegendTooltip(){
	var mouse = d3.mouse(svgMainView.node()).map(function(d2) {
		return parseInt(d2);
	});
	var legendSvg = legendTooltip.classed('hidden', false)
        .select("svg");

	var legendItems = legendSvg.selectAll(".legend")
		.data(function() {
			switch(mainview.colorType){
				case "Owner":
				case "File extension":
					return mainview.colorFct().domain();
					break;
				default:
					return mainview.colorFct().range();
					break;
			}
		})
	    .enter().append("g")
	    	.attr("class", "legend")
	    	.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

	legendItems.append("rect")
		.attr("x", 100 - 18)
		.attr("width", 18)
		.attr("height", 18)
		.style("fill", function(d) {
			switch(mainview.colorType){
				case "Owner":
				case "File extension":
					return mainview.colorFct()(d);
					break;
				default:
					return d;
					break;
			}
		});

	legendItems.append("text")
		.attr("x", 100 - 24)
		.attr("y", 9)
		.attr("dy", ".35em")
		.style("text-anchor", "end")
		.text(function(d, i) {
			switch(mainview.colorType){
				case "Owner":
				case "File extension":
					return d;
					break;
				case "Date":
					return displayDateNoHour(mainview.colorFct().invertExtent(d)[1] * 1000);
					break;
				default:
					return i;
					break;
			}
		})
}

function displayMainView(root) {
	var node = mainview.g
		.selectAll("g")
		.data(root.descendants())
		.enter().append("g")
			.attr("class", function(d) { return "node" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
			.each(function(d) { d.node = this; });

	node.append("circle")
		.attr("id", function(d) { return "node-" + d.data.filename; })
		.attr("cx", function(d) { return d.x; })
		.attr("cy", function(d) { return d.y; })
		.attr("r", function(d) { return d.r; })
		.style("fill", function(d){ return mainview.color(d)() } )
        .style("stroke-width", function(d){ return Math.sqrt(Math.max(5 - d.depth, 1)) })
		.on("mouseover", hovered(true))
		.on("mouseout", hovered(false))
		.on("mousemove", displayTooltip)
		.on("click", function(d) { return zoom(node == d ? node : d); });

	/*node.append("text")
		.attr("x", function(d) { return d.x })
		.attr("y", function(d) { return d.y })
		.text(getFileName);
		})
		.attr("pointer-events", "none")
		.style("text-anchor", "middle")
		.classed("hidden", function(d){ return !d.children });*/

	//d3.select(window).on("click", function() { zoom(root); });
	zoom(root);

}

function degreeOfInterest(node){
    var distance = Math.abs(currNode.depth - node.depth);
    var currNodeParent = currNode.data.filename.slice(0, currNode.data.filename.lastIndexOf("/"));
    var nodeParent = node.data.filename.slice(0, node.data.filename.lastIndexOf("/"));
    var inheritance = (currNodeParent.includes(nodeParent)) ? -2 : 2;
    return distance + inheritance;
}

// Adapted from : http://mbostock.github.io/d3/talk/20111116/#10
function zoom(clickedNode, i) {
	if(currNode.id == clickedNode.id && i) return;

	overview.find(clickedNode.id);

	var k = r / clickedNode.r / 2;
	x.domain([clickedNode.x - clickedNode.r, clickedNode.x + clickedNode.r]);
	y.domain([clickedNode.y - clickedNode.r, clickedNode.y + clickedNode.r]);


    currNode = clickedNode;

	function processPack(node){
	    function shift(n, amount){
	        n.x -= amount.x;
	        n.y -= amount.y;
	        if(n.children) {
	            n.children.forEach(function(n0){shift(n0, amount)});
	        }
	    }

	    if(!node.children) {
	        if(node._children){
	            node.children = node._children;
	            node._children = null;

	            var prevPos = {r: node.r, x: node.x, y: node.y};
	            var packThis = d3.pack()
	                .size([node.r * 2, node.r * 2])
	                .padding(3);
	            packThis(node);
	            node.r = prevPos.r;
	            var prevPos = {x: node.x - prevPos.x, y: node.y - prevPos.y};
	            shift(node, prevPos);
	        }
	    }
	}

	function unCollapse(startingDepth){
	    return function(node){
	        if(node._children) {
	            if(node.depth - startingDepth <= 1) {
	                node.children = node._children;
	                //node.children.forEach(unCollapse(startingDepth));
	                node._children = null;
	            }
	        }
	    };
	}

	processPack(clickedNode);

	var allNodes = mainview.g
		.selectAll("g").data(mainview.root.descendants());
	var nodeEnter = allNodes.enter().append("g");

	nodeEnter
		.attr("class", function(d) { return "node" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
		.each(function(d) { d.node = this; });

	nodeEnter.append("circle")
		.attr("id", function(d) { return "node-" + d.data.filename; })
		.attr("cx", function(d) { return d.x; })
		.attr("cy", function(d) { return d.y; })
		.attr("r", function(d) { return d.r; })
		.style("fill", function(d){ return mainview.color(d)() } )
		.style("stroke-width", function(d){ return Math.sqrt(Math.max(5 - d.depth, 1)) })
		.on("mouseover", hovered(true))
		.on("mouseout", hovered(false))
		.on("mousemove", displayTooltip)
		.on("click", function(d) { return zoom(node == d ? node : d); });

	var nodeUpdate = nodeEnter.merge(allNodes);



    mainview.g.selectAll("circle")
        .attr("class", function(d){ return (degreeOfInterest(d) >= 6) ? "hidden" : "" });

	var t = nodeUpdate.transition()
		.duration(500);

	t.selectAll("circle")
		.attr("cx", function(d) { return x(d.x); })
		.attr("cy", function(d) { return y(d.y); })
		.attr("r", function(d) { return k * d.r; })
		.style("fill", function(d){ return mainview.color(d)() } );

	/*t.selectAll("text")
		.attr("x", function(d) { return x(d.x); })
		.attr("y", function(d) { return y(d.y); })
		.style("opacity", function(d) { return k * d.r > 20 ? 1 : 0; });*/


	allNodes.exit().remove();


	node = clickedNode;
	d3.event && d3.event.stopPropagation();
	displayPathView(clickedNode)
}

function getTextWidth(text, fontSize, fontFace) {
        var a = document.createElement('canvas');
        var b = a.getContext('2d');
        b.font = fontSize + 'px ' + fontFace;
        var mesure = b.measureText(text);
        return mesure.width;
}

function displayPathView(selectedNode) {
	function polygon(d, i) {
		var width = getTextWidth(getFileName(d), pathview.fontSize, "arial") + pathview.fontSize / 2;
		var points = [];
		points.push("10,0");
		points.push(width + 10 + ",0");
		points.push(width + "," + pathview.fontSize);
		points.push(0 + "," + pathview.fontSize);
		return points.join(" ");
	}
	//var directory = (selectedNode.depth >= prevNode.depth) ? selectedNode : prevNode;
	var directory = selectedNode;
	var nodes = [];
	while(typeof directory != "undefined" && directory){
		nodes.push(directory);
		directory = directory.parent;
	}

	nodes.reverse();
	var trunk = pathview.g
		.selectAll("g")
		.data(nodes);

	trunk.exit().remove();

	var enterNodes = trunk.enter().append("g");

	enterNodes
		.classed("pathElement", true)
		.on("click", function(d) { return zoom(d); });

	enterNodes.append("polygon")
		.classed("pathPoly", true)
		.attr("points", polygon)
		.style("fill", function(d){ return mainview.color(d)() } )
		.attr("transform", "translate(-15," + -pathview.fontSize *0.55 + ")");

	enterNodes.append("text")
		.classed("pathText", true)
		.attr("y", pathviewHeight - pathview.fontSize - 8)
		.style("font-size", pathview.fontSize)
		.attr("text-anchor", "left")
		.attr("y", function(d, i){
			return pathview.height + pathview.fontSize / 10;
		})
		.text(getFileName);

	//var allNodes = pathview.g.selectAll(".pathPoly");
	var allTexts = trunk.select(".pathText");
	allTexts
		.attr("text-anchor", "left")
		.text(getFileName);
	trunk.select(".pathPoly")
		.attr("points", polygon)
		.style("fill", function(d){ return mainview.color(d)() } );

	pathview.g
		.selectAll("g").attr("transform", function(d, i) {
		var offset = 0;
		for(var j = i - 1; j >= 0; j--){
			offset += pathview.fontSize * 0.6 + getTextWidth(getFileName(nodes[j]), pathview.fontSize, "arial");
		}
		//var width = getTextWidth(trunk.data[i - 1].data.filename, 20, "arial") + 15;
    	return "translate(" + offset + ", " + (pathview.fontSize * 0.15) + ")";
 	});

	prevNode = selectedNode;
}

init();
