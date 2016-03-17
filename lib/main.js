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
    /**
     * The base url of the API to talk with
     */
    var baseUrl = "";
    this.setBaseUrl = function(url) {
      baseUrl = url;
    };

    this.$get = function($http, $q, $injector, ModelStore) {
      var TiarasModel = function(names) {
        this.name_sing = names[0];
        this.name_mult = names[1];
        this.has_many_relations = [];
        this.belongs_to_relations = [];
      };

      TiarasModel.prototype.add_has_many = function(relation) {
        this.has_many_relations.push(relation);
      };

      TiarasModel.prototype.add_belongs_to = function(relation) {
        this.belongs_to_relations.push(relation);
      };


      var TiarasEntity = function(model, data) {
        var self = this;

        self.model = model;

        //TODO make this not dependent on jquery
        $.extend(self, data);

        for (var i = 0; i < model.belongs_to_relations.length; i++) {
          var rel = model.belongs_to_relations[i];
          
          var value = {};
          Object.defineProperty(self, rel, {
            configurable: true,
            get: function() {
              var res = value;

              res.get = function() {
                var url = baseUrl + '/' + rel.name_mult + '/' + self.id;
                var deferred = $q.defer();

                $http.get(url).success(function(data) {
                  deferred.resolve(data);
                });

                return deferred.promise;
              };
              return res;
            },
            set: function(newVal) {
              $.extend(self[rel], newVal);
            }
          });
        }

        // ADD HAS_MANY RELATIONSHIPS TO ENTITY
        for (var j = 0; j < model.has_many_relations.length; j++) {
          var rel = model.has_many_relations[j];
          Object.defineProperty(self, rel.name_mult, {
            get: function() {
              return {
                get: function() {
                  var url = baseUrl + '/' + self.model.name_mult + '/' + self.id + '/' + rel.name_mult + '/';
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
              console.log("TODO");
            }
          });
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


        tiara_model.one = function(id) {
          res = {
            url: baseUrl + '/' + tiara_model.name_mult + '/' + id,
            get: function() {
              var deferred = $q.defer();

              $http.get(this.url).success(function(data) {
                var res = new TiarasEntity(tiara_model, data);
                deferred.resolve(res);
              });

              return deferred.promise;
            }
          };

          return res;
        };

        tiara_model.all = {
          url: baseUrl + '/' + tiara_model.name_mult + '/',
          get: function() {
            var deferred = $q.defer();

            $http.get(this.url).success(function(data) {
              for (var i = 0; i < data.length; i++) {
                data[i] = new TiarasEntity(tiara_model, data[i]);
              }
              deferred.resolve(data);
            });

            return deferred.promise;
          }
        };

        return tiara_model;
      };

      return {
        model: model
      };
    };
  });


})();
