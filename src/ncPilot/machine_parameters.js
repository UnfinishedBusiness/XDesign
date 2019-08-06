var machine_parameters = {
  com_port: "COM3",
  machine_extents: { x: 45.5, y: 45.5 },
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
