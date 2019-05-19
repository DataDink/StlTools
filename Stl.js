/*******************************************************************************
  Stl

  Reads STL files into a data structure
  Utilizes the StlReader

  Usage:

  datadink.io.Stl.fromBlob(file)
    .then(data => console.log(data));

*******************************************************************************/

(function() {

  class Base extends Array {
    constructor() {
      super();
      this.constructor = Array.prototype.constructor;
    }
  }

  class Stl extends Base {
    constructor(reader) {
      super();
      var solid;
      while (solid = reader.nextSolid()) {
        this.push(new Stl.Solid(solid));
      }
    }

    static fromBlob(blob) {
      return datadink.io.StlReader.fromBlob(blob)
        .then(reader => new Stl(reader));
    }
  };

  Stl.Solid = class extends Base {
    constructor(reader) {
      super();
      var facet;
      this.name = reader.name;
      while (facet = reader.nextFacet()) {
        this.push(new Stl.Solid.Facet(facet));
      }
    }
  }

  Stl.Solid.Facet = class extends Base {
    constructor(reader) {
      super();
      var vert;
      this.normal = reader.normal;
      while (vert = reader.nextVert()) {
        this.push(new Stl.Solid.Facet.Vert(vert));
      }
    }
  }

  Stl.Solid.Facet.Vert = class extends Base {
    constructor(reader) {
      super(reader.x, reader.y, reader.z);
    }

    get x() { return this[0]; }
    set x(v) { this[0] = v; }
    get y() { return this[1]; }
    set y(v) { this[1] = v; }
    get z() { return this[2]; }
    set z(v) { this[2] = v; }

    compare(vert) {
      return vert.every((v,i) => this[i] === v);
    }
  }

  this.datadink = this.datadink || {};
  this.datadink.io = this.datadink.io || {};
  this.datadink.io.Stl = Stl;
})();
