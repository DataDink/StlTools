/*******************************************************************************
  Stl

    It reads STL files (both ASCII and Binary)
    ASCII is slow
    Binary is fast

    Example 1:

      var input = document.querySelector('input[type=file]');
      input.addEventListener('change', i => {
        var file = i.target.files[0];
        Stl.fromFile(file).then(stl => {
          console.log(stl.objects[0].facets.length);
        });
      });

    Example 2:

      var content = "solid whatever...";
      var stl = Stl.fromString(content);

*******************************************************************************/

class Stl {
  static fromFile(file) {
    return new Promise((s, e) => {
      var header = new FileReader();
      header.onload = (h) => {
        var isAscii = h.target.result.trim().startsWith('solid');
        var reader = new FileReader();
        reader.onload = (f) => {
          var stl = isAscii
            ? Stl.fromString(f.target.result)
            : Stl.fromBuffer(f.target.result);
          s(stl);
        };
        if (isAscii) { reader.readAsText(file); }
        else { reader.readAsArrayBuffer(file); }
      };

      var snippet = file.slice(0, Math.min(file.size, 100)); // need to read the header, length just needs to be enough to pick up encoding and the word "solid"
      header.readAsText(snippet);
    }).catch(e => console.error(e));
  }

  static fromString(content) {
    return new Stl(new Stl.Parsers.Ascii(content));
  }

  static fromBuffer(buffer) {
    var view = new DataView(buffer);
    return Stl.fromView(view);
  }

  static fromView(view) {
    return new Stl(new Stl.Parsers.Binary(view));
  }

  constructor(parser) {
    this.objects = [new Stl.Object(parser)];
  }
}

Stl.Object = class {
  constructor(parser) {
    this.facets = [];
    while(parser.next()) {
      this.facets.push(new Stl.Facet(parser));
    }
  }
}

Stl.Facet = class {
  constructor(parser) {
    this.normal = new Stl.Vert(parser);
    this.verts = [];
    for (var i = 0; i < 3; i++) {
      parser.next();
      this.verts.push(new Stl.Vert(parser));
    }
  }
}

Stl.Vert = class {
  constructor(parser) {
    this.x = parser.value.x;
    this.y = parser.value.y;
    this.z = parser.value.z;
  }
}

Stl.Parsers = {
  Ascii: class {
    constructor(content) {
      var buffer = content.split(/[\r\n]+/i);
      var regex = /\-?\d+(\.\d+)?/g;

      this.next = () => {
        while (buffer.length) {
          var line = buffer.shift().trim();
          if (line.startsWith('facet') || line.startsWith('vertex')) {
            var numbers = line.match(regex) || [];
            this.value = {
              x: parseFloat(numbers[0] || '0'),
              y: parseFloat(numbers[1] || '0'),
              z: parseFloat(numbers[2] || '0')
            };
            return true;
          }
        }
        return false;
      };
    }
  },

  Binary: class {
    constructor(view) {
      var position = 84;
      var countdown = view.getUint32(80, true);
      var buffer = [];

      this.next = () => {
        var done = countdown == 0 || (!buffer.length && position >= view.byteLength);
        if (done) { return false; }

        if (!buffer.length) {
          for (var i = 0; i < 12; i++) {
            buffer.push(position < view.byteLength ? view.getFloat32(position, true) : 0);
            position += 4;
          }
          position += 2;
          countdown--;
        }

        this.value = {
          x: buffer.length ? buffer.shift() : 0,
          y: buffer.length ? buffer.shift() : 0,
          z: buffer.length ? buffer.shift() : 0
        };
        return true;
      }
    }
  }
}
