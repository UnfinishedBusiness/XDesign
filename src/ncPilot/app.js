const electron = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
var MotionControlPort;
var MDITerminal;
var MDILineBuffer;
var $ = require('jquery');
var fs = require('fs');
let DxfParser = require('dxf-parser');
let DxfWriter = require('dxf-writer');
var editor = null;
var gcodeView = new GcodeView();
var GcodeLines = [];
const Interpreter = require('gcode-interpreter');

const Workbench = "ncPilot";
var WorkOffset = { x: 0, y: 0};
var MachinePosition = { x: 0, y: 0};
var MotionControllerStack = [];
var AltKeyDown = false;

function MDITerminal_Init()
{
	Terminal.applyAddon(fullscreen);
	MDITerminal = new Terminal({ allowTransparency: true });
  MDITerminal.open(document.getElementById('terminal'));
	MDITerminal.toggleFullScreen(true);
	$("#terminal").css({'opacity': 0.7}).css({'position': 'absolute'});
  MDITerminal.write(PS1);
	MDILineBuffer = "";
	MDITerminal.on('key', (key, ev) => {
        //console.log("Keycode: " + key.charCodeAt(0) + " Key: " + key);
        if (key.charCodeAt(0) == 13)
				{
					MDITerminal.write('\n\r');
					MDITerminal_Eval(MDILineBuffer);
					MDILineBuffer = "";
				}
				else if (key.charCodeAt(0) == 127)
				{
					if (MDILineBuffer.length > 0)
					{
							MDITerminal.write('\b \b');
							MDILineBuffer = MDILineBuffer.substring(0, MDILineBuffer.length - 1);
					}
				}
				else if (key.charCodeAt(0) == 3) //control-c
				{
					MDITerminal.write('\n\r');
					MDITerminal_Eval("control-c");
					MDILineBuffer = "";
				}
				else if (key.charCodeAt(0) == 9) //tab
				{
					MDITerminal_Eval("tab-complete");
				}
				else if (key.charCodeAt(0) == 27 && key.includes("A")) //up arrow
				{
					MDITerminal_Eval("up-arrowkey");
				}
				else if (key.charCodeAt(0) == 27 && key.includes("B")) //down arrow
				{
					MDITerminal_Eval("down-arrowkey");
				}
				else if (key.charCodeAt(0) == 27 && key.includes("C")) //Left arrow
				{

				}
				else if (key.charCodeAt(0) == 27 && key.includes("D")) //Left arrow
				{

				}
				else
				{
					MDITerminal.write(key);
					MDILineBuffer += key;
				}
	});
	$("#terminal").hide();
}
function MDITerminal_Show()
{
	$("#terminal").show();
	MDITerminal.focus();
}
function MDITerminal_Hide()
{
	$("#terminal").hide();
}
function TextEditor_Show()
{
	$("#editor").show();
}
function TextEditor_Hide()
{
	$("#editor").hide();
}
function TextEditor_EditGcode()
{
	editor.setValue(GcodeLines.join("\n"));
	editor.clearSelection();
	$("#editor").show();
}
function TextEditor_SaveGcode()
{
	GcodeLines = editor.getValue().split("\n");
	gcodeView.Stack = [];
	const runner = new Runner();
	runner.loadFromString(GcodeLines.join("\n"));
}
function TextEditor_Init()
{
	editor = ace.edit("editor");
  editor.setTheme("ace/theme/twilight");
  editor.session.setMode("ace/mode/gcode");
	$("#editor").hide();
}
function MotionController_Init()
{
	var util = require("util"), repl = require("repl");

	SerialPort.list(function (err, ports) {
	  ports.forEach(function(port) {
			console.log("Port = " + port.comName + " pnpId= " + port.pnpId + " manufacturer= " + port.manufacturer);
			if (port.comName == machine_parameters.com_port)
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
					for (var x = 0; x < machine_parameters.startup_lines.length; x++)
					{
						MotionController_Write(machine_parameters.startup_lines[x]);
					}

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
	//console.log("Writing: " + MotionControllerStack[0]);
	MotionControlPort.write(MotionControllerStack[0] + "\n");
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
function MotionController_Checksum(data)
{
	var buf = [];
	var buffer = new Buffer.from(data);
	for (var i = 0; i < buffer.length; i++)
	{
	    buf.push(buffer[i]);
	}
	var checksum = 0;
  var count = buf.length;
	//console.log("count: " + count);
  while (count > 0)
  {
      checksum ^= buf[--count];
			//console.log("XOR: " + checksum);
  }
	return checksum;
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
				gcodeView.CrossHairPosition.x = parseFloat($("#X_WCS_POS").html());
			}
			if (key == "Y_MCS")
			{
				$("#Y_MCS_POS").html(value);
				MachinePosition.y = parseFloat(value);
				$("#Y_WCS_POS").html((MachinePosition.y + WorkOffset.y).toFixed(4));
				gcodeView.CrossHairPosition.y = parseFloat($("#Y_WCS_POS").html());
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
						GcodeLines = [];
						fs.readFile(item, 'utf-8', (err, data) => {
							if(err){
									alert("An error ocurred reading the file :" + err.message);
									return;
							}
							GcodeLines = data.split("\n");
							for (var x = 0; x < GcodeLines.length; x++)
							{
								GcodeLines[x] = GcodeLines[x].replace(/(\r\n\t|\n|\r\t)/gm,"");
							}
							runner.loadFromString(GcodeLines.join("\n"));
						});
					});
        }
    });
}
function KeyUpHandler(e)
{
	//console.log(e);
	if (e.jey == "LeftAlt")
	{
		AltKeyDown = false;
	}
	if (e.key == "ArrowUp" || e.key == "ArrowDown")
	{
		MotionController_Write("M3001 P1\n");
	}
	if (e.key == "ArrowLeft" || e.key == "ArrowRight")
	{
		MotionController_Write("M3001 P0\n");
	}
}
function KeyDownHandler(e)
{
	//console.log(e);
	if (e.key == "Alt")
	{
		AltKeyDown = true;
	}
	if (e.jey == "LeftAlt")
	{
		AltKeyDown = false;
	}
	if (e.key == "ArrowUp")
	{
		MotionController_Write("M3000 P1 S350 D1\n");
	}
	if (e.key == "ArrowDown")
	{
		MotionController_Write("M3000 P1 S350 D-1\n");
	}
	if (e.key == "ArrowLeft")
	{
		MotionController_Write("M3000 P0 S350 D-1\n");
	}
	if (e.key == "ArrowRight")
	{
		MotionController_Write("M3000 P0 S350 D1\n");
	}
	if (e.key == "Escape")
	{
		TextEditor_SaveGcode();
		TextEditor_Hide();
		MDITerminal_Hide();
	}
	if (e.key == "F2" && AltKeyDown == true)
	{
		TextEditor_EditGcode();
	}
	if (e.key == "F1" && AltKeyDown == true)
	{
		MDITerminal_Show();
	}
}
function main()
{
	window.addEventListener('keydown', KeyDownHandler, true);
	window.addEventListener('keyup', KeyUpHandler, true);
	CreateMenu();
	MachineParameters_Init();
	TextEditor_Init();
	MotionController_Init();
	MDITerminal_Init();
	gcodeView.init();
}
$( document ).ready(function() {
    main();
});
