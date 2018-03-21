class Slicer {
  constructor() {
    this.layers = {};
  }

  static fromStl(stl, interval) {
    var layers = Slicer.Utilities.sliceLayers(stl, interval);
    return layers;
  }
}

Slicer.Utilities = {
  measure: function(a, b) {
    return Math.sqrt(Math.pow(b.x-a.x)+Math.pow(b.y-a.y));
  },

  sliceLayers: function(stl, interval) {
    var layers = {};
    stl.objects[0].facets.forEach(facet => {
      var edges = Slicer.Utilities.getEdges(facet);
      var start = Math.min(facet.verts[0].z, facet.verts[1].z, facet.verts[2].z);
      var end = Math.max(facet.verts[0].z, facet.verts[1].z, facet.verts[2].z);
      var index = start - (start%interval);
      while (index < start) { index += interval; }

      while (index < end) {
        var coords = [];

        edges.forEach(edge => {
          if (edge[0].z < index && edge[1].z < index) { return; }
          if (edge[0].z > index && edge[1].z > index) { return; }
          coords.push(Slicer.Utilities.sliceEdge(edge, index));
        });
        var segment = Slicer.Utilities.getSegment(coords[0], coords[1], coords[2]);
        var layer = layers[index] || (layers[index] = []);
        layer.push({a: segment[0], b: segment[1], z: index});

        index += interval;
      }
    });
    return layers;
  },

  sliceEdge: function(edge, height) {
    var range = edge[1].z - edge[0].z;
    var distance = height - edge[0].z;
    var operand = distance/range;
    return {
      x: ((edge[1].x - edge[0].x) * operand + edge[0].x) || 0,
      y: ((edge[1].y - edge[0].y) * operand + edge[0].y) || 0,
      z: height
    };
  },

  getEdges: function(facet) {
    return [[facet.verts[0], facet.verts[1]], [facet.verts[0], facet.verts[2]], [facet.verts[1], facet.verts[2]]];
  },

  getSegment: function(a, b, c) {
    if (!c) { return [a, b]; }
    var x = {a: a, b: b, m: Slicer.Utilities.measure(a, b)};
    var y = {a: a, b: c, m: Slicer.Utilities.measure(a, c)};
    var z = {a: b, b: c, m: Slicer.Utilities.measure(b, c)};
    return x.m >= y.m && x.m >= z.m
      ? [x.a, x.b] : y.m >= x.m && y.m >= z.m
      ? [y.a, y.b] : [z.a, z.b];
  }
}
