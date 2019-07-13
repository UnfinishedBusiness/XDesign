function appendWorkbenchMenu(menu)
{
  const {remote} = require('electron');
  const {Menu, MenuItem} = remote;
  menu.append(new MenuItem ({
    label: 'Workbench',
		submenu: [
			{ label: 'JetCad',
			click: function() {
				NewDrawing();
			}},
			{ label: 'JetCam',
			click: function() {
				OpenDrawing();
			}},
			{ label: 'ncPilot',
			click: function() {
				SaveDrawingAs();
			}}
		]
 }));
}
