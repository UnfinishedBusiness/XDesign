# XDesign

Software built ontop of Node.js and Electron to provide front end software for Xmotion CNC plasma cutting machines.

Currently has 4 Workbenches

- [CAD] Uses JetCad's (https://jetcad.io) web cad system. Can import and export DXF files.
- [CAM] In beta, currently can nest parts and post gcode but not ready for full time use
- [Vectorize] Convert a image file to a dxf vector file
- [Machine] Control interface that controls XmotionFirmware

# Known Issues

Currently webgl has an issue where it "loses context" sparatically. It seems to happen more on windows based machines. It causes the Gcode viewer in the Machine workbench to stop working. Other than that, everything is very stable and it's up an running a handful of CNC Plasma cutting machines.
