const red = "\u001b[31m";
const green = "\u001b[32m"
const blue = "\u001b[34m";
const white = "\u001b[37m";
const reset = "\u001b[0m";
const PS1 = "\r" + red + "MDI" + blue + "> " + reset;
const left_code = "\u001b[{n}C";
const right_code = "\u001b[{n}D";

var mdi_commands = [
	{ description: "Clear Terminal Screen", cmd: "clear", run: function(args){ MDITerminal.clear(); ret(); } },
	{ description: "Close Terminal", cmd: "exit", run: function(args){ MDITerminal_Hide(); ret();} },
	{ description: "Evaluate math expression", cmd: "eval", run: function(args){ eval_command(args); } },
	{ description: "Set machine parameters", cmd: "set", run: function(args){ eval_command(args); } },
	//{ description: "Echo data stream in from Motion Controller", cmd: "tail", run: function(args){ tail(args); } },
	{ description: "List serial ports available", cmd: "list_ports", run: function(args){ list_ports(); } },
	{ description: "Dump machine parameters", cmd: "dump_parameters", run: function(args){ dump_parameters(); } },
	{ description: "Connect to serial port", cmd: "connect", run: function(args){ MotionController_Init(); ret(); } },
	{ description: "Save machine parameters", cmd: "save_parameters", run: function(args){ save_parameters(); } },
	{ description: "Display command history", cmd: "history", run: function(args){ history(); } },
	{ description: "Dump Serial Transmission Log", cmd: "dmesg", run: function(args){ dmesg(); } },
	{ description: "Display this menu", cmd: "help", run: function(args){ help(); } },
	{ special: true, cmd: "control-c", run: function(args){ printf("Terminating!\n"); } },
	{ special: true, cmd: "tab-complete", run: function(args){ tab_complete(args); } },
	{ special: true, cmd: "up-arrowkey", run: function(args){ UpArrow(); } },
	{ special: true, cmd: "down-arrowkey", run: function(args){ DownArrow(); ret();} },
];
var command_history = [];
var command_history_counter = 0;
var command_before_arrow = "";
function ret()
{
	MDITerminal.write(PS1);
}
function printf(stdout)
{
	MDITerminal.write(stdout);
}
function LeftArrow()
{

}
function RightArrow()
{

}
function UpArrow()
{
	if (command_history_counter == 0) command_before_arrow = MDILineBuffer;
	command_history_counter++;
	if (command_history_counter > command_history.length) command_history_counter = command_history.length;
	//console.log("command_history_counter: " + command_history_counter);
	if (command_history[command_history.length - command_history_counter] != undefined)
	{
		printf("\r                                                                        \r");
		printf(PS1 + command_history[command_history.length - command_history_counter]);
		MDILineBuffer = command_history[command_history.length - command_history_counter];
	}
}
function DownArrow()
{
	command_history_counter--;
	if (command_history_counter < 0) command_history_counter = 0;
	//console.log("command_history_counter: " + command_history_counter);
	if (command_history_counter == 0)
	{
		printf("\r                                                                        \r");
		MDILineBuffer = command_before_arrow;
		printf(PS1 + MDILineBuffer);
	}
	else
	{
		printf("\r                                                                        \r");
		printf(PS1 + command_history[command_history.length - command_history_counter]);
		MDILineBuffer = command_history[command_history.length - command_history_counter];
	}
}
function save_parameters()
{
	printf("Saving machine parameters!\n");
	MachineParameters_Save();
	ret();
}
function history()
{
	for (var x = 0; x < command_history.length; x++)
	{
			printf(command_history[x] + "\n\r");
	}
	ret();
}
function help()
{
	for (var x = 0; x < mdi_commands.length; x++)
	{
			if (mdi_commands[x].description != undefined) printf(mdi_commands[x].cmd + " - " + mdi_commands[x].description + "\n\r");
	}
	ret();
}
function tab_complete(args)
{
	//console.log("Tab_Complete: " + MDILineBuffer);
	var search = MDILineBuffer;
	var tools = JSON.parse(JSON.stringify(mdi_commands));
	for (var i = 0; i < tools.length; i++)
	{
		var score = 0;
		for (var x = 0; x < tools[i].cmd.length; x++)
		{
			if (search[x] == tools[i].cmd[x] && tools[i].special == undefined) score += 1;
		}
		tools[i].score = score;
	}
	//console.log(tools);
	var winner = "";
	var bar = 0;
	for (var i = 0; i < tools.length; i++)
	{
		if (tools[i].score > bar)
		{
			bar = tools[i].score;
			winner = tools[i].cmd;
		}
	}
	printf(PS1 + winner);
	MDILineBuffer = winner;
}
function dump_parameters()
{
	printf(JSON.stringify(machine_parameters));
	printf("\n");
	ret();
}
function list_ports()
{
	var util = require("util"), repl = require("repl");
	SerialPort.list(function (err, ports) {
	  ports.forEach(function(port) {
			printf("Port = " + port.comName + "\n\r");
	  });
		ret();
	});
}
function tail(args)
{
	//Show lines recieved from serial input
	if (args.length > 1)
	{

	}
	else
	{
		printf("Must specify level... tail 0 = All data, tail 1 = Only uncought data\n");
	}
	ret();
}
function dmesg(args)
{

	for (var x = 0; x < SerialTransmissionLog.length; x++)
	{
		printf("(" + x + ") " + SerialTransmissionLog[x] + "\n\r");
	}
	ret();
}
function eval_command(args)
{
	args[0] = "";
	var eval_string = args.join(" ");
	printf(eval(eval_string) + "\n");
	ret();
}
function MDITerminal_Eval(cmd_buffer)
{
	//console.log("Command buffer: " + cmd_buffer);
	if (cmd_buffer == "")
	{
		ret();
		return;
	}
	var args = cmd_buffer.split(' ');
	for (var x = 0; x < mdi_commands.length; x++)
	{
		if (mdi_commands[x].cmd == args[0])
		{
			mdi_commands[x].run(args);
			if (mdi_commands[x].special == undefined)
			{
				command_history.push(cmd_buffer);
				command_history_counter = 0;
			}
			return;
		}
	}
	//If we didn't find a command in the command stack, we must be meant for the motion controller
	if (MotionControlPort != undefined)
	{
		//MotionController_Write(cmd_buffer);
		cmd_buffer = WorkOffsetTransformation(cmd_buffer);
		SerialTransmissionLog.push("MDI-> " + cmd_buffer);
		crc_write(cmd_buffer);
		command_history.push(cmd_buffer);
		command_history_counter = 0;
		ret();
	}
	else
	{
		printf("Motion Controller is not connected!\n");
		ret();
	}
}
