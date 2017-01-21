(function() {
  'use strict';

  window.itunes_searcher = new function() {
    this.facets = ['Genre', 'Artist', 'Album'];
    this.facets_data = {};

    this.show_search_results = function(results) {
      var _this = window.itunes_searcher

      // remove existing rows
      $('#search_results_tracks tbody tr').empty();

      // hide/show results table
      if (results.hits.total < 1) {
        $('#search_results_tracks').hide();
      } else {
        $('#search_results_tracks').show();
      }

      // update facets
      $.each(results.aggregations, function (key, value) {
        var facet_name = key.replace('aggs_', '');
        _this.facets_data[facet_name] = value.buckets;
        _this.display_facet(facet_name);
      });

      // append results
      $(results.hits.hits).each(function(i) {
        var result = this;

        if (result._type == 'track') {
          var tr = $('<tr>').data('track_id', result._id);

          var field_list = ['Artist', 'Name', 'Album', 'Album Artist', 'Track Number', 'Year', 'Genre', 'Rating'];
          var tds = $(field_list).map(function() {

            if (this == 'Rating') {
              var stars = Math.floor(result._source[this] / 20);
              var contents = "<span style='white-space: nowrap;'>";
              for (var i = 0; i < stars; i++) {
                contents += '<i class="fa fa-star" aria-hidden="true"></i>';
              }
              contents += '</span>';
            } else {
              var contents = result._source[this] ? result._source[this] : ''
            }

            return '<td>' + contents + '</td>';
          }).get().join('');

          $(tr).html(tds).appendTo('#search_results_tracks tbody');
        } else {
          // todo
          debugger;
        }
      });

    }

    this.display_facet = function(facet_name) {
      var select = $('#facet-' + facet_name);

      // todo: keep track of currently selected

      select.find('option').remove();

      $(this.facets_data[facet_name]).each(function(){
        var option = $('<option/>');
        option.attr({value: this.key}).text(this.key + ' (' + this.doc_count + ')');
        $(select).append(option);
      })
    }

    this.init = function() {
      var _this = this;

      $('#search_results_tracks').hide();

      $('form#search').submit(function() {
        var form = this;
        $.getJSON('/search', $(form).serialize(), _this.show_search_results);
        return false;
      });

      $('form#search').submit();

    };
  }

  $(document).ready(function(){
    window.itunes_searcher.init();
  });

})();
