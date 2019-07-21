var mdi_commands = [
	{ cmd: "clear", run: function(args){ MDITerminal.clear(); ret(); } },
	{ cmd: "exit", run: function(args){ MDITerminal_Hide(); } },
	{ cmd: "eval", run: function(args){ eval_command(args); } },
	{ cmd: "set", run: function(args){ eval_command(args); } },
	{ cmd: "tail", run: function(args){ tail(args); } },
	{ cmd: "list_ports", run: function(args){ list_ports(); } },
	{ cmd: "dump_parameters", run: function(args){ dump_parameters(); } },
	{ cmd: "connect", run: function(args){ MotionController_Init(); ret(); } },
	{ cmd: "control-c", run: function(args){ printf("Terminating!\n"); } },
	{ cmd: "tab-complete", run: function(args){ printf("Tab complete!\n"); } },
	{ cmd: "up-arrowkey", run: function(args){ printf("Up arrow!\n"); } },
	{ cmd: "down-arrowkey", run: function(args){ printf("Down arrow!\n"); } },
];
function ret()
{
	MDITerminal.write('\rMDI> ');
}
function printf(stdout)
{
	MDITerminal.write(stdout);
}
function dump_parameters()
{
	printf(JSON.stringify(machine_parameters));
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
			return;
		}
	}
	//If we didn't find a command in the command stack, we must be meant for the motion controller
	if (MotionControlPort != undefined)
	{
		MotionController_Write(cmd_buffer);
	}
	else
	{
		printf("Motion Controller is not connected!\n");
		ret();
	}
}
