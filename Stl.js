/*******************************************************************************
  Stl

  Reads STL files into a data structure
  Utilizes the StlReader

  Usage:

  var stl = new datadink.Stl(reader);

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
      super(new Stl.Solid(reader.nextSolid()));
    }

    static Solid = class extends Base {
      constructor(reader) {
        super();
        this.name = reader.name;
        var facet;
        while (facet = reader.nextFacet()) {
          this.push(new Stl.Solid.Facet(facet));
        }
      }

      static Facet = class extends Base {
        constructor(reader) {
          super(
            new Stl.Solid.Facet.Vert(reader.nextVert()),
            new Stl.Solid.Facet.Vert(reader.nextVert()),
            new Stl.Solid.Facet.Vert(reader.nextVert())
          );
        }
        get edges() { return [
          [this[0], this[1]],
          [this[1], this[2]],
          [this[2], this[0]],
        ]; }

        static Vert = class extends Base {
          constructor(reader) {
            super(reader.x, reader.y, reader.z);
          }

          get x() { return this[0]; }
          get y() { return this[1]; }
          get z() { return this[2]; }

          compare(vert) {
            return vert.every((v,i) => this[i] === v);
          }
        }
      }
    }
  };

  this.datadink = this.datadink || {};
  this.datadink.Stl = Stl;
})();
