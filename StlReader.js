//////////////////////////////////////////////////////////////////////////////////////////////////////////
//  StlReader.js                                                                                        //
//      A forward-only STL document reader                                                              //
//      By DataDink (https://github.com/datadink)                                                       //
//  Supports: ASCII, Binary                                                                             //
//                                                                                                      //
//  Usage:                                                                                              //
//      var file = document.getElementById('file-input').files[0];                                      //
//      StlReader.fromFile(file).then(reader => {...});                                                 //
//                                                                                                      //
//      var buffer = (new FileReader()).readAsArrayBuffer(file);                                        //
//      var bufferReader = StlReader.fromBuffer(buffer);                                                //
//                                                                                                      //
//      var view = new DataView(buffer, 0);                                                             //
//      var viewReader = StlReader.fromView(view);                                                      //
//                                                                                                      //
//      -------------------------------------------------------------------------------------------     //
//                                                                                                      //
//      StlReader.fromFile(file).then(reader => {                                                       //
//        var object = reader.next();                                                                   //
//        while(object !== false) {                                                                     //
//            var objectName = object.name;                                                             //
//            var facet = object.next();                                                                //
//            while (facet !== false) {                                                                 //
//                var facetNormal = facet.normal;                                                       //
//                var face = facet.next();                                                              //
//                while (face !== false) {                                                              //
//                    var vertex = face.next();                                                         //
//                    while (vertex !== false) {                                                        //
//                        var vertexCoordinates = vertex.coordinates;                                   //
//                        var vertex = face.next();                                                     //
//                    }                                                                                 //
//                    face = facet.next();                                                              //
//                }                                                                                     //
//                var facet = object.next();                                                            //
//            }                                                                                         //
//            var object = reader.next();                                                               //
//        }                                                                                             //
//      });                                                                                             //
//////////////////////////////////////////////////////////////////////////////////////////////////////////

export default class StlReader { // Forward-only STL Document reader
    constructor(parser) {
        this.type = 'file';
        this.next = () => {
            var type = parser();
            if (type === 'solid') { return new StlReader.Solid(parser); }
            parser = () => { return false; }
            return false;
        }
    }

    static fromFile(file) {
        return new Promise((next, error) => {
          try {
            var reader = new FileReader();
            reader.onload = (e) => {
              next(StlReader.fromBuffer(e.target.result));
            }
            reader.readAsArrayBuffer(file);
          } catch (message) {
            error(message);
          }
        });
    }

    static fromBuffer(buffer) {
        var view = new DataView(buffer, 0);
        return StlReader.fromView(view);
    }

    static fromView(view) {
        var reader = new DataViewReader(view, true);
        var header = '';
        while (reader.position < 6) {
          header += String.fromCharCode(reader.getUint8()).toLowerCase();
        }

        var parser = (header === 'solid ')
            ? new Parser.Ascii(reader)
            : new Parser.Binary(reader);

        return new StlReader(parser.next.bind(parser));
    }
}

StlReader.Solid = class { // Solid (object) reader
    constructor(parser) {
        this.type = 'solid';
        this.name = parser();
        this.next = () => {
            var type = parser();
            if (type === 'facet') { return new StlReader.Facet(parser); }
            this.next = () => { return false; }
            return false;
        }
    }
}

StlReader.Facet = class { // Facet (multi-face) reader
    constructor(parser) {
        this.type = 'facet';
        this.normal = {
            i: parser(),
            j: parser(),
            k: parser()
        }
        this.next = () => {
            var type = parser();
            if (type === 'loop') { return new StlReader.Face(parser); }
            this.next = () => { return false; }
            return false;
        }
    }
}

StlReader.Face = class { // Face reader
    constructor(parser) {
        this.type = 'face';
        this.next = () => {
            var type = parser();
            if (type === 'vertex') { return new StlReader.Vertex(parser); }
            this.next = () => { return false; }
            return false;
        }
    }
}

StlReader.Vertex = class { // Vertex reader
    constructor(parser) {
        this.type = 'vertex';
        this.coordinates = {
            x: parser(),
            y: parser(),
            z: parser()
        }
        parser(); // discard vertex closing false
    }
}

