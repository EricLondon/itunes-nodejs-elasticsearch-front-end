"use strict";

var express = require('express');
var app = express();
var http = require('http').Server(app);

// elasticsearch
var elasticsearch = require('elasticsearch');
var es_client = new elasticsearch.Client({
  host: '127.0.0.1:9200',
  log: 'trace'
});

// bower
app.use(express.static(__dirname + '/public'));
app.use('/bower_components', express.static(__dirname + '/bower_components'));

// underscore/lodash
var _ = require('lodash');

var facets = ['Genre', 'Artist', 'Album'];
var elasticsearch_index = 'itunes_tracks';

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/facets/:facet_name', function(req, res){
  var facet_name = req.params.facet_name;
  var aggs_name = 'aggs_' + facet_name
  var _body = {
    size: 0,
    aggs: {}
  }
  _body.aggs[aggs_name] = {
    terms: {
      field: facet_name + '.raw',
      size: 0
    }
  }

  es_client.search({
    index: elasticsearch_index,
    body: _body
  }).then(function(resp) {
    res.json(resp.aggregations[aggs_name].buckets);
  }, function(err) {
    console.trace(err.message);
  });

})

app.get('/search', function(req, res) {

  // remove empty values from query string
  _.forOwn(req.query, function(value, key) {
    if (_.isEmpty(value)) {
      delete req.query[key];
    }
  });

  var search_definition = {
    query: {
      bool: {
        must: []
      }
    },
    size: 1000000,
    sort: [
      { 'Artist.raw': { order: 'asc' } },
      { 'Album.raw': { order: 'asc' } },
      { 'Track Number': { order: 'asc' } }
    ]
  }

  // add aggs/facets
  search_definition.aggs = {}
  _.each(facets, function(facet_name) {
    search_definition.aggs['aggs_' + facet_name] = {
      terms: {
        field: facet_name + '.raw',
        size: 0
      }
    }
  });

  if (_.isEmpty(req.query)) {
    search_definition.query = { match_all: {} };
    search_definition.size = 100;
    search_definition.sort = [
      { 'Rating': { order: 'desc' } },
      { 'Date Added': { order: 'desc' } },
      { '_score': { order: 'desc' } }
    ];
  }
  else {

    _.forOwn(req.query, function(value, key) {

      if (key == 'q') {
        search_definition.query.bool.must.push({
          match: {
            content: {
              query: value,
              operator: 'and'
            }
          }
        });
      }
      else if (/^facet-/.test(key)) {
        var split = key.split('-');
        if (_.indexOf(facets, split[1]) !== -1) {
          var facet_name = split[1];
          var fragment = { filtered: { filter: { terms: {} } } };
          fragment.filtered.filter.terms[facet_name + '.raw'] = value;
          search_definition.query.bool.must.push(fragment);
        }
      }
      else {
        // TODO:
        // debugger;
      }

    });

  }

  es_client.search({
    index: elasticsearch_index,
    body: search_definition
  }).then(function(resp) {
    // res.json(resp.hits.hits);
    res.json(resp);
  }, function(err) {
    console.trace(err.message);
  });

});

http.listen(3333, function() {
  console.log('listening on *:3333');
});
