/*******************************************************************************
  StlReader

  A forward-parsing stl reader
  For when you don't want up-front parsing

  Usage:
    datadink.io.StlReader.fromBlob(file)
      .then(reader => {
        var solid, facet, vert;
        while (solid = reader.nextSolid()) {
          console.log('Solid:', solid.name);
          while (facet = solid.nextFacet()) {
            console.log('Facet:', facet.normal.x, facet.normal.y, facet.normal.z);
            while (vert = facet.nextVert()) {
              console.log('Vert:', vert.x, vert.y, vert.z);
            }
          }
        }
      });

*******************************************************************************/

(function() {

  class BaseReader {
    constructor(config) {
      var current;
      var depleted = false;
      config.next = () => {
          if (depleted) { return false; }
          if (current) { config.deplete(current); }
          if (!config.parser.next()) { return !(depleted = true); }
          return (current = config.create());
      };
    }
  }

  class StlReader extends BaseReader {
    constructor(parser) {
      var config = {
        parser: parser,
        deplete: current => { while (current.nextFacet()) {} },
        create: () => new StlReader.Solid(parser)
      };
      super(config);
      this.nextSolid = () => config.next();
    }

    static fromBlob(blob) {
      return StlReader.Parsers.pick(blob)
        .then(parser => new StlReader(parser));
    }

    static Solid = class extends BaseReader {
      constructor(parser) {
        var config = {
          parser: parser,
          deplete: current => { while (current.nextVert()) {} },
          create: () => new StlReader.Solid.Facet(parser)
        };
        super(config);
        this.name = parser.content.name;
        this.nextFacet = () => config.next();
      }

      static Facet = class extends BaseReader {
        constructor(parser) {
          var config = {
            parser: parser,
            deplete: () => { },
            create: () => new StlReader.Solid.Facet.Vert(parser)
          };
          super(config);
          this.normal = parser.content;
          this.nextVert = () => config.next();
        }

        static Vert = class {
          constructor(parser) {
            this.x = parser.content.x;
            this.y = parser.content.y;
            this.z = parser.content.z;
          }

          compare(vert) {
            return vert.x == this.x && vert.y == this.y && vert.z == this.z;
          }
        }
      }
    }

    static Parsers = {
      pick: (blob) => {
        return new Promise((resolve, reject) => {
          if (blob.size < 84) { reject('rejected: short file') }
          var reader = new FileReader();
          reader.onload = e => {
            var length = (new DataView(e.target.result, 80)).getUint32(0, true) * 50 + 84;
            var looksLikeAscii = (length !== blob.size);
            if (looksLikeAscii) {
              StlReader.Parsers.Ascii.fromBlob(blob)
                .then(resolve)
                .catch(reject);
            } else {
              StlReader.Parsers.Binary.fromBlob(blob)
                .then(resolve)
                .catch(reject);
            }
          }
          reader.readAsArrayBuffer(blob);
        });
      },

      Ascii: class {
        constructor(content) {
          var parser = /\d+(\.\d+)?(e[-+]\d+)?/gi;
          var buffer = Array.from(content.match(/[^\s].+[^\s]/g));
          this.next = () => {
            while (buffer.length) { // skip junk
              var line = buffer.shift().trim();
              if (line.startsWith('endsolid')) { return false; }
              if (line.startsWith('endfacet')) { return false; }

              if (line.startsWith('solid')) {
                this.content = {
                  name: line.match(/^solid\s+(.+$)/)[1]
                };
                return true;
              }

              if (line.startsWith('facet') || line.startsWith('vertex')) {
                var values = line.match(parser);
                this.content = {
                  x: normalize(parseFloat(values[0] || '0')),
                  y: normalize(parseFloat(values[1] || '0')),
                  z: normalize(parseFloat(values[2] || '0'))
                };
                return true;
              }
            }
            return false;
          };
        }
      },

      Binary: class {
        constructor(buffer, header) {
          var view = new DataView(buffer, 80);
          var vertCount = view.getUint32(0, true) * 3;
          view.position = 4;
          var inSolid = false, inFacet = false, inVert = false, vertIndex = 0;
          this.next = () => {
            if (vertIndex >= vertCount) { return false; }
            if (!inSolid) {
             var name = ((header||'').match(/^(solid\s)?([^\0-\10\14-\37]+)/)||[])[2]||'';
             this.content = { name: name };
             return (inSolid = true);
            }
            if (!inFacet) {
             this.content = StlReader.Parsers.Binary.readVert(view);
             return (inFacet = inVert = true);
            }
            if (!inVert) {
             view.position += 2;
             return (inFacet = false);
            }
            this.content = StlReader.Parsers.Binary.readVert(view);
            if (++vertIndex % 3 == 0) { inVert = false; }
            return true;
          };
        }

        static readVert(view) {
          var vert = {
            x: normalize(view.getFloat32(view.position, true)),
            y: normalize(view.getFloat32(view.position+4, true)),
            z: normalize(view.getFloat32(view.position+8, true))
          };
          view.position += 12;
          return vert;
        }

        static fromBlob(blob) {
          return new Promise((resolve, reject) => {
            var header = blob.slice(0,80);
            var headerReader = new FileReader();
            headerReader.onload = e => {
              var headerContent = e.target.result;
              var reader = new FileReader();
              reader.onload = e => {
                resolve(new StlReader.Parsers.Binary(e.target.result, headerContent));
              };
              reader.readAsArrayBuffer(blob);
            };
            headerReader.readAsText(header);
          });
        }
      }
    }
  }

  // because floating point
  const precision = (10**15);
  function normalize(value) {
    var index = 10**Math.max(0, Math.floor(Math.log10(Math.abs(value))) + 1);
    return Math.floor(value/index*precision)/precision*index;
  }

  this.datadink = this.datadink || {};
  this.datadink.io = this.datadink.io || {};
  this.datadink.io.StlReader = StlReader;
})();
