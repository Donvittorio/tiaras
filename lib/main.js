(function() {
  'use strict';

  var capitalize = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

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

        TiarasModel.prototype.create = function(data) {
          return $http.post(baseUrl + '/' + this.name_mult + '/', data);
        };

        /**
         * Define a new model
         * @param  {list} names  List of names (singular, multiple) of the model
         * @param  {function} config Configuration of model
         * @return model
         */
        var model = function(modelname, names, config) {
          // don't execute config if it isn't provided
          config = config || angular.noop;

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
          //
          //        Although, maybe there's a way to keep both functionalities
          //        and cater to whomever prefers one way or another
          config({
            has_many: function(r) {
              //HACK: This will start the configuration of the relation.
              //      This is really ugly.
              var relation = ModelStore.get_model(r);
              if (!relation) {
                relation = $injector.get(r);
              }

              tiara_model.Entity.prototype["get" + capitalize(relation.name_mult)] = function() {
                var entity = this;

                var url = baseUrl + '/' + tiara_model.name_mult + '/' + entity.id + '/' + relation.name_mult + '/';
                var deferred = $q.defer();

                $http.get(url).success(function(data) {
                  for (var i = 0; i < data.length; i++) {
                    data[i] = relation.createEntity(data[i]);
                  }
                  deferred.resolve(data);
                });

                return deferred.promise;
              };
            },
            belongs_to: function(r) {
              //HACK: This will start the configuration of the relation.
              //      This is really ugly.
              var relation = ModelStore.get_model(r);
              if (!relation) {
                relation = $injector.get(r);
              }

              tiara_model.Entity.prototype["get" + capitalize(relation.name_sing)] = function() {
                var entity = this;

                // TODO: find a way to chain these
                var url = baseUrl + '/' + relation.name_mult + '/' + entity.id;
                var deferred = $q.defer();

                $http.get(url).success(function(data) {
                  deferred.resolve(tiara_model.createEntity(data));
                });

                return deferred.promise;
              };

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
