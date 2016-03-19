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

          /*
          Entity derived class
           */
          self.Entity = function(data) {
            var self = this;

            //TODO make this not dependent on jquery
            $.extend(self, data);
          };

          self.Entity.prototype.save = function() {
            var model = self;
            var entity = this;

            //TODO: URL building
            return $http.post(baseUrl + '/' + model.name_mult + '/' + entity.id, self);
          };

          self.Entity.prototype.remove = function() {
            var model = self;
            var entity = this;

            //TODO: URL building
            return $http.delete(baseUrl + '/' + model.name_mult + '/' + entity.id);
          };
        };

        TiarasModel.prototype.createEntity = function(data) {
          var self = this;
          return new self.Entity(data);
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
                    data[i] = self.createEntity(data[i]);
                  }
                  deferred.resolve(data);
                });

                return deferred.promise;
              }
            };
          }
        });

        TiarasModel.prototype.one = function(id) {
          var self = this;

          return {
            url: baseUrl + '/' + self.name_mult + '/' + id,
            get: function() {
              var deferred = $q.defer();

              $http.get(this.url).success(function(data) {
                var res = self.createEntity(data);
                deferred.resolve(res);
              });

              return deferred.promise;
            }
          };
        };

        /**
         * Adds a has_many relationship to the prototype of the entity connected
         * to the model
         * @param  {model} relation
         */
        TiarasModel.prototype.add_has_many = function(relation) {
          var model = this;

          Object.defineProperty(model.Entity.prototype, relation.name_mult, {
            get: function() {
              var entity = this;

              return {
                get: function() {
                  var url = baseUrl + '/' + model.name_mult + '/' + entity.id + '/' + relation.name_mult + '/';
                  var deferred = $q.defer();

                  $http.get(url).success(function(data) {
                    for (var i = 0; i < data.length; i++) {
                      data[i] = relation.createEntity(data[i]);
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


        TiarasModel.prototype.add_belongs_to = function(relation) {
          var self = this;

          var value = {};
          //REVIEW: is a defineProperty really neccessary?
          //        the only decent use for it is the setter, which will make sure
          //        the .get function never gets overwritten.
          //
          //        Also, IE8 only supports defineProperty on DOM objects
          Object.defineProperty(self.Entity.prototype, relation.name_sing, {
            configurable: true,
            get: function() {
              var entity = this;
              var res = value;

              res.get = function() {
                // TODO: find a way to chain these
                var url = baseUrl + '/' + relation.name_mult + '/' + entity.id;
                var deferred = $q.defer();

                $http.get(url).success(function(data) {
                  deferred.resolve(self.createEntity(data));
                });

                return deferred.promise;
              };
              return res;
            },
            set: function(newVal) {
              $.extend(self.Entity.prototype[relation.name_sing], newVal);
            }
          });
        };

        // "Setter" for model
        Object.defineProperty(TiarasModel.prototype, "model", {
          // Don't make enumerable, makes sending of data easier
          enumerable: false,
          value: model
        });

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
                $injector.get(relation);
              }
              tiara_model.add_has_many(ModelStore.get_model(relation));
            },
            belongs_to: function(relation) {
              //HACK: This will start the configuration of the relation.
              //      This is really ugly.
              if (!ModelStore.get_model(relation)) {
                $injector.get(relation);
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
