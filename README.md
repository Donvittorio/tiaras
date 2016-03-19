# Tiaras

> This Is Another Restful Angular Service

## Synopsis

Tiaras is an [AngularJS 1](https://angularjs.org) module designed to make defining models and the relationships between them easier.

## Examples

### Model definition

Defining models is easy. (Right now you will need to specify the name of the service in which the model resides, the singular and plural forms of the resource represented. this is being worked on)

```javascript
var app = angular.module('app', ['tiaras']);

app.factory('Employees', function(Tiaras) {
  return Tiaras.model('Employees', ['employee', 'employees'], function(model) {
    // This implies a 'company_id' is present on every employee
    //   object returned by the API.
    //   
    // This will add a reference that resolves to '/companies/{company_id}'
    model.belongs_to('Companies');
  });
});

app.factory('Companies', function(Tiaras) {
  return Tiaras.model('Companies', ['company', 'companies'], function(model) {
    model.has_many('Employees');
    // ^This implies there is a '/companies/{id}/employees' route
  });
});
```

### CRUD operations

Tiaras also supports CRUD operations

Checklist:
  * Create
  * ~~Read~~
  * ~~Update~~
  * ~~Delete~~

#### Creation (NOT YET IMPLEMENTED)

```javascript
Buildings.create({name: "Tower"});
Buildings.one(1).floors.create({number: 5});
```

#### Reading

```javascript
Buildings.all.get();
building.floors.get();
Floors.one(3).get();
```

#### Updating

This is done in an Active Record way.

```javascript
floor.number = 5;
floor.save();
```

#### Deleting

```javascript
floor.remove();
// NOT YET IMPLEMENTED
Floors.one(2).remove();
```

## License

MIT © Lorin Werthen-Brabants
