const electron = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const simplify = require("simplify-js");
var MotionControlPort;
var MDITerminal;
var MDILineBuffer;
var $ = require('jquery');
var fs = require('fs');
var editor = null;
let render = new ProfileRender();
var GcodeLines = [];
var GcodeFileName = "";
var WaitingForOkay = false;
var MovesOnStack = 0;
var thc_set_voltage = 0;
const Interpreter = require('gcode-interpreter');

const Workbench = "ncPilot";
var WayPoint = { x: 0, y: 0 };
var MotionControllerStack = [];
var lastSerialWrite = "";
var AltKeyDown = false;

var SerialTransmissionLog = [];
var SerialTransmissionLogSize = 150;

var ProgramHoldFlag = false;
var ProgramUploaded = false;
var CurrentFocus = "HMI";

function map(x, in_min, in_max, out_min, out_max)
{
 return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

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
	//$("#terminal").css({'opacity': 0.7}).css({'position': 'absolute'}).css({'width': "80%"}).css({'height': "100%"});
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
	editor.setValue(GcodeLines.join("\n"));
	editor.clearSelection();
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
	render.removePartFromStack("Gcode");
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
					if (MotionControlPort != null)
					{
						crc_write("invert_dir 0 " + machine_parameters.machine_axis_invert.x);
						crc_write("invert_dir 1 " + machine_parameters.machine_axis_invert.y1);
						crc_write("invert_dir 2 " + machine_parameters.machine_axis_invert.y2);
						crc_write("invert_dir 3 " + machine_parameters.machine_axis_invert.z);
						crc_write("set_scale 0 " + machine_parameters.machine_axis_scale.x);
						crc_write("set_scale 1 " + machine_parameters.machine_axis_scale.y);
						crc_write("set_scale 2 " + machine_parameters.machine_axis_scale.z);
						crc_write("set_torch " + machine_parameters.machine_torch_config.z_rapid_feed + " " + machine_parameters.machine_torch_config.z_probe_feed + " " + machine_parameters.machine_torch_config.floating_head_takeup + " " + machine_parameters.machine_torch_config.clearance_height);
						crc_write("set_thc_config " + machine_parameters.machine_thc_config.pin + " " + machine_parameters.machine_thc_config.filter + " " + machine_parameters.machine_thc_config.comp_vel + " " + machine_parameters.machine_thc_config.adc_at_zero + " " + machine_parameters.machine_thc_config.adc_at_one_hundred);
					}
				});
			}
	  });
	});
}
function crc_write(buff)
{
	buff = buff.replace(/[^ -~]+/g, "");
	var crc = MotionController_Checksum(buff);
	MotionControlPort.write(buff + "*" + crc + "\n");
	lastSerialWrite = buff; //This is resent and logged by read loop if it recieves a crc_fail
}
function MotionController_Write(buff)
{
	if (buff == "")
	{
		//console.log("Caught empty line!");
		return;
	}
	if (WaitingForOkay == true) //If we are waiting for an okay signal, push it to the send stack and send it after we recieve the okay signal
	{
		MotionControllerStack.push(buff);
	}
	else
	{
		var send_line = WorkOffsetTransformation(buff);
		if (SerialTransmissionLog.length > SerialTransmissionLogSize) SerialTransmissionLog.shift(); //Remove the top element in the array so we don't keep creating a longer list
		SerialTransmissionLog.push("->" + buff);
		crc_write(send_line);
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
		var send_line = WorkOffsetTransformation(send_line);
		if (SerialTransmissionLog.length > SerialTransmissionLogSize) SerialTransmissionLog.shift(); //Remove the top element in the array so we don't keep creating a longer list
		if (send_line.includes("M30"))
		{
			ProgramUploaded = false; //We can press start again after the program finishes!
		}
		else //Don't send M30 to controller
		{
			SerialTransmissionLog.push("->" + send_line);
			crc_write(send_line);
		}
	}
}
function WorkOffsetTransformation(send_line)
{
	if (send_line.includes("G0") || send_line.includes("G1"))
	{
		var split = send_line.split(" ");
		for (var x = 0; x < split.length; x++)
		{
			if (split[x].includes("X"))
			{
				var newX = parseFloat(split[x].substring(1));
				newX += machine_parameters.WorkOffset.x;
				split[x] = "X" + newX.toFixed(5);
			}
			if (split[x].includes("Y"))
			{
				var newY = parseFloat(split[x].substring(1));
				newY += machine_parameters.WorkOffset.y;
				split[x] = "Y" + newY.toFixed(5);
			}
		}
		console.log("Before Work Offset: " + send_line);
		send_line = split.join(" ");
		console.log("After Work Offset: " + send_line);
	}
	return send_line;
}
function CreateMenu()
{
	const {remote} = require('electron');
  const {Menu, MenuItem} = remote;

  const menu = new Menu();
  menu.append(new MenuItem ({
    label: 'File',
		submenu: [
			{ label: 'Open Gcode',
			click: function() {
				OpenGcodeFile();
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
	if (line.includes("DRO:") == false)
	{
		if (SerialTransmissionLog.length > SerialTransmissionLogSize) SerialTransmissionLog.shift(); //Remove the top element in the array so we don't keep creating a longer list
		SerialTransmissionLog.push("<-" + line);
	}
	if (line.includes("ok"))
	{
		MovesOnStack = parseFloat(line.split(":")[1]);
		MotionController_RecievedOK();
	}
	else if (line.includes("crc_fail"))
	{
		if (SerialTransmissionLog.length > SerialTransmissionLogSize) SerialTransmissionLog.shift(); //Remove the top element in the array so we don't keep creating a longer list
		SerialTransmissionLog.push("COM_ERROR-> Resending->" + lastSerialWrite);
		crc_write(lastSerialWrite);
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
				$("#X_POS_ABS").html(value);
				machine_parameters.MachinePosition.x = parseFloat(value);
				$("#X_POS").html((machine_parameters.MachinePosition.x - machine_parameters.WorkOffset.x).toFixed(4));
				render.Stack[0].offset[0] = machine_parameters.MachinePosition.x;
				render.Stack[0].updateRender = true;
			}
			if (key == "Y_MCS")
			{
				$("#Y_POS_ABS").html(value);
				machine_parameters.MachinePosition.y = parseFloat(value);
				$("#Y_POS").html((machine_parameters.MachinePosition.y - machine_parameters.WorkOffset.y).toFixed(4));
				render.Stack[0].offset[1] = machine_parameters.MachinePosition.y;
				render.Stack[0].updateRender = true;
			}
			if (key == "FEEDRATE")
			{
				//$("#FEED_Value").html(value);
			}
			if (key == "VELOCITY")
			{
				$("#FEED_RATE").html(value);
			}
			if (key == "THC_SET_VOLTAGE")
			{
				thc_set_voltage = parseFloat(value).toFixed(1);
				$("#SET_VOLTAGE").html(thc_set_voltage + "V");
			}
			if (key == "THC_ARC_VOLTAGE")
			{
				var arc_voltage = parseFloat(value).toFixed(1);
				if (arc_voltage < 1) arc_voltage = 0;
				$("#ARC_VOLTAGE").html(arc_voltage + "V");
			}
			if (key == "UNITS")
			{
				$("#UNITS").html(value);
			}
			if (key == "STATUS")
			{
				$("#STATUS").html(value);
			}
		}
	}
}
var contour_stack = [];
var new_contour = [];
var point = {x: 0, y: 0};
var point_count = 0;
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
						//new_contour.push({x: point.x, y: point.y});
						point_count++;
						contour_stack.push(new_contour); //beggining of new contour
						new_contour = [];
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
						//gcodeView.Stack.push({ type: "line", origin: [last_point.x, last_point.y], end: [point.x, point.y] });
						//imported_stack.push({ type: "line", origin: [last_point.x, last_point.y], end: [point.x, point.y], meta: render.copy_obj(render._defaultMeta) });
						new_contour.push({x: point.x, y: point.y});
						point_count++;
        },
		'M30': (params) => {
			contour_stack.push(new_contour); //beggining of new contour
			var part = render.newPart("Gcode");
			var last_point = {x: 0, y: 0};
			var simplified_point_count = 0;
			imported_stack = [];
			//console.log(contour_stack);
			for (var x = 1; x < contour_stack.length; x++)
			{
				var simplified_path = simplify(contour_stack[x], 0.012, true);
				for (var y = 0; y < simplified_path.length; y++)
				{
					if (y == 0)
					{
						last_point = {x: simplified_path[y].x, y: simplified_path[y].y};
						simplified_point_count++;
					}
					else
					{
						point = {x: simplified_path[y].x, y: simplified_path[y].y};
						imported_stack.push({ type: "line", origin: [last_point.x, last_point.y], end: [point.x, point.y], meta: render.copy_obj(render._defaultMeta) });
						simplified_point_count++;
						last_point = {x: simplified_path[y].x, y: simplified_path[y].y};
					}
				}
			}
			console.log("Simplified path by points by: " + (point_count - simplified_point_count));
			point_count = 0;
			simplified_point_count = 0;
			part.entities = render.copy_obj(imported_stack);
			render.Stack.push(part);
			contour_stack = [];
			for (var x = 0; x < render.Stack.length; x++)
			{
				if (render.Stack[x].part_name == "Gcode")
				{
					render.Stack[x].offset[0] = machine_parameters.WorkOffset.x;
					render.Stack[x].offset[1] = machine_parameters.WorkOffset.y;
					render.Stack[x].updateRender = true;
					break;
				}
			}
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
					render.removePartFromStack("Gcode");
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
						});
					});
        }
    });
}
function SimplifyOpenGcode()
{
	var get_point = function(send_line){
		var ret = {x: 0, y: 0, f: 0};
		var split = send_line.split(" ");
		for (var x = 0; x < split.length; x++)
		{
			if (split[x].includes("X"))
			{
				ret.x = parseFloat(split[x].substring(1));
			}
			if (split[x].includes("Y"))
			{
				ret.y = parseFloat(split[x].substring(1));
			}
			if (split[x].includes("F"))
			{
				ret.f = parseFloat(split[x].substring(1));
			}
		}
		return ret;
	}
	var point = {x: 0, y: 0};
	var contour_stack = [];
	var contour = {set_voltage_line: "", rapid_move_line: "", fire_torch_line: "", points: []};
	for (var x = 0; x < GcodeLines.length; x++)
	{
		var line = GcodeLines[x];
		if (line.includes("set_voltage")) //We are the beginning of a new contour
		{
			contour.set_voltage_line = line;
		}
		if (line.includes("G0")) //We are the beginning of a new contour
		{
			contour.rapid_move_line = line;
		}
		if (line.includes("fire_torch"))
		{
			contour.fire_torch_line = line;
		}
		if (line.includes("G1"))
		{
			contour.points.push(get_point(line));
		}
		if (line.includes("torch_off"))
		{
			contour_stack.push(contour);
			contour = {set_voltage_line: "", rapid_move_line: "", fire_torch_line: "", points: []};
		}
	}
	GcodeLines = [];
	for (var x = 0; x < contour_stack.length; x++)
	{
		if (contour_stack[x].set_voltage_line != "") GcodeLines.push(contour_stack[x].set_voltage_line);
		GcodeLines.push(contour_stack[x].rapid_move_line);
		GcodeLines.push(contour_stack[x].fire_torch_line);
		var num_of_point_before_simplify = contour_stack[x].points.length;
		contour_stack[x].points = simplify(contour_stack[x].points, 0.008, true);
		console.log("Simplified by " + (num_of_point_before_simplify - contour_stack[x].points.length) + " points!");
		for (var y = 0; y < contour_stack[x].points.length; y++) GcodeLines.push("G1 X" + contour_stack[x].points[y].x + " Y" + contour_stack[x].points[y].y + " F" + contour_stack[x].points[y].f);
		GcodeLines.push("torch_off");
	}
	GcodeLines.push("M30");
}
function KeyUpHandler(e)
{
	if (CurrentFocus == "HMI")
	{
		/*if (e.jey == "LeftAlt")
		{
			AltKeyDown = false;
		}
		if (e.key == "ArrowUp" || e.key == "ArrowDown")
		{
			MotionControlPort.write("soft_abort\n");
			jogging_active = false;
		}
		if (e.key == "ArrowLeft" || e.key == "ArrowRight")
		{
			MotionControlPort.write("soft_abort\n");
			jogging_active = false;
		}*/
	}
}
var jogging_active = false;
function KeyDownHandler(e)
{
	//console.log(e);
	if (e.key == "Alt")
	{
		AltKeyDown = true;
	}
	if (e.key == "LeftAlt")
	{
		AltKeyDown = false;
	}
	if (e.code == "Tab")
	{
		if (CurrentFocus == "HMI")
		{
			if (WayPoint.x != 0 && WayPoint.y != 0)
			{
				e.preventDefault();
				//There is a waypoint set. Rapid to it and clear it
				render.removePartFromStack("Waypoint");
				WayPoint.x -= machine_parameters.WorkOffset.x;
				WayPoint.y -= machine_parameters.WorkOffset.y;
				MotionController_Write("G0 X" + WayPoint.x.toFixed(5) + " Y" + WayPoint.y.toFixed(5));
				WayPoint = {x: 0, y: 0};
				
			}
		}
	}
	if (CurrentFocus == "HMI")
	{
		//console.log(e);
		/*if (e.key == "ArrowUp")
		{
			if (jogging_active == false)
			{
				MotionControlPort.write("G0 X" + machine_parameters.MachinePosition.x + " Y45\n");
				jogging_active = true;
			}
		}
		if (e.key == "ArrowDown")
		{
			if (jogging_active == false)
			{
				MotionControlPort.write("G0 X" + machine_parameters.MachinePosition.x + " Y0\n");
				jogging_active = true;
			}
		}
		if (e.key == "ArrowLeft")
		{
			if (jogging_active == false)
			{
				MotionControlPort.write("G0 X0 Y" + machine_parameters.MachinePosition.y + "\n");
				jogging_active = true;
			}
		}
		if (e.key == "ArrowRight")
		{
			if (jogging_active == false)
			{
				MotionControlPort.write("G0 X45 Y" + machine_parameters.MachinePosition.y + "\n");
				jogging_active = true;
			}
		}*/
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
			WayPoint = {x: 0, y: 0};
			render.removePartFromStack("Waypoint");
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
	machine_parameters.WorkOffset.x = machine_parameters.MachinePosition.x;
	$("#X_POS").html((machine_parameters.MachinePosition.x - machine_parameters.WorkOffset.x).toFixed(4));
	for (var x = 0; x < render.Stack.length; x++)
	{
		if (render.Stack[x].part_name == "Gcode")
		{
			render.Stack[x].offset[0] = machine_parameters.WorkOffset.x;
			render.Stack[x].offset[1] = machine_parameters.WorkOffset.y;
			render.Stack[x].updateRender = true;
			break;
		}
	}
	MachineParameters_Save(); //This makes the work offset persistant accross session, even if the controller is reset
}
function SetY_Offset()
{
	machine_parameters.WorkOffset.y = machine_parameters.MachinePosition.y;
	$("#Y_POS").html((machine_parameters.MachinePosition.y - machine_parameters.WorkOffset.y).toFixed(4));
	for (var x = 0; x < render.Stack.length; x++)
	{
		if (render.Stack[x].part_name == "Gcode")
		{
			render.Stack[x].offset[0] = machine_parameters.WorkOffset.x;
			render.Stack[x].offset[1] = machine_parameters.WorkOffset.y;
			render.Stack[x].updateRender = true;
			break;
		}
	}
	MachineParameters_Save(); //This makes the work offset persistant accross session, even if the controller is reset
}
function ProbeZ()
{
	MotionController_Write("probe_z");
}
function GoWorkPos()
{
  	MotionController_Write("G0 X0.00 Y0.00");
}
function GoHome()
{
	MotionController_Write("torch_off");
  	MotionController_Write("G0 X-" + machine_parameters.WorkOffset.x + " Y-" + machine_parameters.WorkOffset.y);
}
function ProgramStart()
{
	crc_write("run"); //Make sure we are in a run state
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
	WaitingForOkay = false;
	crc_write("soft_abort");
}
function ATHC_Minus()
{
	thc_set_voltage = Number(thc_set_voltage) - 5.0;
	crc_write("set_voltage " + thc_set_voltage);
}
function ATHC_Plus()
{
	thc_set_voltage = Number(thc_set_voltage) + 5.0;
	crc_write("set_voltage " + thc_set_voltage);
}
function ATHC_Zero()
{
	thc_set_voltage = 0;
	crc_write("set_voltage " + thc_set_voltage);
}
function ATHC_Hundred()
{
	thc_set_voltage = 100;
	crc_write("set_voltage " + thc_set_voltage);
}
function animate()
{
  //render.controls.update();
  //requestAnimationFrame ( animate );
  setInterval(() => {
	render.renderer.render (render.scene, render.camera);
  }, 150); 
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
	//render._renderHeight = window.innerHeight - 400;
	//render._renderWidth = window.innerWidth - 400;
	//render._renderTopMargin = 300;
	//render._renderLeftMargin = 400;
	render.init();
	var machine_border = render.newPart("machine_boarder");
	machine_border.internal = true;
	var border_meta = render.copy_obj(render._crosshairMeta);
	border_meta.color = "blue";
	machine_border.entities.push({ type: "line", origin: [0, 0], end: [machine_parameters.machine_extents.x, 0], meta: render.copy_obj(border_meta)});
	machine_border.entities.push({ type: "line", origin: [machine_parameters.machine_extents.x, 0], end: [machine_parameters.machine_extents.x, machine_parameters.machine_extents.y], meta: render.copy_obj(border_meta)});
	machine_border.entities.push({ type: "line", origin: [machine_parameters.machine_extents.x, machine_parameters.machine_extents.y], end: [0, machine_parameters.machine_extents.y], meta: render.copy_obj(border_meta)});
	machine_border.entities.push({ type: "line", origin: [0, machine_parameters.machine_extents.y], end: [0, 0], meta: render.copy_obj(border_meta)});
	render.Stack.push(machine_border);

	animate();
	render.mouse_over_check = function() {};
	render.mouse_click_check = function() {
		//console.log("Adding way point to: X" + render.mousePosition.x + " Y" + render.mousePosition.y);
		if (render.mousePosition.x < 0 || render.mousePosition.x > machine_parameters.machine_extents.x || render.mousePosition.y < 0 || render.mousePosition.y > machine_parameters.machine_extents.y )
		{
			return; //Don't do anything because we are out of bounds!
		}
		render.removePartFromStack("Waypoint");
		var waypoint = this.newPart("Waypoint");
		var factor = render.camera.position.z;
		waypoint.entities.push({ type: "circle", origin: [render.mousePosition.x, render.mousePosition.y], radius: factor * 0.005, meta: render.copy_obj(render._liveMeta)});
		waypoint.internal = true;
		render.Stack.push(waypoint);
		WayPoint.x = render.mousePosition.x;
		WayPoint.y = render.mousePosition.y;
	};
	render.mouse_drag_check = function() {};


	window.setInterval(function(){
		if (MotionControlPort == null)
		{
			$("#not_connected_banner").show();
			MotionController_Init();
		}
		else if (MotionControlPort.isOpen == false)
		{
			$("#not_connected_banner").show();
			MotionController_Init();
		}
		else if (MotionControlPort.isOpen == true)
		{
			$("#not_connected_banner").hide();
		}
	}, 1000);
}
$( document ).ready(function() {
    main();
});
