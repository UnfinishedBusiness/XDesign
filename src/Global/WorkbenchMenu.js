function appendWorkbenchMenu(menu)
{
  const {remote} = require('electron');
  const {Menu, MenuItem} = remote;
  menu.append(new MenuItem ({
    label: 'Workbench',
		submenu: [
			{ label: 'CAD',
			click: function() {
				require('electron').remote.getCurrentWindow().loadFile('../layout/JetCad/JetCad.html');
			}},
			{ label: 'CAM',
			click: function() {
				require('electron').remote.getCurrentWindow().loadFile('../layout/JetCam/JetCam.html');
			}},
			{ label: 'Vectorize',
			click: function() {
				require('electron').remote.getCurrentWindow().loadFile('../layout/ImageScan/ImageScan.html');
			}},
			{ label: 'Machine',
			click: function() {
				require('electron').remote.getCurrentWindow().loadFile('../layout/ncPilot/ncPilot.html');
			}}
		]
 }));
}
