const electron = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
var MotionControlPort;
var $ = require('jquery');
var fs = require('fs');
let DxfParser = require('dxf-parser');
let DxfWriter = require('dxf-writer');
let navigation;
let fonts;
let render = new ProfileRender();

const Workbench = "JetCam";
var CurrentFile = null;

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
			'data': [{
                "id": "p_1",
                    "text": "Base Directory",
                    "state": {
                    "opened": true
                },
                    "children": [{
                    "text": "Sub 1",
                        "id": "sub_1"
                }]
            }],
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
function add_part(name)
{
	var parent = '#';
	var node = { id:name,text:name};
	$('#parts_tree').jstree().create_node(parent, node, 'last');
}
function delete_part(name)
{
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
function main()
{
	CreateMenu();
	build_tree();
	//render._renderHeight = window.innerHeight - 50;
	render._renderWidth = window.innerWidth - 200;
	//render._renderTopMargin = 50;
	render._renderLeftMargin = 200;
	render.init();
	animate();
	render.mouse_over_check = function() {};
	render.mouse_click_check = function() {};
	render.mouse_drag_check = function(drag)
	{
		//console.log(drag);
		render.Stack[1].offset[0] += drag.relative.x;
		render.Stack[1].offset[1] += drag.relative.y;
		render.Stack[1].updateRender = true;
	};
}
$( document ).ready(function() {
    main();
});
setInterval(function(){
	style_tree();
}, 100);
