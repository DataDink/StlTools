/*******************************************************************************
  Slice

  Reads an STL and creates a collection of 2 dimensional regions along the
  Z axis of the model
  Utilizes the StlReader

  Usage:

  var slice = new datadink.Slice(reader, layerHeight[, precision])

*******************************************************************************/

(function() {
  class Slice {
    constructor(reader, step = 0.2, precision = 6) {

      var mstart = new Date().valueOf();
      var mapdata = Slice.map(reader, step, precision);
      this.mapTime = (new Date().valueOf() - mstart) / 1000;
      this.report = mapdata.report;
      this.map = mapdata.map;

      var lstart = new Date().valueOf();
      this.layers = Slice.layers(this.map);
      this.layersTime = (new Date().valueOf() - lstart) / 1000;

      var bstart = new Date().valueOf();
      this.bounds = Slice.bounds(this);
      this.boundsTime = (new Date().valueOf() - bstart) / 1000;
    }

    static map(reader, step, precision) {
      // in theory this creates: { z: { x: { y: [{x,y},{x,y}] } } }
      // z,x,y map of connecting x/y points on the same layer
      var solid, facet, map = {}, precision = Math.pow(10,precision);
      var normalize = n => (Math.round(precision*n)/precision)||0; // combat floating point errors
      while (solid = reader.nextSolid()) {
        while (facet = solid.nextFacet()) { // Slicing facet by facet
          var verts = [
            facet.nextVert(),
            facet.nextVert(),
            facet.nextVert()
          ].sort((a,b) => a.z<b.z?-1:1);
          if (verts[0].z!=verts[1].z||verts[1].z!=verts[2].z) { // Ignore perfectly flat facets. The not-flat facets connecting to them will create the regions we care about.
            var bot = normalize(Math.ceil(verts[0].z/step)*step, precision); // The bottom layer of this facet
            var top = verts[2].z; // The top layer of this facet
            var a = [verts[0],  verts[2]], b; // The "tall" edge of this facet
            for (var z = bot; z <= top; z = normalize(z + step)) {
              map[z]=map[z]||{};
              b = verts[0].z===verts[1].z||verts[1].z!==verts[2].z&&z>verts[1].z // The correct "short" edge to slice
                ? [verts[1], verts[2]]
                : [verts[0], verts[1]];
              [a,b].map(l => { // Create the slice of the facet at Z
                var f = ((z-l[0].z)/(l[1].z-l[0].z))||0;
                return {
                  x: normalize((l[1].x-l[0].x)*f+l[0].x, precision),
                  y: normalize((l[1].y-l[0].y)*f+l[0].y, precision)
                }
              }).forEach((p,i,a) => { // Add the slice to the mapping
                ((map[z][p.x]=map[z][p.x]||{})
                  [p.y]=map[z][p.x][p.y]||[])
                    .push(a[1-i]);
              });
            }
          }
        }
      }
      return {
        report: Slice.cleanMap(map),
        map: map
      };
    }

    static cleanMap(map) {
      var debug = {
        branches: [],
        terminations: [],
        faults: []
      };
      Array.from(Object.keys(map)).map(k => parseFloat(k))
        .forEach(z => Array.from(Object.keys(map[z])).map(k => parseFloat(k))
          .forEach(x => Array.from(Object.keys(map[z][x])).map(k => parseFloat(k))
            .forEach(y => {
              var connections = map[z][x][y] = map[z][x][y]
                .filter(v => v.x!=x||v.y!=y)
                .reduce((c,v) => c.some(vv => vv.x==v.x&&vv.y==v.y)?c:(c.push(v)&&c||c), []);
              if (connections.length > 2) { debug.branches.push({x: x, y: y, z: z, connections: connections}); }
              if (connections.length < 2) { debug.terminations.push({x: x, y: y, z: z, connections: connections}); }
              connections
                .filter(v => !map[z][v.x][v.y])
                .forEach(v => debug.faults.push({x: x, y: y, z: z, fault: v}));
            })
          )
        );
      return debug;
    }

    static layers(map) {
      var layers = Array.from(Object.keys(map))
        .map(k => parseFloat(k))
        .sort((a,b) => a>b?1:-1)
        .map(z => { return {
            layer: z,
            map: map[z],
            regions: Array.from(Object.keys(map[z]))
              .map(k => parseFloat(k))
              .flatMap(x => Array.from(Object.keys(map[z][x]))
                .map(k => { return {x: x, y: parseFloat(k)}; })
              ).reduce((regions, start) => {
                if (regions.some(r => r.path.some(v => v.x==start.x&&v.y==start.y))) {
                  return regions;
                }
                regions.push(...Slice.trace(map[z], [], start)
                  .map(p => { return {
                    path: p,
                    bounds: p.reduce((b,v) => {
                      b.left = ('left' in b)?Math.min(b.left, v.x):v.x;
                      b.right = ('right' in b)?Math.max(b.right, v.x):v.x;
                      b.back = ('back' in b)?Math.min(b.back, v.y):v.y;
                      b.front = ('front' in b)?Math.max(b.front, v.y):v.y;
                      return b;
                    }, {})
                  }; })
                );
                return regions;
              }, [])
        };});
        Slice.cleanLayers(layers);
        return layers;
    }

    static trace(map, path, start) {
      var branches = [path = Array.from(path||[])], available;
      var next=start, last=path[path.length-1]||start;
      do {
        path.push(next);
        available = map[next.x][next.y]
          .filter(v => v.x!=last.x||v.y!=last.y);
        last = next;
        next = available[0];
        for (var i = 1; path.length > 1 && i < available.length; i++) {
          branches.push(...Slice.trace(map, path, available[i]));
        }
      } while (next && !path.some(v => next.x==v.x&&next.y==v.y));
      if (next) { // reduce to the connecting points
        while(path[0].x!=next.x||path[0].y!=next.y) { path.shift(); }
      } // Otherwise this is a broken loop so leave the whole thing
      return branches.filter(b => b.length);
    }

    static cleanLayers(layers) {
      var regionFilter = (region, i, regions) =>
        region.path.some(v =>
          !regions.some((r,ii) =>
            ii>i&&r.path.some(vv =>
              v.x==vv.x&&v.y==vv.y
            )
          )
        );
      layers.forEach(layer => {
        layer.regions = layer.regions
          .sort((a,b) => a.path.length>b.path.length?-1:1)
          .filter(regionFilter)
          .sort((a,b) => a.path.length>b.path.length?1:-1)
          .filter(regionFilter);
      });
    }

    static bounds(slice) { // Itterates all verts to determine the bounds of the entire slice
      return slice.layers
        .reduce((bounds, layer) => {
          bounds.bottom = ('bottom' in bounds)?Math.min(bounds.bottom, layer.layer):layer.layer;
          bounds.top = ('top' in bounds)?Math.max(bounds.top, layer.layer):layer.layer;
          layer.regions.forEach(region => {
            bounds.left = ('left' in bounds)?Math.min(bounds.left, region.bounds.left):region.bounds.left;
            bounds.right = ('right' in bounds)?Math.max(bounds.right, region.bounds.right):region.bounds.right;
            bounds.back = ('back' in bounds)?Math.min(bounds.back, region.bounds.back):region.bounds.back;
            bounds.front = ('front' in bounds)?Math.max(bounds.front, region.bounds.front):region.bounds.front;
          });
          return bounds;
        }, {});
    }
  }

  this.datadink = this.datadink || {};
  this.datadink.Slice = Slice;
})();
