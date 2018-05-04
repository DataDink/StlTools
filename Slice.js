class Slice {
  static fromStl(stl, step) {
    var layers = Slice.Utils.sliceStl(stl, step);
    var slice = new Slice();
    Object.keys(layers)
      .filter(z => layers[z] && layers[z].length)
      .forEach(z => slice[z] = layers[z]);
    return slice;
  }
}

Slice.Utils = class {

  static sliceStl(stl, step) {
    var facets = Slice.Utils.getFacets(stl);
    var zheights = facets.reduce((a,f) => a.concat(f.map(v => v.z)), []);
    var zrange = {
      from: Slice.Utils.offset(Math.min.apply(Math, zheights), step),
      to: Math.max.apply(Math, zheights)
    }

    var layers = {};
    for (var z = zrange.from; z <= zrange.to; z += step) {
      layers[z] = Slice.Utils.sliceLayer(facets, z);
    }
    return layers;
  }

  static getFacets(stl) {
    return stl.objects[0].facets
      .map(f => f.verts.map(v => { return {
        x:Slice.Utils.round(v.x),
        y:Slice.Utils.round(v.y),
        z:Slice.Utils.round(v.z)
      }}))
      .filter(f => f[0].z !== f[1].z || f[0].z !== f[2].z);
  }

  static sliceLayer(facets, z) {
    facets = facets.filter(f => f.some(v => v.z <= z) && f.some(v => v.z >= z));
    var shapes = [];
    while (facets.length) {
      shapes.push(Slice.Utils.sliceShape(facets, facets.pop(), z));
    }
    return shapes.filter(s => s.length > 2);
  }

  static sliceShape(facets, facet, z) {
    var edges = [[facet[0],facet[1]],[facet[1],facet[2]],[facet[2],facet[0]]]
      .filter(e => e.some(v => v.z <= z) && e.some(v => v.z >= z) && !e.every(v => v.z === z));
    var shape = Slice.Utils.sliceEdges(edges, z);
    var sibling = Slice.Utils.extractSibling(edges, facets);
    while (sibling) {
      var segment = Slice.Utils.sliceShape(facets, sibling, z);
      shape = Slice.Utils.connect(shape, segment);
      sibling = Slice.Utils.extractSibling(edges, facets);
    }
    return Slice.Utils.cleanShape(shape);
  }

  static cleanShape(shape) {
    return shape.reduce((a,v1) =>
      Slice.Utils.compareVerts(a[a.length-1], v1)
        ? a
        : a.concat([v1])
    , []);
  }

  static sliceEdges(edges, z) {
    return edges
      .map(e => Slice.Utils.sliceEdge(e, z))
      .reduce((a,v1) => a.some(v2 => Slice.Utils.compareVerts(v1,v2)) ? a : a.concat([v1]), []);
  }

  static sliceEdge(edge, z) {
    var index = Slice.Utils.round((z - edge[0].z) / (edge[1].z - edge[0].z));
    return {
      x: Slice.Utils.round((edge[1].x-edge[0].x)*index+edge[0].x),
      y: Slice.Utils.round((edge[1].y-edge[0].y)*index+edge[0].y),
      z: z
    };
  }

  static extractSibling(edges, facets) {
    var index = facets.findIndex(f =>
      edges.some(e =>
        e.every(v1 =>
          f.some(v2 =>
            Slice.Utils.compareVerts(v1,v2)
          )
        )
      )
    );
    if (index >= 0) { return facets.splice(index,1)[0]; }
  }

  static connect(a, b) {
    for (var i = 0; i < 2; i++) {
      if (Slice.Utils.compareVerts(a[0], b[b.length-1])) { return b.concat(a); }
      if (Slice.Utils.compareVerts(a[a.length-1], b[0])) { return a.concat(b); }
      b.reverse();
    }
    return a;
  }

  static compareEdges(a,b) {
    return a&&b&&a.every(v1 => b.some(v2 => Slice.Utils.compareVert(v1,v2)));
  }

  static compareVerts(a,b) {
    return a&&b&&a.x===b.x&&a.y===b.y&&a.z===b.z;
  }

  static round(value) {
    const precision = 9;
    return Math.round(Math.pow(10,precision)*value)/Math.pow(10,precision);
  }

  static offset(value, to) {
    return Slice.Utils.round(Math.floor(value/to)*to);
  }
}
