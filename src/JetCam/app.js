const electron = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
var $ = require('jquery');
var fs = require('fs');
let DxfParser = require('dxf-parser');
let DxfWriter = require('dxf-writer');
let ClipperLib = require("../../lib/clipper.js");
const simplify = require("simplify-js");
let navigation;
let fonts;
let render = new ProfileRender();
let part_tree = new PartTree();

const Workbench = "JetCam";
var CurrentFile = null;

var job_options = { material_size: { width: 48, height: 96 } };
var global_working_variables = { selected_part: null };

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
								part_tree.add_parent_part(name, {
									parent_lightbulb_toggle: function() { 
										render.togglePartVisibility(name);
									},
								});
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
function offset_contours(contours, distance, smoothing)
{
	//Clipper does not support floating point math, so we scale!
	var scale = 10000;
	var co = new ClipperLib.ClipperOffset(); // constructor
	var offsetted_paths = new ClipperLib.Paths(); // empty solution
	var formatted_paths = [];
	for (var x = 0; x < contours.length; x++) //Iterate contours
	{
		var path = [];
		for (var i = 0; i < contours[x].length; i++)
		{
			path.push({X: contours[x][i].x * scale, Y: contours[x][i].y * scale});
		}
		formatted_paths.push(path);
	}
	co.Clear();
    co.AddPaths(formatted_paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
    co.ArcTolerance = 0.020;
	co.Execute(offsetted_paths, distance * scale);
	var normalized_offset = [];
	for (var x = 0; x < offsetted_paths.length; x++)
	{
		var path = [];
		var simplified_path = [];
		for (var i = 0; i < offsetted_paths[x].length; i++)
		{
			path.push({x: offsetted_paths[x][i].X / scale, y: offsetted_paths[x][i].Y / scale});
		}
		path.push(path[0]); //Close the contour
		simplified_path = simplify(path, smoothing, true);
		normalized_offset.push(simplified_path);
	}

	/*
		Render the contours to ensure the algorythim is working right
	*/
	for (var x = 0; x < normalized_offset.length; x++)
	{
		var imported_stack = [];
		for (var y = 1; y < normalized_offset[x].length; y++)
		{
			imported_stack.push({ type: "line", origin: [normalized_offset[x][y-1].x, normalized_offset[x][y-1].y], end: [normalized_offset[x][y].x, normalized_offset[x][y].y], meta: render.copy_obj(render._crosshairMeta) });
		}
		var part = render.newPart("offset-" + x);
		part.entities = imported_stack;
		render.Stack.push(part);
	}

	return normalized_offset;
}
function chainify_part(part_index)
{
	var chain_tolorance = 0.005;
	if (render.Stack.length > part_index) //part_index exists
	{
		var random_entities = render.copy_obj(render.Stack[part_index].entities);
		for (var x = 0; x < random_entities.length; x++)
		{
			random_entities[x].origin[0] += render.Stack[part_index].offset[0];
			random_entities[x].origin[1] += render.Stack[part_index].offset[1];
			if (random_entities[x].type == "line")
			{
				random_entities[x].end[0] += render.Stack[part_index].offset[0];
				random_entities[x].end[1] += render.Stack[part_index].offset[1];
			}
		}
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
				random_entities.splice(0, 1);
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
				random_entities.splice(0, 1);
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
		/*
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
		}*/
		return contours;
	}
}
function main()
{
	CreateMenu();
	part_tree.init("part_tree");
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
	/*var geometry = new THREE.PlaneGeometry( 45, 45, 32 );
	var material = new THREE.MeshBasicMaterial( {color: 0x800000, side: THREE.DoubleSide} );
	var plane = new THREE.Mesh( geometry, material );
	plane.position.set(45/2, 45/2, 0);
	render.scene.add( plane );*/
	animate();
	render.mouse_over_check = function() {};
	render.mouse_click_check = function(pos) {
		//console.log(pos);
		for (var x = 0; x < render.Stack.length; x++)
      	{
			var part = render.Stack[x];
			if (part.hidden == false && part.internal == false)
			{
				var extents = {xmin: 1000000, xmax: -1000000, ymin: 1000000, ymax: -1000000};
				for (var y = 0; y < part.entities.length; y++)
				{
					var entity = part.entities[y];
					if (entity.type == "line")
					{
						if (entity.origin[0] < extents.xmin) extents.xmin = entity.origin[0];
						if (entity.origin[0] > extents.xmax) extents.xmax = entity.origin[0];
						if (entity.origin[1] < extents.ymin) extents.ymin = entity.origin[1];
						if (entity.origin[1] > extents.ymax) extents.ymax = entity.origin[1];

						if (entity.end[0] < extents.xmin) extents.xmin = entity.end[0];
						if (entity.end[0] > extents.xmax) extents.xmax = entity.end[0];
						if (entity.end[1] < extents.ymin) extents.ymin = entity.end[1];
						if (entity.end[1] > extents.ymax) extents.ymax = entity.end[1];
					}
					if (entity.type == "circle")
					{
						if (entity.origin[0] < extents.xmin) extents.xmin = entity.origin[0];
						if (entity.origin[0] > extents.xmax) extents.xmax = entity.origin[0];
						if (entity.origin[1] < extents.ymin) extents.ymin = entity.origin[1];
						if (entity.origin[1] > extents.ymax) extents.ymax = entity.origin[1];
						
						if (entity.origin[0] + entity.radius < extents.xmin) extents.xmin = entity.origin[0] + entity.radius;
						if (entity.origin[0] + entity.radius > extents.xmax) extents.xmax = entity.origin[0] + entity.radius;
						if (entity.origin[1] + entity.radius < extents.ymin) extents.ymin = entity.origin[1] + entity.radius;
						if (entity.origin[1] + entity.radius > extents.ymax) extents.ymax = entity.origin[1] + entity.radius;
					}
				}
				//console.log(extents);
				if (pos.x - render.Stack[x].offset[0] > extents.xmin && pos.x - render.Stack[x].offset[0] < extents.xmax && pos.y - render.Stack[x].offset[1] > extents.ymin && pos.y - render.Stack[x].offset[1] < extents.ymax)
				{
					//console.log("Clicked on part " + x);
					global_working_variables.selected_part = x;
				}
			}
		}
	};
	render.mouse_drag_check = function(drag)
	{
		//console.log(drag);
		if (global_working_variables.selected_part == null) return;
		var part_to_move = global_working_variables.selected_part;
		if (part_to_move < render.Stack.length)
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
