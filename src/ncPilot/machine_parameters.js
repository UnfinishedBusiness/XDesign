var machine_parameters = {
  com_port: "COM1",
  machine_extents: { x: 45.5, y: 45.5 },
  startup_lines: [ "G20" ],
};
function MachineParameters_Init()
{
  if (fs.existsSync("machine_parameters.js"))
  {
    var buf = fs.readFileSync("machine_parameters.js", 'utf-8');
    machine_parameters = JSON.parse(buf);
    gcodeView.MachineExtents = machine_parameters.machine_extents;
  }
}
function MachineParameters_Save()
{
  fs.writeFileSync("machine_parameters.js", JSON.stringify(machine_parameters));
  MachineParameters_Init();
}
