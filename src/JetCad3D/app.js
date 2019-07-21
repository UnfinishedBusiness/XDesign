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

function init() {

    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    // scene
    scene = new THREE.Scene();

    // camera
    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.set( 20, 20, 20 );

    // controls
    controls = new THREE.OrbitControls( camera );

		var light = new THREE.HemisphereLight( 0xeeeeee, 0x888888, 1 );
		light.position.set( 0, 20, 0 );
		scene.add( light );

    // axes
    scene.add( new THREE.AxisHelper( 20 ) );

    // geometry
    var geometry = new THREE.SphereGeometry( 5, 12, 8 );

    // material
    var material = new THREE.MeshPhongMaterial( {
        color: 0xff0000,
        shading: THREE.FlatShading,
        polygonOffset: true,
        polygonOffsetFactor: 1, // positive value pushes polygon further away
        polygonOffsetUnits: 1
    } );

    // mesh
    var mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    var geo = new THREE.EdgesGeometry( mesh.geometry ); // or WireframeGeometry
    var mat = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
    var wireframe = new THREE.LineSegments( geo, mat );
    mesh.add( wireframe );

}

function animate() {

    requestAnimationFrame( animate );

    //controls.update();

    renderer.render( scene, camera );

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
