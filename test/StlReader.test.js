import {McBlob} from './McBlob.js';
import {StlReader} from '../src/StlReader.js';

test('Vert can construct', () => {
  var vert = new StlReader.Vert(1,2,3);
  expect(vert.x).toBe(1);
  expect(vert.y).toBe(2);
  expect(vert.z).toBe(3);
});

test('Facet can construct', () => {
  var facet = new StlReader.Facet(
    new StlReader.Vert(1,2,3), [
      new StlReader.Vert(4,5,6),
      new StlReader.Vert(7,8,9),
      new StlReader.Vert(10,11,12)
    ]
  );
  expect(facet.normal.x).toBe(1);
  expect(facet.normal.y).toBe(2);
  expect(facet.normal.z).toBe(3);
  expect(facet.verts[0].x).toBe(4);
  expect(facet.verts[0].y).toBe(5);
  expect(facet.verts[0].z).toBe(6);
  expect(facet.verts[1].x).toBe(7);
  expect(facet.verts[1].y).toBe(8);
  expect(facet.verts[1].z).toBe(9);
  expect(facet.verts[2].x).toBe(10);
  expect(facet.verts[2].y).toBe(11);
  expect(facet.verts[2].z).toBe(12);
});

function generateFloat() {
  var view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, Math.random());
  return view.getFloat32(0);
}

function generateData(count) {
  return [...new Array(count)]
    .map(() => new StlReader.Facet(
      new StlReader.Vert(generateFloat(), generateFloat(), generateFloat()),
      [
        new StlReader.Vert(generateFloat(), generateFloat(), generateFloat()),
        new StlReader.Vert(generateFloat(), generateFloat(), generateFloat()),
        new StlReader.Vert(generateFloat(), generateFloat(), generateFloat())
      ]
    ));
}

function generateAscii(data) {
  return 'solid name\n' +
    data
      .map(f => [
        ` facet normal ${f.normal.x} ${f.normal.y} ${f.normal.z}`,
        '   outer loop',
        ...f.verts.map(v =>
          `     vertex ${v.x} ${v.y} ${v.z}`
        ),
        '   endloop',
        ' endfacet'
      ].join('\n')).join('\n')
      + '\nendsolid';
}

function generateBinary(data) {
  var bytes = new Uint8Array(new Array(80 + 4 + data.length * 50));
  var view = new DataView(bytes.buffer);
  view.setUint32(80, data.length, true);
  data.forEach((f,i) => {
    var offset = i * 50 + 84;
    view.setFloat32(offset, f.normal.x, true);
    view.setFloat32(offset+4, f.normal.y, true);
    view.setFloat32(offset+8, f.normal.z, true);
    f.verts.forEach((v,ii) => {
      var voffset = ii * 12 + offset + 12;
      view.setFloat32(voffset, v.x, true);
      view.setFloat32(voffset+4, v.y, true);
      view.setFloat32(voffset+8, v.z, true);
    });
  });
  return [...bytes];
}

function generateBlob(data) {
  var bytes = typeof(data) === 'string'
    ? Array.from(data).map(c => c.charCodeAt(0))
    : Array.from(data);
  var chunkCount = 3;
  var chunkLength = Math.ceil(bytes.length/chunkCount);
  var chunks = [...new Array(chunkCount)].map((_, i) => bytes.slice(chunkLength*i, chunkLength*i+chunkLength));
  return new McBlob(chunks);
}

