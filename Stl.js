/*******************************************************************************
  Stl

  Reads STL files into a data structure
  Utilizes the StlReader

  Usage:

  datadink.io.Stl.fromBlob(file)
    .then(data => console.log(data));

*******************************************************************************/

(function() {

  class Stl extends Array {
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

  Stl.Solid = class extends Array {
    constructor(reader) {
      super();
      var facet;
      this.name = reader.name;
      while (facet = reader.nextFacet()) {
        this.push(new Stl.Solid.Facet(facet));
      }
    }
  }

  Stl.Solid.Facet = class extends Array {
    constructor(reader) {
      super();
      var vert;
      this.normal = reader.normal;
      while (vert = reader.nextVert()) {
        this.push(new Stl.Solid.Facet.Vert(vert));
      }
    }
  }

  Stl.Solid.Facet.Vert = class extends Array {
    constructor(reader) {
      super(reader.x, reader.y, reader.z);
      this.x = reader.x;
      this.y = reader.y;
      this.z = reader.z;
    }
  }

  this.datadink = this.datadink || {};
  this.datadink.io = this.datadink.io || {};
  this.datadink.io.Stl = Stl;
})();
