const electron = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
var $ = require('jquery');
var fs = require('fs');
let DxfParser = require('dxf-parser');
let DxfWriter = require('dxf-writer');
const Workbench = "JetCad3D";
var CurrentFile = null;

var renderer, scene, camera, controls;

function init()
{
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 5000 );
    camera.position.set( 0, 0, 100 );
    camera.lookAt( 0, 0, 0 );
    scene = new THREE.Scene();
    renderer.render( scene, camera );
}
function DrawLine(line)
{
  var material = new THREE.LineBasicMaterial( { color: 0xffffff } );
  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3( line.start.x, line.start.y, line.start.z) );
  geometry.vertices.push(new THREE.Vector3( line.end.x, line.end.y, line.end.z) );
  var line = new THREE.Line( geometry, material );
  scene.add( line );
  return line;
}
function DrawArc(arc)
{
  var curve = new THREE.EllipseCurve(
    arc.center.x, arc.center.y,             // ax, aY
    arc.radius, arc.radius,            // xRadius, yRadius
    arc.startAngle * Math.PI / 180, arc.endAngle * Math.PI / 180, // aStartAngle, aEndAngle
    arc.direction             // aClockwise
  );
  var points = curve.getSpacedPoints( 20 );
  var path = new THREE.Path();
  var geometry = new THREE.Geometry().setFromPoints( points );
  var material = new THREE.LineBasicMaterial( { color : 0xffffff } );
  var line = new THREE.Line( geometry, material );
  scene.add( line );
  return line;
}
function test()
{
  DrawLine({ start: {x: 0, y: 0, z: 0}, end: { x: 10, y: 0, z: 0}});
  DrawArc({ center: { x: 0, y: 0 }, radius: 5, startAngle: 0, endAngle: 90, direction: false });
}
function ParseDXF(data)
{
  var parser = new DxfParser();
  try {
      var dxf = parser.parseSync(data);
      for (var i = 0; i < dxf.entities.length; i++)
      {
        if (dxf.entities[i].type == "CIRCLE")
        {
          //mported_stack.push({ type: "circle", origin: [dxf.entities[i].center.x, dxf.entities[i].center.y], radius: dxf.entities[i].radius });
          DrawArc({ center: { x: dxf.entities[i].center.x, y: dxf.entities[i].center.y }, radius: dxf.entities[i].radius, startAngle: 0, endAngle: 0, direction: true });
        }
        else if (dxf.entities[i].type == "LINE")
        {
          //imported_stack.push({ type: "line", origin: [dxf.entities[i].vertices[0].x, dxf.entities[i].vertices[0].y], end: [dxf.entities[i].vertices[1].x, dxf.entities[i].vertices[1].y] });
          DrawLine({ start: {x: dxf.entities[i].vertices[0].x, y: dxf.entities[i].vertices[0].y, z: dxf.entities[i].vertices[0].z}, end: { x: dxf.entities[i].vertices[1].x, y: dxf.entities[i].vertices[1].y, z: dxf.entities[i].vertices[1].z}});
        }
        else if (dxf.entities[i].type == "ARC")
        {
          //imported_stack.push({ type: "arc", origin: [dxf.entities[i].center.x, dxf.entities[i].center.y], startAngle: this.to_degrees(dxf.entities[i].startAngle), endAngle: this.to_degrees(dxf.entities[i].endAngle), radius: dxf.entities[i].radius });
          DrawArc({ center: { x: dxf.entities[i].center.x, y: dxf.entities[i].center.y }, radius: dxf.entities[i].radius, startAngle: dxf.entities[i].startAngle * 180 / Math.PI, endAngle: dxf.entities[i].endAngle * 180 / Math.PI, direction: false });
        }
      }
  }catch(err) {
      return console.error(err.stack);
  }
}
function animate() {
    renderer.render( scene, camera );
    requestAnimationFrame( animate );
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
function main()
{
	CreateMenu();
	init();
	animate();
}
$( document ).ready(function() {
    main();
});
