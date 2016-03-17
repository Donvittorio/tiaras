app.factory('Floor', function(Tiaras, Building) {
  return Tiaras.model(['floor', 'floors'], function(model) {
    model.belongs_to(Building); // requires bus_id, will resolve to /buses/{bus_id}
  });
});

app.factory('Building', function(Tiaras, Floor) {
  return Tiaras.model(['building', 'buildings'], function(model) {
    model.has_many(Floor);
  });
});

app.controller('TestCtrl', function(Building) {
  Building.all.get().then(function(buildings) { // resolves to GET /buildings
    var b = buildings.first();
    b.floors.get().then(function(floors) { // resolves to GET /building/{id}/floors
      //////////
    });
  });
});
