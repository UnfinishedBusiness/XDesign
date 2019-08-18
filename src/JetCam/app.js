const electron = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
var $ = require('jquery');
var fs = require('fs');
let DxfParser = require('dxf-parser');
let DxfWriter = require('dxf-writer');
let navigation;
let fonts;
let render = new ProfileRender();

const Workbench = "JetCam";
var CurrentFile = null;

var job_options = { material_size: { width: 48, height: 96 } };

function ParseDXF(data, part_name)
{
  var parser = new DxfParser();
  try {
      var imported_stack = [];
      var dxf = parser.parseSync(data);
      for (var i = 0; i < dxf.entities.length; i++)
      {
        if (dxf.entities[i].type == "CIRCLE")
        {
          imported_stack.push({ type: "circle", origin: [dxf.entities[i].center.x, dxf.entities[i].center.y], radius: dxf.entities[i].radius, meta: render.copy_obj(render._defaultMeta)});
        }
        else if (dxf.entities[i].type == "LINE")
        {
          imported_stack.push({ type: "line", origin: [dxf.entities[i].vertices[0].x, dxf.entities[i].vertices[0].y], end: [dxf.entities[i].vertices[1].x, dxf.entities[i].vertices[1].y], meta: render.copy_obj(render._defaultMeta) });
        }
        else if (dxf.entities[i].type == "ARC")
        {
          imported_stack.push({ type: "arc", origin: [dxf.entities[i].center.x, dxf.entities[i].center.y], startAngle: render.to_degrees(dxf.entities[i].startAngle), endAngle: render.to_degrees(dxf.entities[i].endAngle), radius: dxf.entities[i].radius, meta: render.copy_obj(render._defaultMeta)});
        }
      }
      var part = render.newPart(part_name);
      part.entities = imported_stack;
      render.Stack.push(part);
  }catch(err) {
      return console.error(err.stack);
  }
}
function animate()
{
  //render.controls.update();
  requestAnimationFrame ( animate );
  render.renderer.render (render.scene, render.camera);
}
function NewJob()
{

}
function SaveJob()
{
	if (CurrentFile.includes(".job"))
	{
		fs.writeFile(CurrentFile, JSON.stringify(render.Stack),
	    // callback function that is called after writing file is done
	    function(err) {
	        if (err) throw err;
	        // if no error
	        //console.log("Data is written to file successfully.")
		});
	}
}
function SaveJobAs()
{
	const {dialog} = electron.remote;
	dialog.showSaveDialog({
		filters: [
						{ name: 'JOB', extensions: ['job'] },
					]
		}, function (file) {
				if (file !== undefined)
				{
					CurrentFile = file;
					if (file.includes(".job"))
					{
						console.log("Save job file: " + file);
						fs.writeFile(file, JSON.stringify(render.Stack),
					    // callback function that is called after writing file is done
					    function(err) {
					        if (err) throw err;
					        // if no error
					        //console.log("Data is written to file successfully.")
						});
					}
				}
		});
}
function OpenJob()
{
	const {dialog} = electron.remote;
	dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
				filters: [
								{ name: 'JOB', extensions: ['job'] },
							]
    }, function (files) {
        if (files !== undefined) {
					jetcam.Stack = []; //Delete Stack
        	files.forEach(function(item, index, arr){
						CurrentFile = item;
						require('electron').remote.getCurrentWindow().setTitle("CAM - " + CurrentFile);
						if (item.includes(".job"))
						{
							console.log("Opening Job File: " + item);
							fs.readFile(item, 'utf-8', (err, data) => {
								if(err){
										alert("An error ocurred reading the file :" + err.message);
										return;
								}
								jetcam.Stack = JSON.parse(data);
							});
						}
					});
        }
    });
}
function ImportDrawing()
{
	const {dialog} = electron.remote;
	dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
				filters: [
								{ name: 'DXF', extensions: ['dxf'] },
								{ name: 'SVG', extensions: ['svg'] },
							]
    }, function (files) {
        if (files !== undefined) {
        	files.forEach(function(item, index, arr){
						if (item.includes(".dxf"))
						{
							console.log("Opening DXF File: " + item);
							fs.readFile(item, 'utf-8', (err, data) => {
								if(err){
										alert("An error ocurred reading the file :" + err.message);
										return;
								}
								var path = require("path");
								var filepath = item;
								var name = path.parse(filepath).name;
								ParseDXF(data, name);
								add_part(name, true);
							});
						}
					});
        }
    });
}
function CreateMenu()
{
	const {remote} = require('electron');
  const {Menu, MenuItem} = remote;

  const menu = new Menu();
  menu.append(new MenuItem ({
    label: 'File',
		submenu: [
			{ label: 'Post',
			click: function() {
				PostGcode();
			}},
			{ label: 'New',
			click: function() {
				NewJob();
			}},
			{ label: 'Open',
			click: function() {
				OpenJob();
			}},
			{ label: 'Save',
			click: function() {
				SaveJob();
			}},
			{ label: 'Save As',
			click: function() {
				SaveJobAs();
			}},
			{ label: 'Import',
			click: function() {
				ImportDrawing();
			}},
			{ label: 'Debug',
			click: function() {
				require('electron').remote.getCurrentWindow().toggleDevTools();
			}},
			{ label: 'Reload',
			click: function() {
				require('electron').remote.getCurrentWindow().reload();
			}}
		]
 }));
 menu.append(new MenuItem ({
	 label: 'Options',
	 submenu: [
		 { label: 'Job Setup',
		 click: function() {

		 }},
		 { label: 'Machine Setup',
		 click: function() {

		 }},
		 { label: 'Settings',
		 click: function() {

		 }}
	 ]
}));
 appendWorkbenchMenu(menu);
	Menu.setApplicationMenu(menu);
}
function build_tree()
{
	$("#parts_tree").bind('ready.jstree', function(event, data) {
		var $tree = $(this);
		$($tree.jstree().get_json($tree, {
			flat: true
		  }))
		  .each(function(index, value) {
			var node = $("#parts_tree").jstree().get_node(this.id);
			var lvl = node.parents.length;
			var idx = index;
			//console.log('node index = ' + idx + ' level = ' + lvl);
			//console.log(node);
			$("#" + node.id).css({ color: "#9CA4B4"});
		  });
	});
	$('#parts_tree').jstree({
		'core' : {
			'check_callback': true,
			'data': [],
			"themes" : {
				"dots" : false, // no connecting dots between dots
				"icons" : false,
			  }
		},
        'checkbox': {
            three_state: false,
            cascade: 'up'
		},
        'plugins': ["checkbox"]
	});
}
function add_part(name, state)
{
	name = name.replace(/ /g,"_");
	var parent = '#';
	var node = { id:name,text:name, "state": { "selected": state }};
	$('#parts_tree').jstree().create_node(parent, node, 'last');
}
function delete_part(name)
{
	name = name.replace(/ /g,"_");
	$('#parts_tree').jstree().delete_node("#" + name);
}
function style_tree()
{
	var tree_data = $("#parts_tree").jstree().get_json();
	for (var x = 0; x < tree_data.length; x++)
	{
		//console.log(tree_data[x]);
		$("#" + tree_data[x].id).css({color: "#9CA4B4"});
		if (tree_data[x].children.length > 0)
		{
			for (var y = 0; y < tree_data[x].children.length; y++)
			{
				$("#" + tree_data[x].children[y].id).css({color: "#9CA4B4"});
			}
		}
	}
}
function chainify_part(part_index)
{
	var chain_tolorance = 0.005;
	if (render.Stack.length > part_index) //part_index exists
	{
		var random_entities = render.copy_obj(render.Stack[part_index].entities);
		var contours = [];
		var current_path = [];
		var polarToCartesian = function(centerX, centerY, radius, angleInDegrees) {
			var angleInRadians = (angleInDegrees) * Math.PI / 180.0;
  
			return {
				x: centerX + (radius * Math.cos(angleInRadians)),
				y: centerY + (radius * Math.sin(angleInRadians))
			};
		}
		var get_arc_points = function(origin, radius, startAngle, endAngle)
		{
			var points = [];
			var start = startAngle % 360;
			var end = endAngle % 360;
			//console.log("Start Angle: " + start + ", End Angle: " + end);
			if (start > end) end += 360;
			var angle_inc = 1;
			for (var x = start; x <= end; x+= angle_inc)
			{
				points.push(polarToCartesian(origin.x, origin.y, radius, x));
				//console.log("Pushing!");
			}
			return points;
		}
		var get_distance = function(p1, p2)
		{
			return Math.sqrt( Math.pow((p1.x-p2.x), 2) + Math.pow((p1.y-p2.y), 2));
		}
		var get_next_contour_point = function(current_path)
		{
			var point = current_path[current_path.length - 1];
			for (var x = 0; x < random_entities.length; x++)
			{
				if (random_entities[x].type == "line")
				{
					if (get_distance(point, {x: random_entities[x].origin[0], y: random_entities[x].origin[1]}) < chain_tolorance)
					{
						//console.log("Found line match! " + x);
						current_path.push({ x: random_entities[x].end[0], y: random_entities[x].end[1] });
						random_entities.splice(x, 1);
						return true;
					}
					else if (get_distance(point, {x: random_entities[x].end[0], y: random_entities[x].end[1]}) < chain_tolorance)
					{
						//console.log("Found line match! " + x);
						current_path.push({ x: random_entities[x].origin[0], y: random_entities[x].origin[1] });
						random_entities.splice(x, 1);
						return true;
					}
				}
				if (random_entities[x].type == "arc")
				{
					//console.log("(Next Point) Start Angle: " + random_entities[x].startAngle + " End Angle: " + random_entities[x].endAngle);
					var start_line = render.geometry.get_line_at_angle({x: random_entities[x].origin[0], y: random_entities[x].origin[1]}, random_entities[x].startAngle, random_entities[x].radius);
					var end_line = render.geometry.get_line_at_angle({x: random_entities[x].origin[0], y: random_entities[x].origin[1]}, random_entities[x].endAngle, random_entities[x].radius);
					if (get_distance(point, {x: start_line.end[0], y: start_line.end[1]}) < chain_tolorance)
					{
						var points = get_arc_points({x: random_entities[x].origin[0], y: random_entities[x].origin[1]}, random_entities[x].radius, random_entities[x].startAngle, random_entities[x].endAngle);
						for (var i = 0; i < points.length; i++)
						{
							current_path.push(points[i]);
						}
						current_path.push({x: end_line.end[0], y: end_line.end[1]});
						random_entities.splice(x, 1);
						return true;
					}
					else if (get_distance(point, {x: end_line.end[0], y: end_line.end[1]}) < chain_tolorance)
					{
						var points = get_arc_points({x: random_entities[x].origin[0], y: random_entities[x].origin[1]}, random_entities[x].radius, random_entities[x].startAngle, random_entities[x].endAngle);
						//console.log("Points: " + points.length);
						for (var i = points.length-1; i > 0; i--)
						{
							current_path.push(points[i]);
						}
						current_path.push({x: start_line.end[0], y: start_line.end[1]});
						random_entities.splice(x, 1);
						return true;
					}
				}
			}
			return false;
		}
		while(random_entities.length > 0) //This is iterating for each contour
		{
			current_path = [];
			var find_chain = false;
			if (random_entities[0].type == "line")
			{
				find_chain = true;
				current_path.push({x: random_entities[0].origin[0], y: random_entities[0].origin[1]});
				current_path.push({x: random_entities[0].end[0], y: random_entities[0].end[1]});
				random_entities.splice(x, 1);
				//console.log("Priming contour with line!" + contours.length);
			}
			else if (random_entities[0].type == "arc")
			{
				find_chain = true;
				var start_line = render.geometry.get_line_at_angle({x: random_entities[0].origin[0], y: random_entities[0].origin[1]}, random_entities[0].startAngle, random_entities[0].radius);
				var end_line = render.geometry.get_line_at_angle({x: random_entities[0].origin[0], y: random_entities[0].origin[1]}, random_entities[0].endAngle, random_entities[0].radius);
				current_path.push({x: start_line.end[0], y: start_line.end[1]});
				console.log("(Entity Priming ) Start Angle: " + random_entities[0].startAngle + " End Angle: " + random_entities[0].endAngle);
				current_path.push({x: end_line.end[0], y: end_line.end[1]});
				random_entities.splice(x, 1);
				//console.log("Priming contour with arc!" + contours.length);
			}
			else if (random_entities[0].type == "circle")
			{
				find_chain = false; //Circles must always be a complete circle
				//Explode this circle into verticies and add each point to current_path
				var points_one = get_arc_points({x: random_entities[0].origin[0], y: random_entities[0].origin[1]}, random_entities[0].radius, 0, 180);
				for (var i = 0; i < points_one.length; i++)
				{
					current_path.push(points_one[i]);
				}
				var points_two = get_arc_points({x: random_entities[0].origin[0], y: random_entities[0].origin[1]}, random_entities[0].radius, 180, 360);
				for (var i = 0; i < points_two.length; i++)
				{
					current_path.push(points_two[i]);
				}
				random_entities.splice(x, 1); //Delete this circle from the path
			}
			if (find_chain == true)
			{
				while(get_next_contour_point(current_path) == true);
				//If the end point and the start points are the same, we are a closed path
			}
			if (current_path.length > 2)
			{
				contours.push(current_path);
			}
			else
			{
				//console.log("Emmitting path without any other points!");
			}
		}

		/*
			Render the contours to ensure the algorythim is working right
		*/
		render.Stack[part_index].hidden = true;
		render.Stack[part_index].updateRender = true;

		for (var x = 0; x < contours.length; x++)
		{
			var imported_stack = [];
			for (var y = 1; y < contours[x].length; y++)
			{
				imported_stack.push({ type: "line", origin: [contours[x][y-1].x, contours[x][y-1].y], end: [contours[x][y].x, contours[x][y].y], meta: render.copy_obj(render._crosshairMeta) });
			}
			var part = render.newPart("chainify-" + x);
			part.entities = imported_stack;
			render.Stack.push(part);
		}
		return contours;
	}
}
function main()
{
	CreateMenu();
	build_tree();
	//render._renderHeight = window.innerHeight - 50;
	render._renderWidth = window.innerWidth - 200;
	//render._renderTopMargin = 50;
	render._renderLeftMargin = 200;
	render.init();
	var job_material = render.newPart("job_material");
	job_material.internal = true;
	var border_meta = render.copy_obj(render._crosshairMeta);
	border_meta.color = "red";
	job_material.entities.push({ type: "line", origin: [0, 0], end: [job_options.material_size.width, 0], meta: render.copy_obj(border_meta)});
	job_material.entities.push({ type: "line", origin: [job_options.material_size.width, 0], end: [job_options.material_size.width, job_options.material_size.height], meta: render.copy_obj(border_meta)});
	job_material.entities.push({ type: "line", origin: [job_options.material_size.width, job_options.material_size.height], end: [0, job_options.material_size.height], meta: render.copy_obj(border_meta)});
	job_material.entities.push({ type: "line", origin: [0, job_options.material_size.height], end: [0, 0], meta: render.copy_obj(border_meta)});
	render.Stack.push(job_material);
	animate();
	//render.mouse_over_check = function() {};
	render.mouse_click_check = function() {};
	render.mouse_drag_check = function(drag)
	{
		//console.log(drag);
		var part_to_move = 1000;
		for (var x = 0; x < render.Stack.length; x++)
      	{
			var part = render.Stack[x];
			if (part.hidden == false)
			{
				for (var y = 0; y < part.entities.length; y++)
				{
					var entity = part.entities[y];
					if (entity.meta.mouse_over == true)
					{
						part_to_move = x;
					}
				}
			}
		}
		if (part_to_move < 1000 && part_to_move < render.Stack.length)
		{
			render.Stack[part_to_move].offset[0] += drag.relative.x;
			render.Stack[part_to_move].offset[1] += drag.relative.y;
			render.Stack[part_to_move].updateRender = true;
		}
	};
}
$( document ).ready(function() {
    main();
});
setInterval(function(){
	style_tree();
}, 100);
