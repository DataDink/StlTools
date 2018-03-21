# Stl.js
-------------
It reads STL files

By DataDink (https://github.com/datadink)

Supports: ASCII, Binary

## Usage:

Example 1:
```javascript
  var input = document.querySelector('input[type=file]');
  input.addEventListener('change', i => {
    var file = i.target.files[0];
    Stl.fromFile(file).then(stl => {
      console.log(stl.objects[0].facets.length);
    });
  });  
```

Example 2:
```javascript
  var content = "solid whatever...";
  var stl = Stl.fromString(content);
```