class Parser { // Forward-only reading parser
    constructor(reader) {
        this.reader = reader;
        this.buffer = [];
    }

    next() {
        if (!this.buffer.length) { this.loadBuffer(); }
        return this.buffer.shift();
    }

    loadBuffer() {
        this.buffer.push(...this.reader());
    }
}

Parser.Ascii = class extends Parser { // Parses ASCII STL files
    constructor(view) {
        var line = 'solid ';
        var readNext = () => {
            if (view.position >= view.length) { return false; }
            return String.fromCharCode(view.getUint8());
        }
        var readLine = () => {
            var next = readNext();
            while ((next !== false
                    && '\r\n'.indexOf(next) < 0)
                    || line === '') {
                line += next;
                next = readNext();
            }
            var result = line.trim();
            line = '';
            return result === '' ? false : result;
        }
        var parseLine = () => {
            var buffer = [];
            var line = readLine();
            if (line === false || (/^(endsolid|endfacet|endloop)(\s+|$)/i).exec(line)) {
                buffer.push(false);
            } else if ((/^solid\s+|$/i).exec(line)) {
                buffer.push('solid');
                buffer.push(line.replace(/^solid\s*/i, '').trim());
            } else if ((/^facet normal\s+/i).exec(line)) {
                buffer.push('facet');
                var items = line.match(/\-?\d+\.?\d*/gi) || [];
                buffer.push(...items.map(i => parseFloat(i || '0')))
            } else if ((/^outer loop$/i).exec(line)) {
                buffer.push('loop');
            } else if ((/^vertex(\s+|$)/i).exec(line)) {
                buffer.push('vertex');
                var items = line.match(/\-?\d+\.?\d*/gi) || [];
                buffer.push(...items.map(i => parseFloat(i || '0')))
                buffer.push(false);
            }

            var content = buffer;
            buffer = [];
            return content;
        }
        super(readLine);
    }
}

Parser.Binary = class extends Parser { // Parses Binary STL files
    constructor(view) {
        const HeaderLength = 80;
        const FacetLength = 50;

        // Read & discard header
        while (view.position < view.length && view.position < HeaderLength) { view.getUint16(); }
        var facetCount = view.getUint32();

        var buffer = ['solid', 'binary'];
        var readFacet = () => {
            if (facetCount == 0 || view.length - view.position < FacetLength) {
                buffer.push(false); // closes solid & file
            } else {
                buffer.push('facet');
                buffer.push(view.getFloat32(), view.getFloat32(), view.getFloat32());
                buffer.push('loop');
                for (var i = 0; i < 3; i++) {
                    buffer.push('vertex');
                    buffer.push(view.getFloat32(), view.getFloat32(), view.getFloat32());
                    view.getUint16(); // Read & discard attribute
                    buffer.push(false);
                }
                buffer.push(false); // closes loop
                buffer.push(false); // closes facet
            }

            var content = buffer;
            buffer = [];
            return content;
        };

        super(readFacet);
    }
}

class DataViewReader {
  constructor(view, littleEndian) {
    var position = view.byteOffset;
    function inc(x) { position += x; return position - x; }
    this.getPosition = () => { return position; }
    this.getLength = () => { return view.byteLength; }
    this.getUint8 = () => { return view.getUint8(inc(1), littleEndian); }
    this.getInt8 = () => { return view.getInt8(inc(1), littleEndian); }
    this.getUint16 = () => { return view.getUint16(inc(2), littleEndian); }
    this.getInt16 = () => { return view.getInt16(inc(2), littleEndian); }
    this.getUint32 = () => { return view.getUint32(inc(4), littleEndian); }
    this.getInt32 = () => { return view.getInt32(inc(4), littleEndian); }
    this.getFloat32 = () => { return view.getFloat32(inc(4), littleEndian); }
    this.getFloat64 = () => { return view.getFloat64(inc(8), littleEndian); }
  }
  get position() { return this.getPosition(); }
  get length() { return this.getLength(); }
}
