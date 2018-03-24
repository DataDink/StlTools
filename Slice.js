class Slice {
  constructor(layers) {
    this.layers = layers;
  }

  static fromStl(stl, step) {
    var segments = Slice.Utilities.getSegments(stl, step);
    var layers = Slice.Utilities.connectSegments(segments);
    return new Slice(layers);
  }
}

Slice.Vert = class {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  matches(vert) {
    return vert.x === this.x && vert.y === this.y && vert.z === this.z;
  }
}

Slice.Segment = class {
  constructor(verta, vertb) { this.v1 = verta; this.v2 = vertb; }
  connects(vert) {
    return this.v1.matches(vert) || this.v2.matches(vert);
  }
}

Slice.Utilities = class {
  static getSegments(stl, step) {
    var layers = {};
    stl.objects[0].facets
      .map(f => f.verts)
      .forEach(verts => {
        var edges = [[verts[0], verts[1]], [verts[0], verts[2]], [verts[1], verts[2]]];
        var start = Math.min(verts[0].z, verts[1].z, verts[2].z);
        var end = Math.max(verts[0].z, verts[1].z, verts[2].z);
        var index = start - (start%step);
        while (index < start) { index += step; }

        while (index < end) {
          var layer = layers[index] ? layers[index] : (layers[index] = []);
          var coords = [];

          edges.forEach(edge => {
            if (edge[0].z < index && edge[1].z < index) { return; }
            if (edge[0].z > index && edge[1].z > index) { return; }
            var bottom = edge[0].z < edge[1].z ? edge[0] : edge[1];
            var top = edge[0].z < edge[1].z ? edge[1] : edge[0];
            var range = top.z - bottom.z;
            var distance = index - bottom.z;
            var operand = distance/range;

            coords.push(new Slice.Vert(
              x: (top.x - bottom.x) * operand + bottom.x,
              y: (top.y - bottom.y) * operand + bottom.y,
              z: index
            ));
          });

          var segments = [];

          while (coords.length > 1) {
            segments.push(new Slice.Segment(
              coords.shift(),
              coords[0]
            ));
          }

          if (segments.length > 1) {
            segments.push(new Slice.Segment(
              segments[segments.length-1].v2,
              segments[0].v1
            ));
          }

          segments.forEach(layer.push.bind(layer));

          index += step;
        }
      });
    return layers;
  }

  static connectSegments(segments) {
    var layers = {};
    var keys = Object.keys(segments).map(k => parseFloat(k)).sort((a,b) => a-b);
    keys.forEach(index => {
      var layer = segments[index];
      var regions = [];
      var region = [];

      while (layer.length) {
        if (!region.length) {
          var init = layer.shift();
          region.push(init[0]);
          region.push(init[1]);
        }

        var connection = -1;
        for (var i = 0; connection < 0 && i < 2 && region.reverse(); i++) {
          var connection = layer.findIndex(s => s.connects(region[0]));
        }

        if (connection < 0) {
          if (!region[0].matches(region[region.length - 1])) {
            region.push(region[0]);
          }
          if (regions.length > 3) {
            regions.push(region);
          }
          region = [];
        } else {
          var segment = layer.splice(connection, 1)[0];
          [segment.v1, segment.v2].forEach(vert => {
            if (!vert.matches(region[0])) { region.unshift(vert); }
          });
        }
      }

      layers[index] = regions;
    });

    return layers;
  }
}
