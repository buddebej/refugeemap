/*global $,d3,topojson */

var Mapugee = function(mapContainer) {
  'use strict';
  var _width = $(document).width(),
    _height = $(document).height(),
    // define projections
    _PROJECTION = {
      state: 'azimuthal',
      azimuthal: d3.geo.azimuthalEquidistant().scale(190 * (_height / 400)).rotate([0, 0]).clipAngle(180 - 1e-3).translate([_width / 2, _height / 2]).precision(0.1),
      mercator: d3.geo.mercator().scale(190 * (_height / 400)).translate([_width / 2, _height / 2]).precision(0.1),
      conic: d3.geo.conicEquidistant().scale(190 * (_height / 400)).translate([_width / 2, _height / 2]).precision(0.1)
    },
    _PATH = d3.geo.path().projection(_PROJECTION[_PROJECTION.state]), // set Projection
    _SVG = d3.select(mapContainer).insert('svg', '.shadow').attr('width', _width).attr('height', _height), // insert Map to container-div    
    _FEATURES = _SVG.append('g'), // get D3-Handler
    _DB_PATH = 'http://boeppe.eu/mapugee/v4/data/dbrequest.php', // url to ajax/postgis interface    
    _ZOOM_MIN = 0.2, // min zoom level
    _ZOOM_MAX = 1.6, // max zoom level
    _UI, // pointer to userinterface
    _countries, // array of all countries
    _year = 2012, // current year of interest
    _coi, // country of interest
    _flowArrowBuffer = {}, // buffer for flowArrows
    _statsAbsCountryYear = {}, // buffer for statistics
    _zoomLevel = 1, // init zoom
    _mode = 'cofr', // init mode
    _arrowDest,
    _filterMin = 0, // init value for minimum threshold
    _filterMax = 10000000, // init value for minimum threshold
    _continent = 'AL', // init value for continent selection
    // init values for visual variables width, opacity, color
    _arrowWidth = [{
      t: 10,
      v: 1
    }, {
      t: 10,
      v: 2
    }, {
      t: 100,
      v: 4
    }, {
      t: 1000,
      v: 6
    }, {
      t: 10000,
      v: 8
    }, {
      t: 100000,
      v: 10
    }],
    _arrowOpacity = [{
      t: 10,
      v: 1.0
    }, {
      t: 10,
      v: 1.0
    }, {
      t: 100,
      v: 0.90
    }, {
      t: 1000,
      v: 0.85
    }, {
      t: 10000,
      v: 0.80
    }, {
      t: 100000,
      v: 0.75
    }],
    _arrowColor = [{
      t: 10,
      v: 1.2
    }, {
      t: 10,
      v: 1.0
    }, {
      t: 100,
      v: 0.8
    }, {
      t: 1000,
      v: 0.6
    }, {
      t: 10000,
      v: 0.4
    }, {
      t: 100000,
      v: 0.2
    }];

  // resize map on window resize
  $(window).resize(function() {
    _width = $(document).width(); // read new width
    _height = $(document).height(); // read new height
    _SVG.attr('width', _width).attr('height', _height); // set svg canvas size
    _SVG.selectAll('path').attr('d', _PATH.projection(_PROJECTION[_PROJECTION.state].scale(190 * (_height / 600)).translate([_width / 2, _height / 2]))); //  set new projection extent
    cleanMap();
    drawFlowMap();
  });

  // ===============================================================================
  // ===============================================================================
  // Init Map  
  // 
  //

  // mode toggle button
  $('#mode-cofo').hide();

  // load and display the World
  d3.json('data/world.json', function(error, topology) {
    var jdata = topojson.object(topology, topology.objects.countries).geometries,
      countries = _FEATURES.insert('g', '.graticule')
        .selectAll('path')
        .data(jdata)
        .enter().append('path')
        .attr('d', _PATH)
        .attr('class', 'country')
        .on('click', selectNewCountryClick)
        .on('mouseover', mouseoverCountry)
        .on('mouseout', mouseoutCountry);
    saveCountries(countries);
  });

  // init loadingAnimation and hide it for init
  var loadingAnimation = $('.loader_container');
  loadingAnimation.hide();

  // insert graticule
  _FEATURES.insert('path').datum(d3.geo.graticule()).attr('class', 'graticule').attr('d', _PATH);

  // init zoom and pan
  var zoom = d3.behavior.zoom()
    .scaleExtent([_ZOOM_MIN, _ZOOM_MAX])
    .on('zoom', function() {
      _zoomLevel = zoom.scale();
      _FEATURES.attr('transform', 'translate(' +
        d3.event.translate.join(',') + ')scale(' + d3.event.scale + ')');
      _FEATURES.selectAll('path');
      _FEATURES.selectAll('text');
      _UI.makeLegend(_zoomLevel);
    });
  _SVG.call(zoom);
  // ===============================================================================
  // Methods  

  // query db and forward all needed arrow positions for one year
  var loadFlowArrowsToBuffer = function(coiCode, mode) {
    loadingAnimation.fadeIn();

    for (var i = 2001; i < 2013; i += 1) {
      $.getJSON(_DB_PATH + '?year=' + i + '&' + mode + '=\'' + coiCode + '\'&continent=\'' + _continent + '\'', function(data) {
        var arrows = {}, queryYear;

        $.each(data.features, function(key, feature) {
          var destXY = [feature.geometry.coordinates[0],
            feature.geometry.coordinates[1]
          ],
            refugees = parseInt(feature.properties.total_pop),
            code = feature.properties.code,
            directionSymbol = '>>';
          arrows[code] = {
            code: code,
            xy: destXY,
            linestyle: getLineStyle(refugees),
            total_ref: refugees,
            width: getPropStyle(refugees, _arrowWidth),
            opacity: getPropStyle(refugees, _arrowOpacity),
            color: 'hsl(34, 75%, ' + Math.round(getPropStyle(refugees, _arrowColor) * 63) + '%)', // dark yellow dependend of brightness of current number of refugees
          };

          if (refugees === '-1') {
            refugees = 'confidential';
          } else {
            refugees += ' persons';
          }

          // create tooltips
          if (_mode === 'cofo') {
            arrows[code].title = _countryNames[coiCode] + ' >> ' + _countryNames[code] + '(' + groupNumber(refugees) + ')';
          } else {
            arrows[code].title = _countryNames[code] + ' >> ' + _countryNames[coiCode] + ' (' + groupNumber(refugees) + ')';
          }

          // get current year 
          if (feature.properties.code === coiCode) {
            queryYear = feature.properties.total_pop; // dirty workaround ..
          }
        });
        // save arrow set for current year to buffer
        storeFlowArrowsInBuffer(coiCode, queryYear, arrows); // save preloaded array sets to buffer
      }).error(function() {
        loadingAnimation.fadeOut();
        if (i - 1 === _year) {
          alert('Error: Could not connect to database.')
        }
      })
        .done(function() {
          loadingAnimation.fadeOut();
          //if (i-1 === _year) {
          drawFlowArrowsFromBuffer(_coi, _year);
          //}
        })
    }
  },
    flowArrowInBufferExists = function() {
      if (jQuery.isEmptyObject(_flowArrowBuffer)) {
        return false;
      } else {
        return true;
      }
    },
    dropFlowArrowBuffer = function() {
      _flowArrowBuffer = {};
      _statsAbsCountryYear = {};
    },
    drawFlowArrowsFromBuffer = function(coiCode, year) {
      if (_flowArrowBuffer[year] !== undefined) { // if buffer has no such element do nothing (todo!)
        drawFlowArrows(_flowArrowBuffer[year].arrows);
      }
    },
    storeFlowArrowsInBuffer = function(coiCode, year, arrows) {
      var numberOfRefugees = 0;
      $.each(arrows, function(key, feature) {
        if (key !== coiCode && feature.total_ref >= 0) {
          numberOfRefugees = numberOfRefugees + feature.total_ref;
        }
      });
      _statsAbsCountryYear[year] = numberOfRefugees;
      _flowArrowBuffer[year] = {
        coiCode: coiCode,
        arrows: arrows
      };
    },
    // draws arrow by arrow from coiCode to arrows[i]
    drawFlowArrows = function(arrows) {

      // sort arrows by width to avoid overlaping
      var sortObject = function(obj) {
        var arr = [];
        for (var prop in obj) {
          if (obj.hasOwnProperty(prop)) {
            arr.push({
              'key': prop,
              'value': obj[prop]
            });
          }
        }
        arr.sort(function(a, b) {
          return b.value.width - a.value.width;
        });
        return arr;
      };

      $.each(sortObject(arrows), function(index, arrow) {
        var currArrow = arrow.value,
          route = {
            type: 'LineString',
            coordinates: [
              arrows[_coi].xy, currArrow.xy
            ],
            destCode: arrow.key,
            width: currArrow.width
          };

        // filter by number of refugees
        if ((currArrow.total_ref > _filterMin && currArrow.total_ref < _filterMax) || currArrow.total_ref === -1) {
          // insert flow Arrow
          _FEATURES.insert('path')
            .datum(route)
            .attr('d', _PATH)
            .attr('class', 'route')
            .attr('propOpacity', currArrow.opacity)
            .attr('propWidth', currArrow.width)
            .on('mouseover', mouseoverFlowArrow)
            .on('mouseout', mouseoutFlowArrow)
            .on('click', arrowClick)
            .attr({
              'stroke': currArrow.color,
              'stroke-width': currArrow.width + 'px',
              //'stroke-opacity': 0.0,
              'fill': 'none',
              'stroke-dasharray': currArrow.linestyle
            })
            .append('title')
            .text(currArrow.title);
        }
      });
      fadeInFlowArrows();
      highlightCountry(_coi, 'country-highlight');
      highlightCountries(arrows);

      updateUi();
      //drawCircle(arrows[_coi]);
    },
    drawCircle = function(ca) {
      // circle in arrow origin 
      if (Object.keys(ca).length > 1) {
        var coordinates = _PROJECTION[_PROJECTION.state](ca.xy);
        _FEATURES.append('svg:circle')
          .attr('cx', coordinates[0])
          .attr('cy', coordinates[1])
          .attr('class', 'points')
          .attr('r', 3);
      }
    },
    cleanMap = function() {
      deleteAllArrows();
      unHighlightCountries(); // clean up
      deletePointMarker(); // delete all old point markers in other countries
    },
    drawFlowMap = function() {
      fadeOutFlowArrows();
      unHighlightCountries(); // clean up

      // if new country
      if (flowArrowInBufferExists()) {
        drawFlowArrowsFromBuffer(_coi, _year);
      } else {
        rotateTo(_coi); // rotate only to country when it's a new country
        loadFlowArrowsToBuffer(_coi, _mode, true); // fill buffer only when it's a new country
      }

    },
    rotateTo = function(coiCode) {
      var proj = proj;
      $.getJSON(_DB_PATH + '?country=\'' + coiCode + '\'', function(data) {
        var destXY;
        $.each(data.features, function(key, feature) {
          destXY = {
            x: feature.geometry.coordinates[0],
            y: feature.geometry.coordinates[1]
          };
        });
        changeProjCenter(destXY.x, destXY.y);
      });
    },
    changeProjCenter = function(x, y) {
      var projection = _PROJECTION[_PROJECTION.state];
      _PATH.projection(projection.rotate([-x, -y]));
      _SVG.selectAll('path').transition().duration(200).attr('d', _PATH);
      loadingAnimation.fadeOut();
    },
    setProjection = function(proj) {
      cleanMap();
      _PATH = d3.geo.path().projection(_PROJECTION[proj]);
      _PROJECTION.state = proj;
      rotateTo(_coi);
      _SVG.selectAll('path').transition().duration(100).attr('d', _PATH);
      drawFlowMap();
    },
    selectNewCountryClick = function() {
      selectNewCountry(d3.select(this).data()[0].id);
    },
    selectNewCountry = function(coiCode) {
      _UI.stopAnimation();
      _UI.domObjects.boxArrowStats.hide('blind', 300);
      cleanMap();
      setCountryOfInterest(coiCode);
      // set new country of interest.
      if (flowArrowInBufferExists()) {
        dropFlowArrowBuffer(); // empty flow buffer if new country is selected
      }
      drawFlowMap();
    },
    toggleMode = function() {
      if (_mode === 'cofr') {
        _mode = 'cofo';
        activeModeButton('cofr');
      } else {
        _mode = 'cofr';
        activeModeButton('cofo');
      }
      if (flowArrowInBufferExists()) {
        dropFlowArrowBuffer();
        cleanMap();
        loadFlowArrowsToBuffer(_coi, _mode, true);
      }
    },
    showTimeControl = function() {
      _UI.domObjects.timeControl.show();
    },
    hideTimeControl = function() {
      _UI.domObjects.timeControl.hide();
    },
    activeModeButton = function() {
      var active = $('.mode-toggle:hidden');
      $('.mode-toggle:visible').hide();
      active.show();
    },
    mouseoverFlowArrow = function() {
      if (!_UI.isPlaying()) {
        d3.selectAll('.route').transition().duration(200).style('stroke-opacity', 0.15);
        d3.select(this).transition().duration(200).style('stroke', '#3D8DB6').style('stroke-opacity', 1.0);
      }
    },

    mouseoutFlowArrow = function() {
      if (!_UI.isPlaying()) {
        d3.selectAll('.route').each(function(d, i) {
          d3.select(this).transition().duration(200).style('stroke-opacity', d3.select(this).attr('propOpacity')).style('stroke', d3.select(this).attr('propColor'));
        });
      }
    },

    mouseoverCountry = function() {
      if (!d3.select(this).attr('highlighted')) {
        d3.select(this).attr('class', 'country-hover');
      }
    },
    mouseoutCountry = function() {
      if (!d3.select(this).attr('highlighted')) {
        d3.select(this).attr('class', 'country');
      }
    },
    saveCountries = function(cd) {
      _countries = cd;
    },
    unHighlightCountries = function() {
      d3.selectAll('.country-highlight-2').transition().duration(350).style('opacity', 0.8).attr('class', 'country').attr('highlighted', null);
      d3.selectAll('.country-highlight').transition().duration(350).style('opacity', 0.8).attr('class', 'country').attr('highlighted', null);
    },
    highlightCountry = function(coiCode, css) {
      _countries.filter(function(d) {
        return d.id === coiCode;
      }).transition().duration(350).style('opacity', 0.6).attr('class', css).attr('highlighted', css);
    },
    highlightCountries = function(arrows) {
      $.each(arrows, function(key, feature) {
        if (key !== _coi) {
          highlightCountry(key, 'country-highlight-2');
        }
      });
    },
    // push UI update on arrow select
    arrowClick = function() {
      _arrowDest = d3.select(this).data()[0].destCode;
      updateUiPath();
    },
    updateUiPath = function() {
      var arrowStats = [],
        n = 0;

      $.each(_flowArrowBuffer, function(key, val) {
        if (val.arrows.hasOwnProperty(_arrowDest)) {
          n = val.arrows[_arrowDest].total_ref;
          if (n < 0) {
            n = 0;
          }
          arrowStats.push(n);
        } else {
          arrowStats.push(0);
        }
      });

      if (_mode === 'cofr') {
        _UI.domObjects.textPath.text('Refugees from ' + _countryNames[_arrowDest] + ' to ' + _countryNames[_coi]);
      } else {
        _UI.domObjects.textPath.text('Refugees from ' + _countryNames[_coi] + ' to ' + _countryNames[_arrowDest]);
      }
      _UI.uiChart.dropChart('.graphPath');
      _UI.domObjects.boxArrowStats.show('blind', 300);
      _UI.uiChart.draw(arrowStats, _year, '.graphPath', _statsAbsCountryYear);
    },
    // push UI updates to DOM
    updateUi = function() {
      var modeText, sum = 0;
      if (_mode === 'cofr') {
        if (_continent !== 'AL') {
          modeText = 'Refugees from ' + _continentNames[_continent] + ' to';
        } else {
          modeText = 'Refugees to';
        }
      } else {
        if (_continent !== 'AL') {
          modeText = 'Refugees to ' + _continentNames[_continent] + ' from';
        } else {
          modeText = 'Refugees from';
        }
      }
      _UI.uiChart.dropChart('.graphCountry');
      _UI.domObjects.textMode.text(modeText);
      _UI.domObjects.textName.text(_countryNames[_coi]);
      if (_UI.domObjects.yearHud.is(':hidden')) {
        _UI.domObjects.yearHud.show();
      }
      _UI.domObjects.textYear.text(_year);
      _UI.domObjects.yearHud.text(_year);
      _UI.domObjects.selectCountry.val(_countryNames[_coi]);
      $.each(_statsAbsCountryYear, function(key, val) {
        sum += parseInt(val);
      });

      // check if this is a no-data country
      if (sum !== 0) {
        _UI.domObjects.textTotal.text('(' + groupNumber(_statsAbsCountryYear[_year]) + ')');
        _UI.uiChart.draw(_statsAbsCountryYear, _year, '.graphCountry');
        showTimeControl();
      } else {
        _UI.domObjects.textTotal.text('(no data)');
        _UI.uiChart.dropChart('.graphCountry');
        hideTimeControl();
        _UI.domObjects.yearHud.hide();
        _UI.domObjects.boxArrowStats.hide('blind', 300);
      }
      if (_UI.domObjects.boxArrowStats.is(':visible')) {
        updateUiPath(); // redraw on change mode
      }
    },
    deleteAllArrows = function() {
      d3.selectAll('.route').remove();
      d3.selectAll('.toDelete').remove();
      d3.selectAll('.route-hover').remove();
    },
    deletePointMarker = function() {
      d3.selectAll('.points').remove();
    },
    fadeOutFlowArrows = function() {
      d3.selectAll('.route')
        .attr('class', '.toDelete') // mark now hidden flowArrows to be removed
      .transition().duration(400).style('stroke-opacity', 0.0).each(function() {
        d3.select(this).remove()
      });

    },
    fadeInFlowArrows = function() {
      d3.selectAll('.toDelete').remove(); // remove old hidden flowArrows 
      d3.selectAll('.route').each(function(d, i) {
        d3.select(this).transition().duration(300).style('stroke-opacity', d3.select(this).attr('propOpacity'));
      });

    },
    setYear = function(year) {
      _year = year;
    },
    setFilterMin = function(min) {
      _filterMin = min;
      drawFlowMap();
    },
    setFilterMax = function(max) {
      _filterMax = max;
      drawFlowMap();
    },
    setContinent = function(continent) {
      _continent = continent;
      selectNewCountry(_coi);
    },
    setCountryOfInterest = function(coiCode) {
      _coi = coiCode;
    },
    setUi = function(ui) {
      _UI = ui;
    },
    getYear = function() {
      return _year;
    },
    setStyle = function(stylesIn) {
      var styles = stylesIn;
      _arrowOpacity = styles.opacity;
      _arrowWidth = styles.width;
      _arrowColor = styles.color;
    },
    getStyle = function() {
      return {
        opacity: _arrowOpacity,
        width: _arrowWidth,
        color: _arrowColor
      };
    },
    getLineStyle = function(val) {
      switch (true) {
        case (val <= 0):
          return '5,5';
        default:
          return '';
      }
    },
    getPropStyle = function(val, attr) {
      switch (true) {
        case (val <= attr[0].t):
          return attr[0].v;
        case (val > attr[5].t):
          return attr[5].v;
        case (val > attr[4].t):
          return attr[4].v;
        case (val > attr[3].t):
          return attr[3].v;
        case (val > attr[2].t):
          return attr[2].v;
        case (val > attr[1].t):
          return attr[1].v;
      }
    };

  return {
    selectNewCountry: selectNewCountry,
    drawFlowMap: drawFlowMap,
    setProjection: setProjection,
    setYear: setYear,
    setFilterMin: setFilterMin,
    setFilterMax: setFilterMax,
    setContinent: setContinent,
    getYear: getYear,
    getStyle: getStyle,
    toggleMode: toggleMode,
    setUi: setUi
  };
};