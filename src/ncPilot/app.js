const electron = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
var MotionControlPort;
var $ = require('jquery');
var fs = require('fs');
let DxfParser = require('dxf-parser');
let DxfWriter = require('dxf-writer');

const Workbench = "ncPilot";


function MotionController_Init()
{
	var util = require("util"), repl = require("repl");

	SerialPort.list(function (err, ports) {
	  ports.forEach(function(port) {
	    console.log(port.comName);
	    console.log(port.pnpId);
	    console.log(port.manufacturer);
			if (port.comName == "COM3")
			{
					MotionControlPort = new SerialPort(port.comName, { autoOpen: false })
					MotionControlPort.open(function (err) {
				  if (err) {
				    return console.log('Error opening port: ', err.message)
				  }
				  // Because there's no callback to write, write errors will be emitted on the port:
									// Switches the port into "flowing mode"
					var parser = MotionControlPort.pipe(new Readline({ delimiter: '\n' }));
					parser.on('data', data =>{
					  //console.log('MotionControlPort(read): ', data);
						MotionController_ParseInput(data);
					});
				});
				// The open event is always emitted
				MotionControlPort.on('open', function() {
				  // open logic
				});
			}
	  });
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
			{ label: 'Save'

			},
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
function MotionController_ParseInput(line)
{

}

function main()
{
	CreateMenu();
	MotionController_Init();
}
$( document ).ready(function() {
    main();
});
