const electron = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
var MotionControlPort;
var $ = require('jquery');
var fs = require('fs');
let DxfParser = require('dxf-parser');
let DxfWriter = require('dxf-writer');
var gcodeView = new GcodeView();
const Interpreter = require('gcode-interpreter');

const Workbench = "ncPilot";
var WorkOffset = { x: 0, y: 0};
var MachinePosition = { x: 0, y: 0};
var MotionControllerStack = [];

function MotionController_Init()
{
	var util = require("util"), repl = require("repl");

	SerialPort.list(function (err, ports) {
	  ports.forEach(function(port) {
			console.log("Port = " + port.comName + " pnpId= " + port.pnpId + " manufacturer= " + port.manufacturer);
			if (port.comName == "/dev/tty.usbmodem58671301")
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
function MotionController_Write(buff)
{
	MotionControllerStack.push(buff);
	if (MotionControllerStack.length == 1) //We are the firt command needing pushed, so don't wait for an okay!
	{
		MotionController_RecievedOK();
	}
}
function MotionController_RecievedOK()
{
	if (MotionControllerStack[0] == undefined) return;
	console.log("Writing: " + MotionControllerStack[0]);
	MotionControlPort.write(MotionControllerStack[0]);
	var tmp = [];
	for (var x = 1; x < MotionControllerStack.length; x++)
	{
		tmp.push(MotionControllerStack.x);
	}
	MotionControllerStack = tmp;
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
	//DRO: X_MCS=9.514 Y_MCS=0.000 Z_MCS=0.000 X_WO=0.000 Y_WO=0.000 Z_WO=0.000 FEEDRATE=59.0 VELOCITY=291.3 THC_SET_VOLTAGE=0.00 THC_ARC_VOLTAGE=1099.57 UNITS=MM STATUS=RUN
	if (line.includes("ok"))
	{
		MotionController_RecievedOK();
	}
	else if (line.includes("DRO:"))
	{
		var dro_line = line.split("DRO: ")[1];
		var dro_pairs = dro_line.split(" ");
		for (var x = 0; x < dro_pairs.length; x++)
		{
			var pair = dro_pairs[x].split("=");
			var key = pair[0];
			var value = pair[1];
			//console.log("key=" + pair[0] + " value=" + pair[1]);
			if (key == "X_MCS")
			{
				$("#X_MCS_POS").html(value);
				MachinePosition.x = parseFloat(value);
				$("#X_WCS_POS").html((MachinePosition.x + WorkOffset.x).toFixed(4));
			}
			if (key == "Y_MCS")
			{
				$("#Y_MCS_POS").html(value);
				MachinePosition.y = parseFloat(value);
				$("#Y_WCS_POS").html((MachinePosition.y + WorkOffset.y).toFixed(4));
			}
			if (key == "X_WO")
			{
				WorkOffset.x = parseFloat(value);
				$("#X_WCS_POS").html((MachinePosition.x + WorkOffset.x).toFixed(4));
			}
			if (key == "Y_WO")
			{
				WorkOffset.y = parseFloat(value);
				$("#Y_WCS_POS").html((MachinePosition.y + WorkOffset.y).toFixed(4));
			}
			if (key == "FEEDRATE")
			{
				$("#FEED_Value").html(value);
			}
			if (key == "VELOCITY")
			{
				$("#VEL_Value").html(value);
			}
			if (key == "THC_SET_VOLTAGE")
			{
				$("#SET_Value").html(value);
			}
			if (key == "THC_ARC_VOLTAGE")
			{
				$("#ARC_Value").html(value);
			}
			if (key == "UNITS")
			{
				$("#UNITS_Value").html(value);
			}
			if (key == "STATUS")
			{
				$("#STATUS_Value").html(value);
			}
		}
	}
}
var last_point = { x: 0, y: 0};
var point = { x: 0, y: 0};
const Runner = function() {
    const handlers = {
        'G0': (params) => {
            //console.log('G0', params);
						if (params.X != undefined)
						{
							point.x = params.X;
						}
						if (params.Y != undefined)
						{
							point.y = params.Y;
						}
						//Plot a rapid line! - Dashed
						last_point = { x: point.x, y: point.y };
        },
        'G1': (params) => {
            //console.log('G1', params);
						if (params.X != undefined)
						{
							point.x = params.X;
						}
						if (params.Y != undefined)
						{
							point.y = params.Y;
						}
						//Plot a line! - Solid
						//console.log("Pushing line: origin> " + last_point.x + ", " + last_point.y + " -> " + " " + point.x + ", " + point.y);
						gcodeView.Stack.push({ type: "line", origin: [last_point.x, last_point.y], end: [point.x, point.y] });
						last_point = { x: point.x, y: point.y };
        }

    };

    return new Interpreter({
        handlers: handlers,
        defaultHandler: (cmd, params) => {
        }
    });
};
function OpenGcodeFile()
{
	const {dialog} = electron.remote;
	dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
    }, function (files) {
        if (files !== undefined) {
					gcodeView.Stack = [];
        	files.forEach(function(item, index, arr){
						console.log("Opening File: " + item);
						const runner = new Runner();
						const file = item;
						// loadFromFile
						runner.loadFromFile(item, function(err, data) { });
					});
        }
    });
}
function KeyUpHandler(e)
{
	//console.log(e);
	if (e.key == "ArrowUp")
	{
		MotionController_Write("M3000 P0 S350 D1\n");
	}
	if (e.key == "ArrowDown")
	{
		MotionController_Write("M3000 P0 S350 D-1\n");
	}
	if (e.key == "ArrowLeft")
	{
		MotionController_Write("M3000 P1 S350 D1\n");
	}
	if (e.key == "ArrowRight")
	{
		MotionController_Write("M3000 P1 S350 D-1\n");
	}
}
function KeyDownHandler(e)
{
	console.log(e);
	if (e.key == "ArrowUp" || e.key == "ArrowDown")
	{
		MotionController_Write("M3001 P0\n");
	}
	if (e.key == "ArrowLeft" || e.key == "ArrowRight")
	{
		MotionController_Write("M3001 P1\n");
	}
}
function main()
{
	window.addEventListener('keydown', KeyDownHandler, true);
	window.addEventListener('keyup', KeyUpHandler, true);
	CreateMenu();
	MotionController_Init();
	gcodeView.init();
}
$( document ).ready(function() {
    main();
});