function confirmFile(expected, actual) {
  expect(Array.isArray(expected)).toBe(true);
  expect(Array.isArray(actual)).toBe(true);
  expect(expected == actual).toBe(false);
  expect(actual.length).toBe(expected.length);
  for (var i = 0; i < expected.length; i++) {
    var expectedFacet = expected[i];
    var actualFacet = actual[i];
    expect(expectedFacet instanceof StlReader.Facet).toBe(true);
    expect(actualFacet instanceof StlReader.Facet).toBe(true);
    expect(expectedFacet.normal instanceof StlReader.Vert).toBe(true);
    expect(actualFacet.normal instanceof StlReader.Vert).toBe(true);
    expect(typeof(expectedFacet.normal.x) === 'number').toBe(true);
    expect(typeof(expectedFacet.normal.y) === 'number').toBe(true);
    expect(typeof(expectedFacet.normal.z) === 'number').toBe(true);
    expect(actualFacet.normal.x).toBe(expectedFacet.normal.x);
    expect(actualFacet.normal.y).toBe(expectedFacet.normal.y);
    expect(actualFacet.normal.z).toBe(expectedFacet.normal.z);
    expect(Array.isArray(expectedFacet.verts)).toBe(true);
    expect(Array.isArray(actualFacet.verts)).toBe(true);
    expect(actualFacet.verts.length).toBe(expectedFacet.verts.length);
    expect(actualFacet.verts == expectedFacet.verts).toBe(false);
    for (var j = 0; j < expectedFacet.verts.Length; j++) {
      var expectedVert = expectedFacet.verts[i];
      var actualVert = actualFacet.verts[i];
      expect(expectedVert instanceof StlReader.Vert).toBe(true);
      expect(actualVert instanceof StlReader.Vert).toBe(true);
      expect(typeof(expectedVert.x) === 'number').toBe(true);
      expect(typeof(expectedVert.y) === 'number').toBe(true);
      expect(typeof(expectedVert.z) === 'number').toBe(true);
      expect(actualVert.x).toBe(expectedVert.x);
      expect(actualVert.y).toBe(expectedVert.y);
      expect(actualVert.z).toBe(expectedVert.z);
    }
  }
}

test('Reads ASCII', () => {
  var expected = generateData(5);
  var file = generateBlob(generateAscii(expected));
  var reader = new StlReader(file);
  return reader.readToEnd().then(actual => confirmFile(expected, actual));
});

test('Reads ASCII Single', () => {
  var expected = generateData(1);
  var file = generateBlob(generateAscii(expected));
  var reader = new StlReader(file);
  return reader.readToEnd().then(actual => confirmFile(expected, actual));
});

test('Reads ASCII Empty', () => {
  var expected = generateData(0);
  var file = generateBlob(generateAscii(expected));
  var reader = new StlReader(file);
  return reader.readToEnd().then(actual => confirmFile(expected, actual));
});

test('Reads ASCII No Header', () => {
  var expected = generateData(3);
  var ascii = generateAscii(expected)
    .replace(/^[\s\S]+?facet/i, 'facet');
  var file = generateBlob(ascii);
  var reader = new StlReader(file);
  return reader.readToEnd().then(actual => confirmFile(expected, actual));
});

test('Reads ASCII No Footer', () => {
  var expected = generateData(3);
  var ascii = generateAscii(expected)
    .replace(/[^\d]+$/i, '');
  var file = generateBlob(ascii);
  var reader = new StlReader(file);
  return reader.readToEnd().then(actual => confirmFile(expected, actual));
});

test('Reads ASCII No Header & Footer', () => {
  var expected = generateData(3);
  var ascii = generateAscii(expected)
    .replace(/^[\s\S]+?facet/i, 'facet')
    .replace(/[^\d]+$/i, '');
  var file = generateBlob(ascii);
  var reader = new StlReader(file);
  return reader.readToEnd().then(actual => confirmFile(expected, actual));
});

test('Reads BINARY', () => {
  var expected = generateData(5);
  var file = generateBlob(generateBinary(expected));
  var reader = new StlReader(file);
  return reader.readToEnd().then(actual => confirmFile(expected, actual));
});

test('Reads BINARY Single', () => {
  var expected = generateData(1);
  var file = generateBlob(generateBinary(expected));
  var reader = new StlReader(file);
  return reader.readToEnd().then(actual => confirmFile(expected, actual));
});

test('Reads BINARY Empty', () => {
  var expected = generateData(0);
  var file = generateBlob(generateBinary(expected));
  var reader = new StlReader(file);
  return reader.readToEnd().then(actual => confirmFile(expected, actual));
});
