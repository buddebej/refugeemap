	/*global $*/

	$(document).ready(function() {
		'use strict';
		var map = new Mapugee('.mapContainer'),
			ui = new MapugeeUi(map);

		map.setUi(ui);
	});

	var groupNumber = function(num) {
			var str = parseInt(num).toString().split('.');
			if (str[0].length >= 4) {
				str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1,');
			}
			if (str[1] && str[1].length >= 4) {
				str[1] = str[1].replace(/(\d{3})/g, '$1 ');
			}
			return str.join('.');
	};