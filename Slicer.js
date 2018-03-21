class Slicer {
  constructor() {
    this.layers = {};
  }

  static fromStl(stl, step) {
    var slicer = new Slicer();
    stl.objects[0].facets
      .map(f => f.verts)
      .forEach(verts => {
        var edges = [[verts[0], verts[1]], [verts[0], verts[2]], [verts[1], verts[2]]];
        var start = Math.min(verts[0].z, verts[1].z, verts[2].z);
        var end = Math.max(verts[0].z, verts[1].z, verts[2].z);
        var index = start - (start%step) + step;

        while (index < end) {
          var layer = slicer.layers[index] ? slicer.layers[index] : (slicer.layers[index] = new Slicer.Layer());
          var coords = [];

          edges.forEach(edge => {
            if (edge[0].z < index && edge[1].z < index) { return; }
            if (edge[0].z > index && edge[1].z > index) { return; }
            var range = edge[1].z - edge[0].z;
            var distance = index - edge[0].z;
            var operand = distance/range;

            coords.push({
              x: (edge[1].x - edge[0].x) * operand + edge[0].x,
              y: (edge[1].y - edge[0].y) * operand + edge[0].y,
              z: index
            });
          });

          while (coords.length) {
            var segment = new Slicer.Segment();
            segment.start = coords.shift();
            segment.end = coords.shift();
            layer.segments.push(segment);
          }

          index += step;
        }
      });

      return slicer;
  }

  toSvg(style) {
    var svgs = [];
    var layers = Object.keys(this.layers).map(k => parseFloat(k)).sort((a, b) => a-b);

    layers.forEach(index => {
      var layer = this.layers[index];
      var segments = Array.from(layer.segments);
      var regions = [];
      var region = [];

      while (segments.length) {
        if (!region.length) { region.unshift(segments.pop()); }
        var prev = region[0];

        var connection = segments.findIndex(p =>
          (p.start.x == prev.start.x && p.start.y == prev.start.y)
          || (p.start.x == prev.end.x && p.start.y == prev.end.y)
          || (p.end.x == prev.end.x && p.end.y == prev.end.y)
        );

        if (connection < 0) {
          if (region.length > 1) { regions.push(region); }
          region = [];
        } else {
          var next = segments[connection];
          segments.splice(next, 1);
          region.unshift(next);
        }

        svgs.push(regions);
      }

      var reduce = (key, method) =>
        svgs.reduce((svga, svgv) =>
          svgv.reduce((rega, regv) =>
            regv.reduce((sega, segv) =>
              Math[method](sega, segv.start[key], segv.end[key]),
              0
            ), 0
          ), 0
        );

      var left = reduce('x', 'min');
      var right = reduce('x', 'max');
      var top = reduce('y', 'min');
      var bottom = reduce('y', 'max');

      return svgs.map(data => {

      });
    });
  }
}

Slicer.Layer = class {
  constructor() {
    this.segments = [];
  }
}

Slicer.Segment = class {
  constructor() {
    this.start = {};
    this.end = {};
  }
}
