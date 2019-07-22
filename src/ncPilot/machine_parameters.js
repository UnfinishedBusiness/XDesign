var machine_parameters = {
  com_port: "COM1",
  machine_extents: { x: 45.5, y: 45.5 },
  startup_lines: [ "G20" ],
};
function MachineParameters_Init()
{
  if (fs.existsSync("machine_parameters.js"))
  {
    fs.readFile("machine_parameters.js", 'utf-8', (err, data) => {
      if(err){
          alert("An error ocurred reading the file :" + err.message);
          return;
      }
      machine_parameters = JSON.parse(data);
      gcodeView.MachineExtents = machine_parameters.machine_extents;
    });
  }
}
function MachineParameters_Save()
{
  fs.writeFile("machine_parameters.js", JSON.stringify(machine_parameters),
    // callback function that is called after writing file is done
    function(err) {
        if (err) throw err;
        // if no error
        //console.log("Data is written to file successfully.")
  });
  MachineParameters_Init();
}
