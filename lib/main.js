(function() {

  var tiaras = angular.module('tiaras', []);

  tiaras.factory('ModelStore', function() {
    var models = {};

    var add_model = function(name, model) {
      models[name] = model;
    };

    var get_model = function(name) {
      return models[name];
    };

    return {
      add_model: add_model,
      get_model: get_model
    };
  });

  tiaras.provider('Tiaras', function() {
    var self = this;

    /**
     * The base url of the API to talk with
     */
    var baseUrl = "";
    self.setBaseUrl = function(url) {
      baseUrl = url;
    };

    this.$get = ['$http', '$q', '$injector', 'ModelStore',
      function($http, $q, $injector, ModelStore) {
        var TiarasModel = function(names) {
          var self = this;

          self.name_sing = names[0];
          self.name_mult = names[1];
          self.has_many_relations = [];
          self.belongs_to_relations = [];
        };

        Object.defineProperty(TiarasModel.prototype, "all", {
          get: function() {
            //HACK: This seems so hacky for what it actually is
            var self = this;

            //REVIEW: Should .all be an object or a function?
            return {
              get: function() {
                var url = baseUrl + '/' + self.name_mult + '/';
                var deferred = $q.defer();

                $http.get(url).success(function(data) {
                  for (var i = 0; i < data.length; i++) {
                    data[i] = new TiarasEntity(self, data[i]);
                  }
                  deferred.resolve(data);
                });

                return deferred.promise;
              }
            };
          }
        });

        //TODO: Provide encapsulation for this
        TiarasModel.prototype.add_has_many = function(relation) {
          this.has_many_relations.push(relation);
        };

        //TODO: Provide encapsulation for this
        TiarasModel.prototype.add_belongs_to = function(relation) {
          this.belongs_to_relations.push(relation);
        };

        TiarasModel.prototype.one = function(id) {
          var self = this;

          res = {
            url: baseUrl + '/' + self.name_mult + '/' + id,
            get: function() {
              var deferred = $q.defer();

              $http.get(this.url).success(function(data) {
                var res = new TiarasEntity(self, data);
                deferred.resolve(res);
              });

              return deferred.promise;
            }
          };

          return res;
        };

        //TODO: Move this into declaration of model, that way you can dynamically
        //      create prototypes, so construction time of an object is not dependent
        //      on the amount of methods/properties it has
        var TiarasEntity = function(model, data) {
          var self = this;

          // "Setter" for model
          Object.defineProperty(self, "model", {
            // Don't make enumerable, makes sending of data easier
            enumerable: false,
            value: model
          });

          self.remove = function() {
            //TODO: URL building
            return $http.delete(baseUrl + '/' + model.name_mult + '/' + self.id);
          };

          self.save = function() {
            //TODO: URL building
            return $http.post(baseUrl + '/' + model.name_mult + '/' + self.id, self);
          };

          //TODO make this not dependent on jquery
          $.extend(self, data);

          var define_belongs_to = function(entity, relation) {
            var value = {};
            //REVIEW: is a defineProperty really neccessary?
            //        the only decent use for it is the setter, which will make sure
            //        the .get function never gets overwritten.
            //
            //        Also, IE8 only supports defineProperty on DOM objects
            //
            //        ALSO ALSO, this should probably move to a prototype, instead
            //        of defining this for every instance
            Object.defineProperty(entity, relation.name_sing, {
              configurable: true,
              get: function() {
                var res = value;

                res.get = function() {
                  // TODO: find a way to chain these
                  var url = baseUrl + '/' + relation.name_mult + '/' + entity.id;
                  var deferred = $q.defer();

                  $http.get(url).success(function(data) {
                    deferred.resolve(data);
                  });

                  return deferred.promise;
                };
                return res;
              },
              set: function(newVal) {
                $.extend(entity[relation.name_sing], newVal);
              }
            });
          };

          for (var i = 0; i < model.belongs_to_relations.length; i++) {
            define_belongs_to(self, model.belongs_to_relations[i]);
          }

          var define_has_many = function(entity, rel) {
            Object.defineProperty(entity, rel.name_mult, {
              get: function() {
                return {
                  get: function() {
                    var url = baseUrl + '/' + model.name_mult + '/' + entity.id + '/' + rel.name_mult + '/';
                    var deferred = $q.defer();

                    $http.get(url).success(function(data) {
                      for (var i = 0; i < data.length; i++) {
                        data[i] = new TiarasEntity(rel, data[i]);
                      }
                      deferred.resolve(data);
                    });

                    return deferred.promise;
                  }
                };
              },
              set: function(val) {
                //TODO
              }
            });
          };

          // ADD HAS_MANY RELATIONSHIPS TO ENTITY
          for (var j = 0; j < model.has_many_relations.length; j++) {
            define_has_many(self, model.has_many_relations[j]);
          }
        };

        /**
         * Define a new model
         * @param  {list} names  List of names (singular, multiple) of the model
         * @param  {function} config Configuration of model
         * @return model
         */
        var model = function(modelname, names, config) {
          var tiara_model = new TiarasModel(names);
          ModelStore.add_model(modelname, tiara_model);

          //REVIEW: So a big question that's been on my mind is whether or not
          //        I should move the definition of models to a run block or
          //        something similar. Using the injector to inject models which
          //        just happen to also start the configuration process is kinda
          //        hacky and not Angular-esque (in my opinion).
          //
          //        This would mean the whole model definition process would get
          //        a gigantic overhaul, which would not be backwards compatible
          //        in any way
          config({
            has_many: function(relation) {
              //HACK: This will start the configuration of the relation.
              //      This is really ugly.
              if (!ModelStore.get_model(relation)) {
                var m = $injector.get(relation);
              }
              tiara_model.add_has_many(ModelStore.get_model(relation));
            },
            belongs_to: function(relation) {
              //HACK: This will start the configuration of the relation.
              //      This is really ugly.
              if (!ModelStore.get_model(relation)) {
                var m = $injector.get(relation);
              }
              tiara_model.add_belongs_to(ModelStore.get_model(relation));
            }
          });

          return tiara_model;
        };

        return {
          model: model
        };
      }
    ];
  });


})();
