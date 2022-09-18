export class McBlob {
  #chunks = [];
  get length() { return this.#chunks.length; }
  get size() { return this.#chunks.reduce((total, chunk) => total + chunk.length, 0); }
  next() { return this.#chunks.shift(); }
  stream() { return new McBlob.#Stream(this); }
  constructor(chunks) { this.add(chunks); }
  add(chunks) {
    chunks = Array.from(chunks);
    var isNumeric = chunks.every(c => typeof(c) === 'number');
    if (!isNumeric) { return chunks.forEach(c => this.add(c)); }
    var isBytes = chunks.every(c => c >= 0 && c < 256 && c%1 === 0);
    if (!isBytes) { throw 'McBlob.add requires bytes'; }
    this.#chunks.push(new Uint8Array(chunks));
  }
  [Symbol.iterator] = function*() {
    for (var chunk of this.#chunks) {
      for (var byte of chunk) {
        yield byte;
      }
    }
  }
  static #Stream = class Stream {
    #blob;
    constructor(blob) { this.#blob = blob; }
    getReader() { return new McBlob.#Reader(this.#blob); }
  }
  static #Reader = class Reader {
    count = 0;
    #blob;
    constructor(blob) { this.#blob = blob; }
    read() { return new Promise((resolve, reject) => {
      var next = this.#blob.next();
      resolve({
        done: !next,
        chunk: next
      });
    })}
  }
}
