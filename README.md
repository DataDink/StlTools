#StlReader.js
-------------
A forward-only STL document reader

By DataDink (https://github.com/datadink)

Supports: ASCII, Binary

##Usage:
```javascript
var file = document.getElementById('file-input').files[0];
var fileReader = StlReader.fromFile(file);

var buffer = (new FileReader()).readAsArrayBuffer(file);
var bufferReader = StlReader.fromBuffer(buffer);

var view = new DataView(buffer, 0);
var viewReader = StlReader.fromView(view);
```

-------------------------------------------------------------------------------------------

```javascript
var reader = StlReader.fromFile(file);
var object = reader.next();
while(object !== false) {
  var objectName = object.name;
  var facet = object.next();
  while (facet !== false) {
    var facetNormal = facet.normal;
    var face = facet.next();
    while (face !== false) {
      var vertex = face.next();
      while (vertex !== false) {
        var vertexCoordinates = vertex.coordinates;
        var vertex = face.next();
      }
      face = facet.next();
    }
    var facet = object.next();
  }
  var object = reader.next();
}
```
