class PartView {

  constructor(options)
  {
    this.View = {};
    this.Stack = [];
  }
	init()
  {

  }
	ZoomIn()
	{

	}
	ZoomOut()
	{

	}
  UpdateMouse(e)
  {

  }
	MouseUp(e)
	{

	}
	MouseDown(e)
	{

	}
	KeyDown(e)
	{

	}
	KeyUp(e)
	{

	}
	panX(p)
	{

	}
	panY(p)
	{

	}
	zoomExtents()
	{

	}
  render()
  {

  }
  drawLine(l)
  {
    var line = {
        type: 'line',
        origin: [l.origin.x, l.origin.y],
        end: [l.end.x, l.end.y]
       };
    this.Stack.push(line);
		//this.render();
  }
  drawCircle(c)
  {
    var circle = {
        type: 'circle',
        origin: [c.origin.x, c.origin.y],
        radius: c.radius
       };
    this.Stack.push(circle);
		//this.render();
  }
  breakLink(obj)
  {
    return JSON.parse(JSON.stringify(obj));
  }
	//Math functions specific to drawing
	offset_selected(dist)
	{
		var Selected = jetcad_tools.getSelected(); //Get Selected in order
		var NewStack = [];
		var distance = dist;
		var direction = false; //Outside
		if (distance < 0) direction = true;
		var distance = Math.abs(distance);
		var model = {};
		model.models = {};
		model.models.drawing = {};
		model.models.drawing.paths = [];
		for (var i = 0; i < Selected.length; i++)
		{
			model.models.drawing.paths.push(Selected[i]);
		}
		//console.log(model);
		var offset = jetcad.MakerJS.model.outline(model, distance, 0, direction);
  	//var offset = jetcad.MakerJS.model.expandPaths(model, distance, 0);
		//console.log(offset);
		for (var model_number in offset.models)
		{
			for (var pathname in offset.models[model_number].paths)
			{
				var offset_path = offset.models[model_number].paths[pathname];
				NewStack.push(offset_path);
			}
		}

		return NewStack;
	}
	polarToCartesian(centerX, centerY, radius, angleInDegrees) {
		var angleInRadians = (angleInDegrees) * Math.PI / 180.0;

		return {
			x: centerX + (radius * Math.cos(angleInRadians)),
			y: centerY + (radius * Math.sin(angleInRadians))
		};
	}

