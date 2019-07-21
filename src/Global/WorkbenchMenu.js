function appendWorkbenchMenu(menu)
{
  const {remote} = require('electron');
  const {Menu, MenuItem} = remote;
  menu.append(new MenuItem ({
    label: 'Workbench',
		submenu: [
			{ label: 'JetCad',
			click: function() {
				require('electron').remote.getCurrentWindow().loadFile('../layout/JetCad/JetCad.html');
			}},
      { label: 'JetCad3D',
			click: function() {
				require('electron').remote.getCurrentWindow().loadFile('../layout/JetCad3D/JetCad3D.html');
			}},
			{ label: 'JetCam',
			click: function() {
				require('electron').remote.getCurrentWindow().loadFile('../layout/JetCam/JetCam.html');
			}},
			{ label: 'ImageScan',
			click: function() {
				require('electron').remote.getCurrentWindow().loadFile('../layout/ImageScan/ImageScan.html');
			}},
			{ label: 'ncPilot',
			click: function() {
				require('electron').remote.getCurrentWindow().loadFile('../layout/ncPilot/ncPilot.html');
			}}
		]
 }));
}
