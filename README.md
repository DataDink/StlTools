# StlReader.js
-------------
It reads STL files

By DataDink (https://github.com/datadink)

Supports: ASCII, Binary

## Usage:

```javascript
  var input = document.querySelector('input[type=file]');
  input.addEventListener('change', e => {
    datadink.io.StlReader.fromBlob(e.target.files[0])
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
  });  
```

# Stl.js
-------------
It reads STL files

By DataDink (https://github.com/datadink)

Supports: ASCII, Binary

## Usage:

```javascript
  var input = document.querySelector('input[type=file]');
  input.addEventListener('change', e => {
    datadink.io.Stl.fromBlob(e.target.files[0])
      .then(stl => {
        console.log('Solids:', stl.length);
        console.log('Facets:', stl.flatMap(s => s).length);
        console.log('Verts:', stl.flatMap(s => s.flatMap(f => f)).length);
      });
  });
```

# Slice.js
-------------
It slices STL files (like for a 3d printer)

By DataDink (https://github.com/datadink)

## Usage:

```javascript
  var input = document.querySelector('input[type=file]');
  input.addEventListener('change', e => {
    var layerHeight = 0.2;
    var reader = datadink.io.StlReader.fromBlob(e.target.files[0])
    var slice = new datadink.Slice(reader, layerHeight);
    console.log("Seconds: ", slice.mapTime + slice.layersTime);
    console.log("Report: ", slice.report);
    console.log("Size: ", slice.bounds);
    console.log("Layers: ", slice.layers.length);
    console.log("Regions: ", slice.layers.flatMap(l => l.regions).length);
  });
```