	describeArc(x, y, radius, startAngle, endAngle){
			//console.log("Arc - x: " + x + " y: " + y + " radius: " + radius + " startAngle: " + startAngle + " endAngle: " + endAngle);
			var end = this.polarToCartesian(x, y, radius, startAngle);
			var start = this.polarToCartesian(x, y, radius, endAngle);

			var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

			var d = [
					"M", start.x.toFixed(4), start.y.toFixed(4),
					"A", radius.toFixed(4), radius.toFixed(4), 0, arcSweep, 0, end.x.toFixed(5), end.y.toFixed(4)
			].join(" ");

			return d;
	}
	to_radians(degrees)
	{
  	return degrees * Math.PI / 180;
	}
	to_degrees(radians)
	{
  	return radians * 180 / Math.PI;
	}
	midpoint(p1, p2)
	{
  	return {x: (p1.x+p2.x)/2, y:  (p1.y+p2.y)/2};
	}
	distance(p1, p2)
	{
		return Math.sqrt( Math.pow((p1.x-p2.x), 2) + Math.pow((p1.y-p2.y), 2));
	}
	get_line_angle(p1, p2)
	{
		var angle = this.to_degrees(Math.atan2(p1.y - p2.y, p1.x - p2.x));
		angle += 180;
		if (angle >= 360) angle -= 360;
		return angle;
	}
	get_all_intersections(e)
	{
    return;
		var Intersections = [];
		for (var i = 0; i < jetcad.Stack.length; i++)
		{
			var int = jetcad.MakerJS.path.intersection(jetcad.Stack[i], e);
			if (int)
			{
				Intersections.push(int);
			}
		}
		return Intersections;
	}
	get_intersection(l1, l2)
	{
		var int = this.MakerJS.path.intersection(l1, l2);
		if (int)
		{
			return int.intersectionPoints[0];
		}
		else
		{
			return int;
		}
	}
	rotate_line(p1, p2, origin, angle)
	{
		var line1 = new this.MakerJS.paths.Line([p1.x, p1.y], [p2.x, p2.y]);
		var paths = [this.MakerJS.path.rotate(line1, angle, [origin.x, origin.y])];
		return paths[0];
	}
	rotate_point(p, origin, angle)
	{
		var radians = (Math.PI / 180) * angle,
    cos = Math.cos(radians),
    sin = Math.sin(radians),
    nx = (cos * (p.x - origin.x)) + (sin * (p.y - origin.y)) + origin.x,
    ny = (cos * (p.y - origin.y)) - (sin * (p.x - origin.x)) + origin.y;
		return { x: nx, y: ny };
	}
	get_line_at_angle(origin, angle, distance)
	{
		var new_endpoint = { x: origin.x + (Math.abs(distance) * Math.cos(this.to_radians(angle))), y: origin.y + (Math.abs(distance) * Math.sin(this.to_radians(angle))) };
  	return { type: 'line', origin: [origin.x, origin.y], end: [new_endpoint.x, new_endpoint.y] };
	}
	mirror_point_about_line(p, p0, p1)
	{
     var dx, dy, a, b, x, y;
     dx = p1.x - p0.x;
     dy = p1.y - p0.y;
     a = (dx * dx - dy * dy) / (dx * dx + dy * dy);
     b = 2 * dx * dy / (dx * dx + dy * dy);
     x = a * (p.x - p0.x) + b * (p.y - p0.y) + p0.x;
     y = b * (p.x - p0.x) - a * (p.y - p0.y) + p0.y;
     return { x:x, y:y };
  }
	CircleCenterFromThreePoints(A,B,C)
	{
    var yDelta_a = B.y - A.y;
    var xDelta_a = B.x - A.x;
    var yDelta_b = C.y - B.y;
    var xDelta_b = C.x - B.x;

    var center = [];

    var aSlope = yDelta_a / xDelta_a;
    var bSlope = yDelta_b / xDelta_b;

    center.x = (aSlope*bSlope*(A.y - C.y) + bSlope*(A.x + B.x) - aSlope*(B.x+C.x) )/(2* (bSlope-aSlope) );
    center.y = -1*(center.x - (A.x+B.x)/2)/aSlope +  (A.y+B.y)/2;
    return center;


	}
	//Export & Import Functions
	CubicBezierToLines(control_points, smoothing)
	{
		//console.log(control_points);
		var points = control_points.map(function(vec){
        return new THREE.Vector2(vec[0], vec[1]);
     });
		var interpolatedPoints = [];
		var curve = new THREE.SplineCurve(points);
    interpolatedPoints = curve.getPoints( Math.round( control_points.length * smoothing ) );

		var points = interpolatedPoints.map(function(vec){
        return vec.C;
     });
		return interpolatedPoints;
	}
	ImportDXF(data, ret_stack)
	{
		var imported_stack = [];
		var parser = new DxfParser();
		try {
				var dxf = parser.parseSync(data);

				console.log(dxf);
				for (var i = 0; i < dxf.entities.length; i++)
				{
					if (dxf.entities[i].type == "CIRCLE")
					{
						imported_stack.push({ type: "circle", origin: [dxf.entities[i].center.x, dxf.entities[i].center.y], radius: dxf.entities[i].radius });
					}
					else if (dxf.entities[i].type == "LINE")
					{
						imported_stack.push({ type: "line", origin: [dxf.entities[i].vertices[0].x, dxf.entities[i].vertices[0].y], end: [dxf.entities[i].vertices[1].x, dxf.entities[i].vertices[1].y] });
					}
					else if (dxf.entities[i].type == "ARC")
					{
						imported_stack.push({ type: "arc", origin: [dxf.entities[i].center.x, dxf.entities[i].center.y], startAngle: this.to_degrees(dxf.entities[i].startAngle), endAngle: this.to_degrees(dxf.entities[i].endAngle), radius: dxf.entities[i].radius });
					}
					else if (dxf.entities[i].type == "SPLINE") //Not the propper way to draw splines
					{
						if (dxf.entities[i].degreeOfSplineCurve == 3)
						{
							var control_points = [];
							for (var x = 0; x < dxf.entities[i].controlPoints.length; x++)
							{
								control_points.push(dxf.entities[i].controlPoints[x].x);
								control_points.push(dxf.entities[i].controlPoints[x].y);
								//control_points.push([dxf.entities[i].controlPoints[x].x, dxf.entities[i].controlPoints[x].y]);
							}
							var curve = new Bezier(control_points);
							try {
								var arcs = curve.arcs(0.1);
								for (var x = 0; x < arcs.length; x++)
								{
									imported_stack.push({ type: "arc", origin: [arcs[x].x, arcs[x].y], radius: arcs[x].r, startAngle: this.to_degrees(arcs[x].s), endAngle: this.to_degrees(arcs[x].e) });
								}
							}
							catch(err) {
									//When arc approximation fails, revert to line approximation!

									var points = curve.getLUT(100);
									for (var x = 1; x < points.length; x++)
									{
										var origin = points[x - 1];
										var end = points[x];

										imported_stack.push({ type: "line", origin: [origin.x, origin.y], end: [end.x, end.y] });
									}
									//console.log(err);
							}
						}
						else
						{
							notification.push("Only cubic splines are supported right now!");
						}
					}
					else if (dxf.entities[i].type == "LWPOLYLINE")
					{
						for (var x = 1; x < dxf.entities[i].vertices.length; x++)
						{
							var origin = dxf.entities[i].vertices[x - 1];
							var end = dxf.entities[i].vertices[x];
							if (dxf.entities[i].vertices[x - 1].bulge === undefined) imported_stack.push({ type: "line", origin: [origin.x, origin.y], end: [end.x, end.y] });
						}
						if (dxf.entities[i].vertices[dxf.entities[i].vertices.length - 1].bulge === undefined) imported_stack.push({ type: "line", origin: [dxf.entities[i].vertices[0].x, dxf.entities[i].vertices[0].y], end: [dxf.entities[i].vertices[dxf.entities[i].vertices.length - 1].x, dxf.entities[i].vertices[dxf.entities[i].vertices.length - 1].y] });

						//Sort Bulges out
						for (var x = 0; x < dxf.entities[i].vertices.length - 1; x++)
						{
							if (dxf.entities[i].vertices[x].bulge !== undefined)
							{
								var bulgeStart = dxf.entities[i].vertices[x];
								var bulgeEnd = dxf.entities[i].vertices[x + 1];
								var midpoint = this.midpoint(bulgeStart, bulgeEnd);
								var distance = this.distance(bulgeStart, midpoint);
								var sagitta = dxf.entities[i].vertices[x].bulge * distance;
								//console.log(sagitta);
								if (sagitta < 0)
								{
									var bulgeLine = this.get_line_at_angle(midpoint, this.get_line_angle(bulgeStart, bulgeEnd) + 90, sagitta);
									var arc_center = this.CircleCenterFromThreePoints(bulgeStart, {x: bulgeLine.end[0], y: bulgeLine.end[1] }, bulgeEnd);
									var arc_endAngle = this.get_line_angle(arc_center, bulgeStart);
									var arc_startAngle = this.get_line_angle(arc_center, bulgeEnd);
									imported_stack.push({ type: 'arc', origin: [arc_center.x, arc_center.y], radius: this.distance(arc_center, bulgeStart), startAngle: arc_startAngle, endAngle: arc_endAngle });
								}
								else
								{
									var bulgeLine = this.get_line_at_angle(midpoint, this.get_line_angle(bulgeStart, bulgeEnd) - 90, sagitta);
									var arc_center = this.CircleCenterFromThreePoints(bulgeStart, {x: bulgeLine.end[0], y: bulgeLine.end[1] }, bulgeEnd);
									var arc_startAngle = this.get_line_angle(arc_center, bulgeStart);
									var arc_endAngle = this.get_line_angle(arc_center, bulgeEnd);
									imported_stack.push({ type: 'arc', origin: [arc_center.x, arc_center.y], radius: this.distance(arc_center, bulgeStart), startAngle: arc_startAngle, endAngle: arc_endAngle });
								}

							}
						}
						if (dxf.entities[i].vertices[dxf.entities[i].vertices.length - 1].bulge !== undefined)
						{
							var bulgeStart = dxf.entities[i].vertices[0];
							var bulgeEnd = dxf.entities[i].vertices[dxf.entities[i].vertices.length - 1];
							var midpoint = this.midpoint(bulgeStart, bulgeEnd);
							var distance = this.distance(bulgeStart, midpoint);
							var sagitta = dxf.entities[i].vertices[dxf.entities[i].vertices.length - 1].bulge * distance;
							//console.log(sagitta);
							if (sagitta > 0)
							{
								var bulgeLine = this.get_line_at_angle(midpoint, this.get_line_angle(bulgeStart, bulgeEnd) + 90, sagitta);
								var arc_center = this.CircleCenterFromThreePoints(bulgeStart, {x: bulgeLine.end[0], y: bulgeLine.end[1] }, bulgeEnd);
								var arc_endAngle = this.get_line_angle(arc_center, bulgeStart);
								var arc_startAngle = this.get_line_angle(arc_center, bulgeEnd);
								imported_stack.push({ type: 'arc', origin: [arc_center.x, arc_center.y], radius: this.distance(arc_center, bulgeStart), startAngle: arc_startAngle, endAngle: arc_endAngle });
							}
							else
							{
								var bulgeLine = this.get_line_at_angle(midpoint, this.get_line_angle(bulgeStart, bulgeEnd) - 90, sagitta);
								var arc_center = this.CircleCenterFromThreePoints(bulgeStart, {x: bulgeLine.end[0], y: bulgeLine.end[1] }, bulgeEnd);
								var arc_startAngle = this.get_line_angle(arc_center, bulgeStart);
								var arc_endAngle = this.get_line_angle(arc_center, bulgeEnd);
								imported_stack.push({ type: 'arc', origin: [arc_center.x, arc_center.y], radius: this.distance(arc_center, bulgeStart), startAngle: arc_startAngle, endAngle: arc_endAngle });
							}
						}

					}
					else if (dxf.entities[i].type == "POLYLINE")
					{
						for (var x = 1; x < dxf.entities[i].vertices.length; x++)
						{
							var origin = dxf.entities[i].vertices[x - 1];
							var end = dxf.entities[i].vertices[x];

							imported_stack.push({ type: "line", origin: [origin.x, origin.y], end: [end.x, end.y] });
						}
					}
					else
					{
						notification.push(dxf.entities[i].type + " - Not Supported Yet");
					}
				}

		}catch(err) {
				return console.error(err.stack);
		}
		if (ret_stack)
		{
			console.log("Returning stack!");
			return imported_stack;
		}
		else
		{
			for (var i = 0; i < imported_stack.length; i++)
			{
				this.Stack.push(imported_stack[i]);
			}
		}
    jetcad_tools.RemoveDuplicates(); //This is a dirty fix, need to figure out what the real issue is!!
	}
  ImportSVG_NF(data, ret_stack) //Not finished, holds the key to importing svg with path data...
  {
    var svg  = jQuery.parseHTML(data);
    console.log(svg);
    var path = svg[0].innerHTML;
    console.log(path);
    //var data = path.getAttribute('d');
    var model_stack = jetcad.MakerJS.importer.fromSVGPathData(path);
    console.log(model_stack);
    var imported_stack = [];
    //First import lines
    for (var line_paths in model_stack.paths)
		{
      var path_object = model_stack.paths[line_paths];
			imported_stack.push(path_object);
		}
    //Import arc that are converted from Bezier lines
    for (var arc_paths in model_stack.models)
		{
      var model_object = model_stack.models[arc_paths];
      for (var arc in model_object.paths)
      {
        var arc_object = model_object.paths[arc];
        imported_stack.push(arc_object);
      }
		}
    if (ret_stack)
		{
			console.log("Returning stack!");
			return imported_stack;
		}
		else
		{
      jetcad.Stack = [];
			for (var i = 0; i < imported_stack.length; i++)
			{
				jetcad.Stack.push(imported_stack[i]);
			}
		}
  }
  ImportSVG(data, ret_stack) //Not finished, holds the key to importing svg with path data...
  {
    var svg  = jQuery.parseHTML(data);
    console.log(svg);
    var nodes = svg[0].children;
    console.log(nodes);

    var imported_stack = [];
    for (var x = 0; x < nodes.length; x++)
		{
      var type = nodes[x].tagName;
      if (type == "circle")
			{
				imported_stack.push({ type: "circle", origin: [parseFloat(nodes[x].attributes.cx.value), parseFloat(nodes[x].attributes.cy.value)], radius: parseFloat(nodes[x].attributes.r.value) });
			}
			else if (type == "line")
			{
				imported_stack.push({ type: "line", origin: [parseFloat(nodes[x].attributes.x1.value), parseFloat(nodes[x].attributes.y1.value)], end: [parseFloat(nodes[x].attributes.x2.value), parseFloat(nodes[x].attributes.y2.value) ] });
			}
		}

    if (ret_stack)
		{
			console.log("Returning stack!");
			return imported_stack;
		}
		else
		{
      jetcad.Stack = [];
			for (var i = 0; i < imported_stack.length; i++)
			{
				jetcad.Stack.push(imported_stack[i]);
			}
		}
  }
	ExportSVG()
	{
		return this.MakerJS.exporter.toSVG(this.Model);
	}
	ExportDXF()
	{
    var DxfModel = {};
    DxfModel.paths = [];
    for (var x = 0; x < this.Stack.length; x++)
    {
      var e = JSON.parse(JSON.stringify(this.Stack[x]));
      if (e.type == "line")
      {
        e.origin[0] = e.origin[0].toFixed(6);
        e.origin[1] = e.origin[1].toFixed(6);
        e.end[0] = e.end[0].toFixed(6);
        e.end[1] = e.end[1].toFixed(6);
        DxfModel.paths.push(e);
      }
      if (e.type == "arc" && e.startAngle.toFixed(6) != e.endAngle.toFixed(6))
      {
        e.origin[0] = e.origin[0].toFixed(6);
        e.origin[1] = e.origin[1].toFixed(6);
        e.radius = e.radius.toFixed(6);
        e.startAngle = e.startAngle.toFixed(6);
        e.endAngle = e.endAngle.toFixed(6);
        DxfModel.paths.push(e);
      }
      if (e.type == "circle")
      {
        e.origin[0] = e.origin[0].toFixed(6);
        e.origin[1] = e.origin[1].toFixed(6);
        e.radius = e.radius.toFixed(6);
        DxfModel.paths.push(e);
      }
    }
		return this.MakerJS.exporter.toDXF(DxfModel);
	}
}
