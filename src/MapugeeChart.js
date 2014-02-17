/*global $*/
var MapugeeUiChart = function() {
	'use strict';

	var draw = function(statsData, initYear, container, statsDataGlobal) {
		dropChart();

		var w = 370,
			h = 150,
			xScale, yScale, svg,
			dataset = {
				value: [],
				globVal: []
			};


		$.each(statsData, function(key, val) {
			var v = val;
			// d3 bar chart problem when value duplicate - hacky...
			while (jQuery.inArray(v, dataset.value) !== -1) {
				v += 1;
			}
			dataset.value.push(v);
		});

		xScale = d3.scale.ordinal()
			.domain(d3.range(dataset.value.length))
			.rangeRoundBands([0, w], 0.04);
		yScale = d3.scale.linear()
			.domain([0, d3.max(dataset.value)])
			.range([0, h - 25]);
		
		/*if (statsDataGlobal) {
			$.each(statsDataGlobal, function(key, val) {
				var v = val;
				dataset.globVal.push(v);
			});
			yScale = d3.scale.linear()
				.domain([0, d3.max(dataset.globVal)])
				.range([0, 150]);
		}*/


		//Create SVG element
		svg = d3.select(container)
			.append('svg')
			.attr('width', w)
			.attr('height', h);


		//Create bars
		svg.selectAll('rect')
			.data(dataset.value, function(d) {
				return d;
			})
			.enter()
			.append('rect')
			.attr('x', function(d, i) {
				return xScale(i);
			})
			.attr('y', function(d) {
				return h - yScale(d);
			})
			.attr('width', xScale.rangeBand())
			.attr('height', function(d) {
				return yScale(d);
			})
			.attr('fill', function(d) {
				return 'hsl(200, 50%, ' + getRelativeColor(d, dataset.value) + '%)';
			})

		//Create labels
		svg.selectAll('text')
			.data(dataset.value, function(d) {
				return d;
			})
			.enter()
			.append('text')
			.text(function(d) {
				return groupNumber(d);
			})
			.attr('text-anchor', 'middle')
			.attr('x', function(d, i) {
				return xScale(i) + xScale.rangeBand() / 2;
			})
			.attr('y', function(d) {
				return h - yScale(d) - 5;
			})
			.attr('font-family', 'sans-serif')
			.attr('font-size', '7px')
			.attr('fill', '#666');

		// color first bar on init
		hoverBar(initYear);

	},
		hoverBar = function(id) {
			var bar = id - 2000;
			d3.selectAll('.hover').attr('class', '');
			d3.selectAll('rect:nth-child(' + bar + ')').attr('class', 'hover');
		},
		dropChart = function(container) {
			$(container).empty();
		},
		getRelativeColor = function(val, dataset) {
			Array.prototype.max = function() {
				return Math.max.apply(null, this);
			};

			Array.prototype.min = function() {
				return Math.min.apply(null, this);
			};

			var max = dataset.max();
			return 50 - val / (max / 30);
		};

	return {
		draw: draw,
		hoverBar: hoverBar,
		dropChart: dropChart
	};
};