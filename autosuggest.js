(function($) {
'use strict';

$.fn.extend({
	mkAutosuggest: function(arg_options) {

		// setting some defaults (can be overwritten when calling mkAutosuggest)
		var defaults = {
			container_id: "autosuggest_what",
			element_id: "as_what_results",
			next_input_element: null,
			focus_class: "focused",
			no_results: "No matches found",
			max_results: 7,
			result_groups: ["one", "two"],
			result_group_labels: ["one", "two"] 
		},
		options = $.extend(defaults, arg_options),
		g_true_focus = true,
		g_webkit = window.navigator.userAgent.match(/webkit/gi) !== null,
		g_msie = window.navigator.userAgent.match(/msie/gi) !== null,
		cacheApiResult = {}, 
		current_ajax_req,
		_input = this;

		var hideContainer = function() {
			$("#" + options.container_id).slideUp(300);
			$("." + options.focus_class).removeClass(options.focus_class);
		};

		var showContainer = function() {
			$("#" + options.container_id).slideDown(300);
		};

		var focusItem = function(item) {
			$("#" + options.container_id + " li a." + options.focus_class).removeClass(options.focus_class);
			item.addClass(options.focus_class);
		};

		var focusNextItem = function(direction) {
			if ($("#" + options.container_id + ":visible").length > 0) {
				var other_list, focused_item = $("#" + options.container_id + " li a." + options.focus_class),
					focused_item_position = focused_item.attr("data-position");

				switch (direction) {
				case "l":
					if (focused_item.length > 0) {
						other_list = focused_item.closest("ul").prev();
						if (focused_item_position > other_list.find("li").length - 1) {
							focusItem(other_list.find("li").last().find("a"));
						} else {
							focusItem(other_list.find("li").eq(focused_item_position).find("a"));
						}
					}
					break;
				case "u":
					if (focused_item.length > 0) {
						focusItem(focused_item.parent().prev().find("a"));
					} else {
						focusItem($("#" + options.container_id + " ul:first li:last a"));
					}
					break;
				case "r":
					if (focused_item.length > 0) {
						other_list = focused_item.closest("ul").next();
						if (focused_item_position > other_list.find("li").length - 1) {
							focusItem(other_list.find("li").last().find("a"));
						} else {
							focusItem(other_list.find("li").eq(focused_item_position).find("a"));
						}
					}
					break;
				case "d":
					if (focused_item.length > 0) {
						focusItem(focused_item.parent().next().find("a"));
					} else {
						focusItem($("#" + options.container_id + " ul.has_results:first li:first a"));
					}
					break;
				default:
					focusItem($("#" + options.container_id + " ul.has_results:first li:first a"));
				}
			}
		};

		var highlightTerm = function(item, search_phrase) {
			return item.replace(new RegExp("(" + $.trim(search_phrase).replace(/\s/gi,"|") + ")", "gi"), "<em>$1</em>");
		};

		var displayResults = function(data) {
			var item, max, item_address, group, group_label, group_element,
				current_results = $("#" + options.container_id + ":visible").length > 0,
				results_html = $("<div id=" + options.element_id + "><div>"),
				has_results = false;
			
			for (var i = 0; i < options.result_groups.length; i += 1) {
				group = options.result_groups[i];
				group_label = options.result_group_labels[i];
				max = Math.min(data[group].length, options.max_results);
				group_element = $('<ul id="as_' + group + '" class="' + (max > 0 ? 'has_results' : 'empty') + '"></ul>');

				for (var j = 0; j < max; j += 1) {
					item = data[group][j];
					if(item.address != undefined){
						item_address = '<br/><address>' + [item.address.address_1, item.address.address_2, item.address.city, item.address.county, item.address.postal_code].join(", ").replace(/\s\,/g, "") + '</address>';
					}
					else{
						item_address = "";
					}
					$('<li><a ' + 
						'" data-' + group_label + '="' + item.name + 
						'" data-position="' + j + 
						'" href="#' + item.id + '">' + 
						highlightTerm(item.name, _input.val()) +
						item_address + 
					'</a></li>').appendTo(group_element);
					has_results = true;
				}

				if (data[group].length === 0) {
					$('<li class="no_results">' + options.no_results + '</li>').appendTo(group_element);
				}

				results_html.append(group_element);
			}

			if ((has_results || current_results) && _input.is(":focus")) {
				results_html.children().first().remove(); // remove empty child div
				$("#" + options.element_id).replaceWith(results_html);
				showContainer();
			}
		};

		var fetchResults = function(term) {
		  var cacheKey = term;
      
			if ($.trim(term).length > 2) {
				if(cacheKey in cacheApiResult) {
				    displayResults(cacheApiResult [ cacheKey ]);
				}
				else {
					if (current_ajax_req) {
						current_ajax_req.abort();
					}
					current_ajax_req = $.ajax({
						url: options.api_url,
						type: "GET",
						data: { 'term': term },
						dataType: "json"
					}).done(function(data) {
						cacheApiResult[ cacheKey ] = data;
						displayResults(data);
					}).fail(function(jqXHR, status) {
						console.log("Request failed: " + status);
					});
			   }
			} else {
				hideContainer();
			}
		};

		var updateInput = function(term) {
			_input.val(term.attr('data-name'));
		};
      
		var mapKeys = function(e) {
			e = e || window.event;

			var keypress = (g_webkit || g_msie) ? 'keydown' : 'keypress',
				keyup = g_msie ? 'keydown' : 'keyup',
				key = e.keyCode || e.which,
				focused_item = $("#" + options.container_id + " li a." + options.focus_class);

			// arrow keys
			if (e.type === keypress && key && (key > 36) && (key < 41)) {
				focusNextItem(["l", "u", "r", "d"][key - 37]);
			}
			// enter key (only if using a highlighted result)
			else if ((focused_item.length > 0) && e.type === keyup && key && key === 13) {
				e.preventDefault();
				updateInput(focused_item);
				hideContainer();
				if (g_msie && options.next_input_element != null) {
					$(options.next_input_element).focus();
				}
			}
			// tab key (only if using a highlighted result)
			else if ((focused_item.length > 0) && e.type === keypress && key && key === 9) {
				e.preventDefault();
				updateInput(focused_item);
				hideContainer();
				if (options.next_input_element != null) {
  				$(options.next_input_element).focus(); 
				}
			}
			// escape key
			else if (e.type === "keyup" && key && key === 27) {
				hideContainer();
			}
			// tab key
			else if (e.type === keypress && key && key === 9) {
				hideContainer();
			}
			// all other keys
			else if (e.type === "keyup" && key && key !== 16 && (key < 37 || key > 40)) {
				fetchResults(_input.val());
			} else {
				return;
			}
		};

		var init = function() {
			_input.on("keydown keyup keypress", function(e) {
				mapKeys(e);
			});

			// prevent form submission
			_input.closest("form").on("submit", function(e) {
				e.preventDefault();
				if (($("#" + options.container_id + " ." + options.focus_class).length === 0) && ($.trim(_input.val()) !== "")) {
					this.submit();
				}
			});

			// highlight items on hover
			$("#" + options.container_id).on("mouseover", "a", function() {
				focusItem($(this));
			});

			// update on item click
			$("#" + options.container_id).on("click", "a", function(e) {
				e.preventDefault();
				updateInput($(this));
				hideContainer();
				_input.focus();
			});

			// hide results and update input if necessary on click
			$(document).on("click", function() {
				if (!_input.is(':focus')) {
					hideContainer();
				}
			});

		};

		// initialize!
		init();
	}
});

})(jQuery);
