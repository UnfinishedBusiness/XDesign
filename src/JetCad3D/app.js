const electron = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
var $ = require('jquery');
var fs = require('fs');
let DxfParser = require('dxf-parser');
let DxfWriter = require('dxf-writer');
const Workbench = "JetCad3D";
var CurrentFile = null;

var render = new ProfileRender();

function ParseDXF(data)
{
  var parser = new DxfParser();
  try {
      var imported_stack = [];
      var dxf = parser.parseSync(data);
      for (var i = 0; i < dxf.entities.length; i++)
      {
        if (dxf.entities[i].type == "CIRCLE")
        {
          imported_stack.push({ type: "circle", origin: [dxf.entities[i].center.x, dxf.entities[i].center.y], radius: dxf.entities[i].radius, color: render._colorWhite });
        }
        else if (dxf.entities[i].type == "LINE")
        {
          imported_stack.push({ type: "line", origin: [dxf.entities[i].vertices[0].x, dxf.entities[i].vertices[0].y], end: [dxf.entities[i].vertices[1].x, dxf.entities[i].vertices[1].y], color: render._colorWhite });
        }
        else if (dxf.entities[i].type == "ARC")
        {
          imported_stack.push({ type: "arc", origin: [dxf.entities[i].center.x, dxf.entities[i].center.y], startAngle: render.to_degrees(dxf.entities[i].startAngle), endAngle: render.to_degrees(dxf.entities[i].endAngle), radius: dxf.entities[i].radius, color: render._colorWhite });
        }
      }
      var part = { part_name: "DXFPart", offset: [0, 0, 0], entities: imported_stack, meta_data: {}, updateRender: true};
      render.Stack.push(part);
  }catch(err) {
      return console.error(err.stack);
  }
}
function zoom(zoomFactor)
{
  camera.fov *= zoomFactor;
  camera.updateProjectionMatrix();
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
								ParseDXF(data);
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
			{ label: 'New',
			click: function() {
				NewDrawing();
			}},
			{ label: 'Open',
			click: function() {
				OpenDrawing();
			}},
			{ label: 'Import',
			click: function() {
				ImportDrawing();
			}},
			{ label: 'Save',
			click: function() {
				SaveDrawing();
			}},
			{ label: 'Save As',
			click: function() {
				SaveDrawingAs();
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
 appendWorkbenchMenu(menu);
	Menu.setApplicationMenu(menu);
}
function animate()
{
  //render.controls.update();
  requestAnimationFrame ( animate );
  render.renderer.render (render.scene, render.camera);
}
function main()
{
	CreateMenu();
	render.init();
  Terminal_Init();
  animate();
}
$( document ).ready(function() {
    main();
});
