app.factory('Floors', function(Tiaras) {
  return Tiaras.model('Floors', ['floor', 'floors'], function(model) {
    model.belongs_to('Buildings'); // requires bus_id, will resolve to /buses/{bus_id}
  });
});

app.factory('Buildings', function(Tiaras) {
  return Tiaras.model('Buildings', ['building', 'buildings'], function(model) {
    model.has_many('Floors');
  });
});

//CREATION
Buildings.create({name: "Tower"});
Buildings.one(1).floors.create({number: 5});

//READING
Buildings.all.get();
building.floors.get();
Floors.one(3).get();

//ACTIVE RECORD UPDATING
floor.number = 5;
floor.save();

//DELETING
floor.remove();
Floors.one(2).remove();
