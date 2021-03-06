var machine_parameters = {
  com_port: "COM5",
  machine_extents: { x: 45.5, y: 45.5 },
  machine_axis_invert: { x: 0, y1: 1, y2: 0, z: 0 },
  machine_axis_scale: { x: 1034.5, y: 1034.5, z: 1000 },
  machine_torch_config: { z_rapid_feed: 25, z_probe_feed: 20, floating_head_takeup: 0.1, clearance_height: 2 },
  machine_thc_config: { pin: "A19", comp_vel: 5, filter: 5000, adc_at_zero: 35, adc_at_one_hundred: 650 },
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
