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
var GcodeFileName = "";
var WaitingForOkay = false;
const Interpreter = require('gcode-interpreter');

const Workbench = "ncPilot";
var WorkOffset = { x: 0, y: 0};
var MachinePosition = { x: 0, y: 0};
var MotionControllerStack = [];
var AltKeyDown = false;

var SerialTransmissionLog = [];

var ProgramHoldFlag = false;
var ProgramUploaded = false;
var CurrentFocus = "HMI";

function MDITerminal_Init()
{
	Terminal.applyAddon(fullscreen);
	Terminal.applyAddon(webLinks);
  Terminal.applyAddon(fit);
	MDITerminal = new Terminal({
		allowTransparency: true,
		fontFamily: `'Fira Mono', monospace`,
    fontSize: 15,
	});
  MDITerminal.open(document.getElementById('terminal'));
	//MDITerminal.toggleFullScreen(true);
	$("#terminal").css({'opacity': 0.7}).css({'position': 'absolute'}).css({'width': "100%"}).css({'height': "100%"});
	MDITerminal.fit();
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
	CurrentFocus = "MDI";
	$("#terminal").show();
	MDITerminal.focus();
}
function MDITerminal_Hide()
{
	CurrentFocus = "HMI";
	$("#terminal").hide();
}
function TextEditor_Show()
{
	CurrentFocus = "EDIT";
	$("#editor").show();
}
function TextEditor_Hide()
{
	CurrentFocus = "HMI";
	$("#editor").hide();
}
function TextEditor_EditGcode()
{
	TextEditor_Show();
}
function TextEditor_SaveGcode()
{
	var lines = editor.getValue().split("\n");
	GcodeLines = [];
	for (var x = 0; x < lines.length; x++)
	{
		if (lines[x].length > 2)
		{
			GcodeLines.push(lines[x]);
		}
	}
	gcodeView.Stack = [];
	const runner = new Runner();
	runner.loadFromString(GcodeLines.join("\n"));
	if (GcodeFileName != "")
	{
		fs.writeFile(GcodeFileName, GcodeLines.join("\n"),
	    // callback function that is called after writing file is done
	    function(err) {
	        if (err) throw err;
	        // if no error
	        //console.log("Data is written to file successfully.")
	  });
	}
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
	if (buff == "")
	{
		//console.log("Caught empty line!");
		return;
	}
	if (WaitingForOkay == true)
	{
		MotionControllerStack.push(buff);
	}
	else
	{
		SerialTransmissionLog.push("->" + buff);
		MotionControlPort.write(buff + "\r\n");
		WaitingForOkay = true;
	}
}
function MotionController_RecievedOK()
{
	WaitingForOkay = false;
	var send_line = MotionControllerStack.shift();
	if (send_line == "")
	{
		send_line = MotionControllerStack.shift();
	}
	if (send_line == undefined) return;
	if (ProgramHoldFlag == false)
	{
		SerialTransmissionLog.push("->" + send_line);
		MotionControlPort.write(send_line + "\n");
		if (send_line.includes("M30"))
		{
			ProgramUploaded = false; //We can press start again after the program finishes!
		}
	}
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
	SerialTransmissionLog.push("<-" + line);
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
				gcodeView.CrossHairPosition.x = parseFloat($("#X_MCS_POS").html());
			}
			if (key == "Y_MCS")
			{
				$("#Y_MCS_POS").html(value);
				MachinePosition.y = parseFloat(value);
				$("#Y_WCS_POS").html((MachinePosition.y + WorkOffset.y).toFixed(4));
				gcodeView.CrossHairPosition.y = parseFloat($("#Y_MCS_POS").html());
			}
			if (key == "X_WO")
			{
				if (parseFloat(value) != WorkOffset.x)
				{
					WorkOffset.x = parseFloat(value);
					gcodeView.WorkOffset.x = WorkOffset.x;
					$("#X_WCS_POS").html((MachinePosition.x + WorkOffset.x).toFixed(4));
					gcodeView.render(true);
				}
			}
			if (key == "Y_WO")
			{
				if (parseFloat(value) != WorkOffset.y)
				{
					WorkOffset.y = parseFloat(value);
					gcodeView.WorkOffset.y = WorkOffset.y;
					$("#Y_WCS_POS").html((MachinePosition.y + WorkOffset.y).toFixed(4));
					gcodeView.render(true);
				}
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
        },
				'M30': (params) => {
            console.log('Rendering Entities!', params);
							gcodeView.render(true);
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
						GcodeFileName = item;
						fs.readFile(item, 'utf-8', (err, data) => {
							if(err){
									alert("An error ocurred reading the file :" + err.message);
									return;
							}
							GcodeLines = data.split("\n");
							for (var x = 0; x < GcodeLines.length; x++)
							{
								if (GcodeLines[x] != "")
								{
									GcodeLines[x] = GcodeLines[x].replace(/(\r\n\t|\n|\r\t)/gm,"");
								}
							}
							runner.loadFromString(GcodeLines.join("\n"));
							editor.setValue(GcodeLines.join("\n"));
							editor.clearSelection();
						});
					});
        }
    });
}
function KeyUpHandler(e)
{
	if (CurrentFocus == "HMI")
	{
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
}
function KeyDownHandler(e)
{
	if (e.key == "Alt")
	{
		AltKeyDown = true;
	}
	if (e.jey == "LeftAlt")
	{
		AltKeyDown = false;
	}
	if (CurrentFocus == "HMI")
	{
		//console.log(e);
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
	}

	if (e.key == "Escape")
	{
		if (CurrentFocus == "EDIT")
		{
			TextEditor_SaveGcode();
			TextEditor_Hide();
		}
		else if (CurrentFocus == "MDI")
		{
			MDITerminal_Hide();
		}
		else if (CurrentFocus == "HMI")
		{
			ProgramAbort();
		}
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
function SetX_Offset()
{
	MotionController_Write("G92 X0");
}
function SetY_Offset()
{
	MotionController_Write("G92 Y0");
}
function Z_Probe()
{
	MotionController_Write("M2100 S0");
}
function GoHome()
{
	MotionController_Write("M2101 P0 R2"); //Retract torch 3 inches and will turn off torch if it's on
  MotionController_Write("G0 X" + WorkOffset.x + " Y" + WorkOffset.y);
}
function ProgramStart()
{
	if (ProgramHoldFlag == true)
	{
		ProgramHoldFlag = false;
		MotionController_RecievedOK();
		return;
	}
	if (ProgramUploaded == false)
	{
		for (var x = 0; x < GcodeLines.length; x++)
		{
			//console.log("Pushing: " + GcodeLines[x]);
			MotionController_Write(GcodeLines[x]);
		}
		ProgramUploaded = true;
	}
}
function ProgramHold()
{
	ProgramHoldFlag = true;
}
function ProgramAbort()
{
	ProgramUploaded = false;
	ProgramHoldFlag = false;
	MotionControllerStack = [];
	WaitingForOkay = true;
	MotionController_Write("M410");
	MotionController_Write("M2101 P0 R1");
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
