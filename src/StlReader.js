/**
*  @class {StlReader} - A forward-reader for STL files supporting binary & ascii
*  @param {Blob} blob - The blob to read from.
*/
export class StlReader {
  #queue;
  #parser;
  constructor(blob) {
    var buffer = new StlReader.#Buffer(blob.stream().getReader());
    this.#queue = StlReader.BinaryParser.isBinary(buffer, blob.size)
      .then(isBinary => this.#parser = isBinary
        ? new StlReader.BinaryParser(buffer)
        : new StlReader.AsciiParser(buffer)
      );
  }
  /**
  * @function next - Reads the next batch of facets from the file
  * @returns {Promise<StlReader.Facet[]>}
  **/
  next() {
    return this.#queue = this.#queue
      .then(() => this.#parser.next());
  }
  /**
  * @function readToEnd - Reads to the end of the file
  * @returns {Promise<StlReader.Facet[]}
  **/
  async readToEnd() {
    var facets = [];
    var chunk;
    do {
      chunk = await this.next();
      facets.push(...chunk);
    } while (chunk.length);
    return facets;
  }
  /**
  * @class {StlReader.Facet} - A collection of verts and a normal describing one facet of an STL
  * @param {StlReader.Vert} normal - The normal of the facet
  * @param {StlReader.Vert[]} verts - The verts of the facet
  **/
  static Facet = class Facet {
    constructor(normal, verts) {
      this.normal = normal;
      this.verts = verts;
    }
  }
  /**
  * @class {StlReader.Vert} - A floating point coordinate
  * @param {Float} x - The x coordinate
  * @param {Float} y - The y coordinate
  * @param {Float} z - The z coordinate
  **/
  static Vert = class Vert {
    constructor(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }
  /**
  * @class {StlReader.BinaryParser} - A forward-reading parser for binary formatted STL files.
  * @param {StlReader.Buffer} buffer - The buffer to be read from.
  **/
  static BinaryParser = class BinaryParser {
    static #Uint32Size = 4;
    static #Float32Size = 4;
    static #HeaderSize = 80;
    static #VertSize = BinaryParser.#Float32Size * 3;
    static #FacetSize = BinaryParser.#VertSize * 4 + 2;
    static #AsciiPrefix = Array.from('solid ').map(c => c.charCodeAt(0));

    #residual = [];
    #buffer;
    constructor(buffer) {
      this.#buffer = buffer;
      this.#buffer.dump(BinaryParser.#HeaderSize + BinaryParser.#Uint32Size);
    }
    async next() {
      var hasMore = await this.#buffer.fill(BinaryParser.#FacetSize);
      var bytes = this.#residual.concat(this.#buffer.read());
      if (bytes.length < BinaryParser.#FacetSize) { return []; }
      var view = new DataView(new Uint8Array(bytes).buffer);
      var facets = [];
      var count = Math.floor(bytes.length/BinaryParser.#FacetSize);
      for (var i = 0; i < count; i++) {
        var position = i*BinaryParser.#FacetSize;
        facets.push(new StlReader.Facet(
          this.#vert(view, position), [
            this.#vert(view, position + BinaryParser.#VertSize),
            this.#vert(view, position + BinaryParser.#VertSize * 2),
            this.#vert(view, position + BinaryParser.#VertSize * 3)
          ]
        ));
      }
      this.#residual = bytes.slice(count*BinaryParser.#FacetSize);
      return facets;
    }
    #vert(view, offset) {
      return new StlReader.Vert(
        view.getFloat32(offset, true),
        view.getFloat32(offset + BinaryParser.#Float32Size, true),
        view.getFloat32(offset + BinaryParser.#Float32Size * 2, true)
      );
    }
    static isBinary(buffer, size) {
      return buffer
        .fill(BinaryParser.#HeaderSize + BinaryParser.#Uint32Size)
        .then(() => buffer.peek())
        .then(chunk => {
          if (this.#AsciiPrefix.every((b,i) => b === chunk[i])) { return false; }
          var facetCount = new DataView(new Uint8Array(chunk).buffer).getUint32(BinaryParser.#HeaderSize, true);
          return size === facetCount * BinaryParser.#FacetSize + BinaryParser.#HeaderSize + BinaryParser.#Uint32Size;
        });
    }
  }
  /**
  * @class {StlReader.AsciiParser} - A forward-reading parser for ASCII formatted STL files.
  * @param {StlReader.Buffer} buffer - The buffer to be read from.
  **/
  static AsciiParser = class AsciiParser {
    static #LineTerminators = Array.from('\n\r').map(c => c.charCodeAt(0));
    static #VertParser = /(?:^|\n)(?:\s*)(?:facet(?:\s+normal)?|vertex)(?:\s+)(?<v1>-?\d\S*)(?:\s+)(?<v2>-?\d\S*)(?:\s+)(?<v3>-?\d\S*)\s*(?=\n)/gi;

    #verts = [];
    #residual = '';
    #buffer;
    constructor(buffer) { this.#buffer = buffer; }
    async next() {
      var facets = [];
      var content = this.#residual;
      while (!facets.length) {
        var eof = !(await this.#buffer.fillUntil(b => AsciiParser.#LineTerminators.indexOf(b) !== -1));
        content += String.fromCharCode(...this.#buffer.read()) + (eof ? '\n' : '');
        var matches = [...content.matchAll(AsciiParser.#VertParser)];
        if (!matches.length && eof) { return []; }
        if (!matches.length) { continue; }
        var lastMatch = matches[matches.length - 1];
        this.#residual = content.substr(lastMatch.index + lastMatch[0].length);
        this.#verts.push(
          ...matches
            .map(m => new StlReader.Vert(
              parseFloat(m.groups.v1),
              parseFloat(m.groups.v2),
              parseFloat(m.groups.v3)
            ))
        );
        while (this.#verts.length >= 4) {
          facets.push(new StlReader.Facet(
            this.#verts.shift(), [
              this.#verts.shift(),
              this.#verts.shift(),
              this.#verts.shift()
            ]
          ));
        }
      }
      return facets;
    }
  }
  /**
  * @class {StlReader.Buffer} - Facade for working with ReadableStreamReaders
  * @param {ReadableStreamReader} source - A ReadableStreamReader
  **/
  static #Buffer = class Buffer {
    #source;
    #bytes = [];
    constructor(source) { this.#source = source; }
    async fill(count) {
      while(count > this.#bytes.length) {
        var {done, chunk} = await this.#source.read();
        if (done) { return false; }
        this.#bytes = this.#bytes.concat([...chunk]);
      }
      return true;
    }
    async fillUntil(condition) {
      var chunk = this.#bytes;
      while(!chunk.some(condition)) {
        var {done, chunk} = await this.#source.read();
        if (done) { return false; }
        this.#bytes = this.#bytes.concat([...chunk]);
      }
      return true;
    }
    dump(count) { return this.#bytes.splice(0, count); }
    read() { return this.dump(this.#bytes.length); }
    peek() { return this.#bytes.slice(0, this.#bytes.length); }
  }
}
