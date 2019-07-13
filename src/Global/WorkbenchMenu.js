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
			{ label: 'JetCam',
			click: function() {
				require('electron').remote.getCurrentWindow().loadFile('../layout/JetCad/JetCam.html');
			}},
			{ label: 'ncPilot',
			click: function() {
				require('electron').remote.getCurrentWindow().loadFile('../layout/ncPilot/ncPilot.html');
			}}
		]
 }));
}
