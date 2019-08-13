var machine_parameters = {
  com_port: "COM5",
  machine_extents: { x: 45.5, y: 45.5 },
  machine_axis_invert: { x: 0, y1: 1, y2: 0, z: 0 },
  machine_axis_scale: { x: 1034.5, y: 1034.5, z: 1000 },
  MachinePosition: {x: 0, y: 0},
  WorkOffset: {x: 0, y: 0},
};
function MachineParameters_Init()
{
  if (fs.existsSync("machine_parameters.json"))
  {
    var buf = fs.readFileSync("machine_parameters.json", 'utf-8');
    machine_parameters = JSON.parse(buf);
  }
}
function MachineParameters_Save()
{
  fs.writeFileSync("machine_parameters.json", JSON.stringify(machine_parameters));
  MachineParameters_Init();
}
