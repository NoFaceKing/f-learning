/**
 * jquery.fbookblock.js v1.0.2
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2012, Codrops
 * http://www.codrops.com
 */
;
(function($, window, undefined) {

	'use strict';

	/*
	* debouncedresize: special jQuery event that happens once after a window resize
	*
	* latest version and complete README available on Github:
	* https://github.com/louisremi/jquery-smartresize/blob/master/jquery.debouncedresize.js
	*
	* Copyright 2011 @louis_remi
	* Licensed under the MIT license.
	*/
	var $event = $.event,
	$special,
	resizeTimeout;

	$special = $event.special.debouncedresize = {
		setup: function() {
			$( this ).on( "resize", $special.handler );
		},
		teardown: function() {
			$( this ).off( "resize", $special.handler );
		},
		handler: function( event, execAsap ) {
			// Save the context
			var context = this,
				args = arguments,
				dispatch = function() {
					// set correct event type
					event.type = "debouncedresize";
					$event.dispatch.apply( context, args );
				};

			if ( resizeTimeout ) {
				clearTimeout( resizeTimeout );
			}

			execAsap ?
				dispatch() :
				resizeTimeout = setTimeout( dispatch, $special.threshold );
		},
		threshold: 150
	};

	// global
	var $window = $(window),
		Modernizr = window.Modernizr;

	$.fBookBlock = function(options, element) {

		this.$el = $(element);
		this._init(options);

	};

	// the options
	$.fBookBlock.defaults = {
		// speed for the flip transition in ms
		speed : 1000,
		// easing for the flip transition
		easing : 'ease-in-out',
		// if set to true, both the flipping page and the sides will have an overlay to simulate shadows
		shadows : true,
		// opacity value for the "shadow" on both sides (when the flipping page is over it)
		// value : 0.1 - 1
		shadowSides : 0.2,
		// opacity value for the "shadow" on the flipping page (while it is flipping)
		// value : 0.1 - 1
		shadowFlip : 0.1,
		// perspective value
		perspective : 1300,
		// if we should show the first item after reaching the end
		circular : false,
		// if we want to specify a selector that triggers the next() function. example: '#fbb-nav-next'
		nextEl : '',
		// if we want to specify a selector that triggers the prev() function
		prevEl : '',
		// autoplay. If true it overwrites the circular option to true
		autoplay : false,
		// time (ms) between page switch, if autoplay is true
		interval : 3000,
		//if we want to navigate the slides with the keyboard arrows
		keyboard : true,
		// callback after the flip transition
		// old is the index of the previous item
		// page is the current item's index
		// isLimit is true if the current page is the last one (or the first one)
		onEndFlip : function(old, page, isLimit) {
			return false;
		},
		// callback before the flip transition
		// page is the current item's index
		onBeforeFlip : function(page) {
			return false;
		}
	};

	$.fBookBlock.prototype = {

		_init: function(options) {

			// options
			this.options = $.extend(true, {}, $.fBookBlock.defaults, options);
			// set the perspective
			this.$el.css('perspective', this.options.perspective);
			// items
			this.$items = this.$el.children('.fbb-item');
			// total items
			this.itemsCount = this.$items.length;
			// current item's index
			this.current = 0;
			// previous item's index
			this.previous = -1;
			// show first item
			this.$current = this.$items.eq(this.current).show();
			// get width of this.$el
			// this will be necessary to create the flipping layout
			this.elWidth = this.$el.width();
			var transEndEventNames = {
				'WebkitTransition': 'webkitTransitionEnd',
				'MozTransition': 'transitionend',
				'OTransition': 'oTransitionEnd',
				'msTransition': 'MSTransitionEnd',
				'transition': 'transitionend'
			};
			this.transEndEventName = transEndEventNames[Modernizr.prefixed('transition')] + '.fbookblock';
			// support (3dtransforms && transitions)
			this.support = Modernizr.csstransitions && Modernizr.csstransforms3d;
			// initialize/bind some events
			this._initEvents();
			// start slideshow
			if (this.options.autoplay) {

				this.options.circular = true;
				this._startSlideshow();

			}

		},
		_initEvents: function() {

			var self = this;

			if (this.options.nextEl !== '') {

				$(this.options.nextEl).on('click.fbookblock', function() {

					self._action('next');
					return false;

				});

			}

			if (this.options.prevEl !== '') {

				$(this.options.prevEl).on('click.fbookblock', function() {

					self._action('prev');
					return false;

				});

			}

			if (this.options.keyboard == true) {
				$(document).keydown(function(e) {
					var keyCode = e.keyCode || e.which,
						arrow = {
							left : 37,
							up : 38,
							right : 39,
							down : 40
						};

					switch (keyCode) {
						case arrow.left:
							self._action('prev');
							break;
						case arrow.right:
							self._action('next');
							break;
					}
				});
			}

			$window.on( 'debouncedresize', function() {
							
				// update width value
				self.elWidth = self.$el.width();

			} )

		},
		_action : function(dir, page) {

			this._stopSlideshow();
			this._navigate(dir, page);

		},
		_navigate: function(dir, page) {

			if (this.isAnimating) {
				return false;
			}

			// callback trigger
			this.options.onBeforeFlip(this.current);

			this.isAnimating = true;
			this.$current = this.$items.eq(this.current);

			if (page !== undefined) {

				this.current = page;

			} else if (dir === 'next') {

				if (!this.options.circular && this.current === this.itemsCount - 1) {

					this.end = true;

				} else {

					this.previous = this.current;
					this.current = this.current < this.itemsCount - 1 ? this.current + 1 : 0;

				}

			} else if (dir === 'prev') {

				if (!this.options.circular && this.current === 0) {

					this.end = true;

				} else {

					this.previous = this.current;
					this.current = this.current > 0 ? this.current - 1 : this.itemsCount - 1;

				}

			}

			this.$nextItem = !this.options.circular && this.end ? this.$current : this.$items.eq(this.current);
			
			if (!this.support) {

				this._layoutNoSupport(dir);

			} else {

				this._layout(dir);

			}

		},
		// with no support we consider no 3d transforms and transitions
		_layoutNoSupport: function(dir) {

			this.$items.hide();
			this.$nextItem.show();
			this.end = false;
			this.isAnimating = false;
			var isLimit = dir === 'next' && this.current === this.itemsCount - 1 || dir === 'prev' && this.current === 0;
			// callback trigger
			this.options.onEndFlip(this.previous, this.current, isLimit);

		},
		// creates the necessary layout for the 3d animation, and triggers the transitions
		_layout: function(dir) {

			var self = this,

				// basic structure:
				// 1 element for the left side.
				$s_left = this._addSide('left', dir),
				// 1 element for the flipping/middle page
				$s_middle = this._addSide('middle', dir),
				// 1 element for the right side
				$s_right = this._addSide('right', dir),
				// overlays
				$o_left = $s_left.find('div.fbb-overlay'),
				$o_middle_f = $s_middle.find('div.fbb-flipoverlay:first'),
				$o_middle_b = $s_middle.find('div.fbb-flipoverlay:last'),
				$o_right = $s_right.find('div.fbb-overlay'),
				speed = this.end ? 400 : this.options.speed;

			this.$items.hide();
			this.$el.prepend($s_left, $s_middle, $s_right);

			$s_middle.css({
				transition: 'all ' + speed + 'ms ' + this.options.easing
			}).on(this.transEndEventName, function(event) {

				if (event.target.className === 'fbb-page') {

					self.$el.children('div.fbb-page').remove();
					self.$nextItem.show();

					self.end = false;
					self.isAnimating = false;

					var isLimit = dir === 'next' && self.current === self.itemsCount - 1 || dir === 'prev' && self.current === 0;

					// callback trigger
					self.options.onEndFlip(self.previous, self.current, isLimit);

				}

			});

			if (dir === 'prev') {
				$s_middle.css({ transform: 'rotateY(-180deg)' });
			}

			// overlays
			if (this.options.shadows && !this.end) {

				var o_left_style = (dir === 'next') ? {
					transition: 'opacity ' + this.options.speed / 2 + 'ms ' + 'linear' + ' ' + this.options.speed / 2 + 'ms'
				} : {
					transition: 'opacity ' + this.options.speed / 2 + 'ms ' + 'linear',
					opacity: this.options.shadowSides
				},
					o_middle_f_style = (dir === 'next') ? {
						transition: 'opacity ' + this.options.speed / 2 + 'ms ' + 'linear'
					} : {
						transition: 'opacity ' + this.options.speed / 2 + 'ms ' + 'linear' + ' ' + this.options.speed / 2 + 'ms',
						opacity: this.options.shadowFlip
					},
					o_middle_b_style = (dir === 'next') ? {
						transition: 'opacity ' + this.options.speed / 2 + 'ms ' + 'linear' + ' ' + this.options.speed / 2 + 'ms',
						opacity: this.options.shadowFlip
					} : {
						transition: 'opacity ' + this.options.speed / 2 + 'ms ' + 'linear'
					},
					o_right_style = (dir === 'next') ? {
						transition: 'opacity ' + this.options.speed / 2 + 'ms ' + 'linear',
						opacity: this.options.shadowSides
					} : {
						transition: 'opacity ' + this.options.speed / 2 + 'ms ' + 'linear' + ' ' + this.options.speed / 2 + 'ms'
					};

				$o_middle_f.css(o_middle_f_style);
				$o_middle_b.css(o_middle_b_style);
				$o_left.css(o_left_style);
				$o_right.css(o_right_style);

			}

			setTimeout(function() {

				var style = dir === 'next' ? 'rotateY(-180deg)' : 'rotateY(0deg)';

				if (self.end) {
					// first && last pages lift up 15 deg when we can't go further
					style = dir === 'next' ? 'rotateY(-15deg)' : 'rotateY(-165deg)';
				}

				$s_middle.css({transform: style});

				// overlays
				if (self.options.shadows && !self.end) {

					$o_middle_f.css({
						opacity: dir === 'next' ? self.options.shadowFlip : 0
					});

					$o_middle_b.css({
						opacity: dir === 'next' ? 0 : self.options.shadowFlip
					});

					$o_left.css({
						opacity: dir === 'next' ? self.options.shadowSides : 0
					});

					$o_right.css({
						opacity: dir === 'next' ? 0 : self.options.shadowSides
					});

				}


			}, 30);

		},
		// adds the necessary sides (fbb-page) to the layout 
		_addSide: function(side, dir) {

			var $side;

			switch (side) {

			case 'left':
					/*
					<div class="fbb-page" style="z-index:2;">
						<div class="fbb-back">
							<div class="fbb-outer">
								<div class="fbb-content">
									<div class="fbb-inner">
										dir==='next' ? [content of current page] : [content of next page]
									</div>
								</div>
								<div class="fbb-overlay"></div>
							</div>
						</div>
					</div>
					*/
				$side = $('<div class="fbb-page"><div class="fbb-back"><div class="fbb-outer"><div class="fbb-content" style="width:' + this.elWidth + 'px"><div class="fbb-inner">' + (dir === 'next' ? this.$current.html() : this.$nextItem.html()) + '</div></div><div class="fbb-overlay"></div></div></div></div>').css('z-index', 102);
				break;

			case 'middle':
					/*
					<div class="fbb-page" style="z-index:3;">
						<div class="fbb-front">
							<div class="fbb-outer">
								<div class="fbb-content">
									<div class="fbb-inner">
										dir==='next' ? [content of current page] : [content of next page]
									</div>
								</div>
								<div class="fbb-flipoverlay"></div>
							</div>
						</div>
						<div class="fbb-back">
							<div class="fbb-outer">
								<div class="fbb-content">
									<div class="fbb-inner">
										dir==='next' ? [content of next page] : [content of current page]
									</div>
								</div>
								<div class="fbb-flipoverlay"></div>
							</div>
						</div>
					</div>
					*/
				$side = $('<div class="fbb-page"><div class="fbb-front"><div class="fbb-outer"><div class="fbb-content" style="left:' + (-this.elWidth / 2) + 'px;width:' + this.elWidth + 'px"><div class="fbb-inner">' + (dir === 'next' ? this.$current.html() : this.$nextItem.html()) + '</div></div><div class="fbb-flipoverlay"></div></div></div><div class="fbb-back"><div class="fbb-outer"><div class="fbb-content" style="width:' + this.elWidth + 'px"><div class="fbb-inner">' + (dir === 'next' ? this.$nextItem.html() : this.$current.html()) + '</div></div><div class="fbb-flipoverlay"></div></div></div></div>').css('z-index', 103);
				break;

			case 'right':
					/*
					<div class="fbb-page" style="z-index:1;">
						<div class="fbb-front">
							<div class="fbb-outer">
								<div class="fbb-content">
									<div class="fbb-inner">
										dir==='next' ? [content of next page] : [content of current page]
									</div>
								</div>
								<div class="fbb-overlay"></div>
							</div>
						</div>
					</div>
					*/
				$side = $('<div class="fbb-page"><div class="fbb-front"><div class="fbb-outer"><div class="fbb-content" style="left:' + (-this.elWidth / 2) + 'px;width:' + this.elWidth + 'px"><div class="fbb-inner">' + (dir === 'next' ? this.$nextItem.html() : this.$current.html()) + '</div></div><div class="fbb-overlay"></div></div></div></div>').css('z-index', 101);
				break;

			}

			return $side;

		},
		_startSlideshow: function() {

			var self = this;

			this.slideshow = setTimeout(function() {

				self._navigate('next');

				if (self.options.autoplay) {
					self._startSlideshow();
				}

			}, this.options.interval);

		},
		_stopSlideshow: function() {

			if (this.options.autoplay) {

				clearTimeout(this.slideshow);
				this.options.autoplay = false;

			}

		},
		// public method: flips next
		next: function() {
			this._action('next');
		},
		// public method: flips back
		prev: function() {
			this._action('prev');
		},
		// public method: goes to a specific page
		jump: function(page) {

			page -= 1;

			if (page === this.current || page >= this.itemsCount || page < 0) {
				return false;
			}

			this._action(page > this.current ? 'next' : 'prev', page);

		},
		// public method: check if isAnimating is true
		isActive: function() {
			return this.isAnimating;
		},
		// public method: dynamically adds new elements
		// call this method after inserting new "fbb-item" elements inside the fBookBlock
		update : function () {

			var $currentItem = this.$items.eq( this.current );
			this.$items = this.$el.children('.fbb-item');
			this.itemsCount = this.$items.length;
			this.current = $currentItem.index();

		}

	};

	var logError = function(message) {
		if (window.console) {
			window.console.error(message);
		}
	};

	$.fn.fbookblock = function(options) {

		var instance = $.data(this, 'fbookblock');

		if (typeof options === 'string') {

			var args = Array.prototype.slice.call(arguments, 1);

			this.each(function() {

				if (!instance) {

					logError("cannot call methods on fbookblock prior to initialization; " + "attempted to call method '" + options + "'");
					return;

				}

				if (!$.isFunction(instance[options]) || options.charAt(0) === "_") {

					logError("no such method '" + options + "' for fbookblock instance");
					return;

				}

				instance[options].apply(instance, args);

			});

		} else {

			this.each(function() {

				if (instance) {

					instance._init();

				} else {

					instance = $.data(this, 'fbookblock', new $.fBookBlock(options, this));

				}

			});

		}

		return instance;

	};

})(jQuery, window);