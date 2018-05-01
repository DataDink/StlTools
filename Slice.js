class Slice {
  static fromStl(stl, step) {
    var facets = stl.objects[0].facets.map(f => Slice.Facet.fromVerts(f.verts));
    var segments = facets
      .map(f => f.slice(step))
      .reduce((a,v) => a.concat(v), []);
    var layers = Slice.Utilities.calcLayers(segments);
    var slice = new Slice();
    Object.keys(layers).forEach(k => slice[k] = layers[k]);
    return slice;
  }
}

Slice.Vert = class {
  constructor(x,y,z) {
    this.x=x;
    this.y=y;
    this.z=z;
  }
  static fromVert(vert) {
    return new Slice.Vert(vert.x, vert.y, vert.z);
  }
  compare(vert) {
    return this.x==vert.x && this.y==vert.y  && this.z==vert.z;
  }
}

Slice.Edge = class {
  constructor(from,to) {
    this.from = Slice.Vert.fromVert(from);
    this.to = Slice.Vert.fromVert(to);
  }
  compare(edge) {
    return [edge.from,edge.to].every(v1 => [this.from,this.to].some(v2 => v1.compare(v2)));
  }
  flip() {
    return new Slice.Edge(this.to, this.from);
  }
  slice(step) {
    var flat = this.from.z === this.to.z;
    if (flat && !this.from.z%step) { return [this.from, this.to]; }
    if (flat) { return []; }
    var from = Math.min(this.from.z, this.to.z);
    var to = Math.max(this.from.z, this.to.z);
    from = Slice.Utilities.round(from + (from < 0 ? -(from%step) : (step - (from%step))));
    var verts = [];
    for (var z = from; z <= to; z += step) {
      var index = (z-this.from.z)/(this.to.z-this.from.z);
      verts.push(new Slice.Vert(
        Slice.Utilities.round((this.to.x-this.from.x)*index+this.from.x),
        Slice.Utilities.round((this.to.y-this.from.y)*index+this.from.y),
        z
      ));
    }
    return verts;
  }
}

Slice.Facet = class {
  constructor(v1,v2,v3) {
    this.v1 = Slice.Vert.fromVert(v1);
    this.v2 = Slice.Vert.fromVert(v2);
    this.v3 = Slice.Vert.fromVert(v3);
  }
  static fromVerts(verts) {
    return new Slice.Facet(verts[0],verts[1],verts[2]);
  }
  get edges() { return [
    new Slice.Edge(this.v1, this.v2),
    new Slice.Edge(this.v2, this.v3),
    new Slice.Edge(this.v3, this.v1)
  ]; }
  slice(step) {
    var verts = Slice.Utilities.unique(this.edges
      .map(e => e.slice(step))
      .reduce((a,v) => a.concat(v), []),
      (a,b) => a.compare(b)
    );
    var segments = Slice.Utilities
      .unique(verts.map(v => v.z))
      .map(z => verts.filter(v => v.z===z))
      .map(layer => layer.slice(0,-1)
        .map((v,i) => new Slice.Edge(v, layer[i+1]))
      ).reduce((a,v) => a.concat(v), []);
    return Slice.Utilities.unique(segments, (a,b) => a.compare(b));
  }
}

Slice.Utilities = class {
  static calcLayers(edges) {
    var layers = {};
    Slice.Utilities.unique(edges.map(e => e.from.z))
      .forEach(z => {
        var layer = layers[z] = [];
        var segments = edges.filter(e => e.from.z === z);
        while (segments.length) {
          var shape = [segments.pop()];
          while (segments.length) {
            var ends = {from:shape[0].from, to:shape[shape.length-1].to};
            var right = segments.findIndex(e => [e.from,e.to].some(v => v.compare(ends.to)));
            if (right >= 0) {
              shape.push(segments[right].from.compare(ends.to) ? segments.splice(right,1)[0] : segments.splice(right,1)[0].flip());
            }
            var left = segments.findIndex(e => [e.from,e.to].some(v => v.compare(ends.from)));
            if (left >= 0) {
              shape.unshift(segments[left].to.compare(ends.from) ? segments.splice(left,1)[0] : segments.splice(left,1)[0].flip());
            }
            if (left < 0 && right < 0) { break; }
          }
          var verts = shape.map(e => [e.from,e.to]).reduce((a,v) => a.concat(v), []);
          layer.push(Slice.Utilities.unique(verts, (a,b) => a.compare(b)));
        }
      });
    return layers;
  }

  static round(number) { // Floating point correction
    const places = 9;
    return Math.round(Math.pow(10,places)*number)/Math.pow(10,places);
  }

  static unique(array, compare) {
    compare = compare || ((a,b) => a==b);
    return array.reduce((a,v) => a.some(i => compare(i,v)) ? a : a.concat(v), []);
  }
}
