/*global $*/

var MapugeeUi = function(map) {
	'use strict';

	// get domObjects of UI
	var domObjects = {
		"timeControl": $('.timeControl'),
		"textMode": $('.uiText.mode'),
		"textName": $('.uiText.name'),
		"textYear": $('.uiText.year'),
		"textTotal": $('.uiText.total'),
		"selectCountry": $('.selectCountry'),
		"textPath": $('.migrationPath'),
		"boxArrowStats": $('.arrowStats'),
		"yearHud": $('.yearHud')
	};

	// direction of migration
	$(".mode-toggle").click(function() {
		map.toggleMode();
	});

	// init ui tabs
	$(function() {
		$(".mapControls").tabs();
	});

	// drag control panel
	$(function() {
		$(".controlPanel").draggable();
	});

	// hide / show control panel
	$('.controlPanelHeader .ui-icon').click(function() {
		if ($('.controls').is(':visible')) {
			$('.controls').hide('blind', 300, function() {
				$('.controlPanelHeader .ui-icon').removeClass('ui-icon-minus');
				$('.controlPanelHeader .ui-icon').addClass('ui-icon-plus');
			});
		} else {
			$('.controls').show('blind', 300, function() {
				$('.controlPanelHeader .ui-icon').removeClass('ui-icon-plus');
				$('.controlPanelHeader .ui-icon').addClass('ui-icon-minus');
			});
		}
	});


	// countryselect autocomplete
	$(function() {
		var availableTags = $.map(_countryNames, function(val, key) {
			return {
				label: val,
				code: key
			};
		});
		$('.selectCountry').autocomplete({
			source: availableTags,
			select: function(event, ui) {
				map.selectNewCountry(ui.item.code);
			}
		});
	});

	// countryselect clear on focus
	$('.selectCountry').click(function() {
		$(this).val('');
	});

	// temporal slider
	$(function() {
		var scaleSlider = $('.yearSlider').slider({
			min: 1,
			max: 12,
			value: 12,
			slide: function(event, ui) {
				var year = ui.value + 2000;
				map.setYear(year);
				map.drawFlowMap();
				uiChart.hoverBar(year);
			}
		});
	});

	// animation
	var speed = 500,
		animation = false,
		startAnimation = function() {
			animation = true;
			animate();
		},
		stopAnimation = function() {
			animation = false;
		},
		isPlaying = function() {
			return animation;
		},
		animate = function() {
			if (animation) {
				if (map.getYear() === 2012) {
					map.setYear(2000)
				}

				var nextYear = map.getYear() + 1;
				map.setYear(nextYear);
				map.drawFlowMap();
				uiChart.hoverBar(nextYear);
				$(".yearSlider").slider({
					value: nextYear - 2000
				});

				setTimeout(function() {
					animate();
				}, speed);
			}
		};
	// animation controls
	$('.actrl.pause').click(stopAnimation);
	$('.actrl.play').click(startAnimation);

	// animation speed
	$(function() {
		$(".sliderSpeed").slider({
			orientation: "vertical",
			min: 1,
			max: 15,
			value: 5,
			slide: function(event, ui) {
				speed = 1500 - ui.value * 100;
			}
		});
	});

	// legend
	var makeLegend = function(zoom) {
		var styleData = map.getStyle();
		$('.legend').empty();

		for (var i = 0; i < styleData.width.length; i += 1) {
			var thresholdValue = groupNumber(styleData.width[i].t),
				widthValue = Math.min(Math.max(Math.floor(zoom * styleData.width[i].v), 1), 20);
			if (i === 0) {
				thresholdValue = '<= ' + thresholdValue;
			} else {
				thresholdValue = '> ' + thresholdValue;
			}
			if (i === 0) {
				$('.legend').append('<div class="floatBox legendBar" style="margin-top: 0.4em;border-bottom:1px dashed;border-color:hsl(34, 75%, ' + Math.round(styleData.color[i].v * 63) + '%);"></div><div class="floatBox legendBarText">(confidential)</div><div class="clearFloat"></div>');
			}
			$('.legend').append('<div style="height:' + widthValue + 'px;"><div class="floatBox legendBar" style="margin-top: 0.' + 4 + i + 'em;height:100%;background-color:hsl(34, 75%, ' + Math.round(styleData.color[i].v * 63) + '%);"></div><div class="floatBox legendBarText">' + thresholdValue + '</div></div><div class="clearFloat"></div>');
		}
	};
	makeLegend(1); // init

	// filter
	$('.filterSelect').change(function() {
		var val = $('.filterSelect option:selected').val();
		map.setFilterMin(0);
		map.setFilterMax(10000000);

		map.setFilterMin(val);
		if (val === '-1') {
			$('.customFilter').show()
		} else {
			$('.customFilter').hide()
		}
	});

	$('.filterInputMin').focusout(function() {
		map.setFilterMin($('.filterInputMin').val());
	});
	$('.filterInputMax').focusout(function() {
		map.setFilterMax($('.filterInputMax').val());
	});

	// select continent
	$('.selectContinent').change(function() {
		map.setContinent($('.selectContinent option:selected').val());
	});

	// select map projection
	$('.selectProjection').change(function() {
		var projId = $('.selectProjection option:selected').val();
		map.setProjection(projId);
		stopAnimation();
		$('.projectionIcon').attr('src', 'img/icon-' + projId + '.png');
	});
	
	// init chart
	var uiChart = new MapugeeUiChart();

	// hide on init
	$('.timeControl').hide();
	$('.arrowStats').hide();
	$('.yearHud').hide();
	$('.customFilter').hide()

	// close chart
	$('.closePathStats').click(function() {
		$('.arrowStats').hide('blind', 300);
	})
	return {
		uiChart: uiChart,
		stopAnimation: stopAnimation,
		isPlaying: isPlaying,
		makeLegend: makeLegend,
		domObjects: domObjects
	};
};