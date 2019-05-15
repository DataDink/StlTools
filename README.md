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
        console.log('Facets:', stl.flat(1).length);
        console.log('Verts:', stl.flat(2).length);
      });
  });
```
