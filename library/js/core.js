/**
 * Create an accessible JavaScript carousel out of any unordered list of tiles. Each tile should be placed in a list item `li` within a container `ul`. Additional markup is generated by JavaScript, and several required style definitions are included in a global stylesheet. These styles are external instead of plugin-generated so they can be overridden easily if neccessary.
 * 
 * Tiles can contain any html content but must be equal in width. Measurement for the overall carousel and individual tiles is based on the width of the first tile. Height can vary, although because the images are lazy loaded, image heights are evaluated just-in-time. This can lead to a slight page jump if a hidden tile is taller than the visible tiles once its images are loaded. CSS can be used to style the "previous" and "next" buttons, as well as the pagination menu (if pagination is enabled).
 * 
 * Instantiate the carousel(s) by calling the plugin on an element or elements and passing an optional options object.
 * 
 * Requires x.js
 *
 * @demo demo.php
 * 
 * @example
 * SOURCE HTML STRUCTURE
 * <ul id="example-carousel" class="example-carousel">
 * 		<li class="carousel-item"><img src="library/images/test-image-1.jpg" alt="" /></li>
 * 		<li class="carousel-item"><img src="library/images/test-image-2.jpg" alt="" /></li>
 * 		<li class="carousel-item"><img src="library/images/test-image-3.jpg" alt="" /></li>
 * 		<li class="carousel-item"><img src="library/images/test-image-4.jpg" alt="" /></li>
 * 		<li class="carousel-item"><img src="library/images/test-image-5.jpg" alt="" /></li>
 * </ul>
 *
 * var options = {
 * 		parent: document.querySelector('.example-carousel')
 * }
 * var carousel1 = core();
 * carousel1.init(options);
 *	
 *	
 * @title Example #1: Default Instantiation
 * @syntax javascript
 * @desc Instantiation using default settings: single item carousel, one tile displayed at a time, advances one tile at a time, does not loop and does not display pagination. Note: the `carousel` class is not required for instantiation - any selector can be used.
 * 
 * 
 * @param Object options 
 * @option Number increment Number of tiles to display per frame. Default is 1.
 * @option String incrementMode Whether to move the carousel by frame or single tile. Accepted values are `frame` and `tile`. Default is `frame`.
 * @option Boolean encapsulateControls Default is `false`. If `true`, a wrapper is placed around the prev/next links and pagination and centered.
 * @option String prevText Default is `Previous`. Set controls previous button text.
 * @option String nextText Default is `Next`. Set controls next button text.
 * @option Number wrapperDelta Change wrapper width by this pixel value. Default is 0.
 * @option Number viewportDelta Change viewport width by this pixel value. Default is 0.
 * @option Function preFrameChange Callback fired before the transitional frame animation.
 * @option Function postFrameChange Callback fired after the transitional frame animation.
 * 
 * @name tileCarousel
 * @type jQuery
 * @author Ryan Fitzer and Travis Higdon
 */


!function( root, factory ) {
	if ( typeof define === 'function' && define.amd ) {
		// AMD. Register as an anonymous module.
		define(
		
			[
				'libary/js/x',
				'library/js/vendor/lodash.min'
			],
			
			factory
			
		);
	} else {
		// Browser globals
		root.carousel = factory(
			 	root.X,
			 	root._
			 );
	}
}(
	this,
	function( x, _ ) {
	
	'use strict';
	
	var defaults = {
			prevText: 'Previous',
			nextText: 'Next',
			increment: 1,
			incrementMode: 'frame', // tile or frame
			encapsulateControls: false,
			accessible: true,
			showTile: 0,
			wrapperDelta: 0,
			viewportDelta: 0,
			preFrameChange: null,
			postFrameChange: null
		};
	
	// Make sure to use the correct case for IE
	var ieTest = document.createElement( 'li' ).getAttributeNode( 'tabindex' ),
		tabindex = ieTest ? 'tabIndex' : 'tabindex';
	ieTest = null;
		
	
	// Compile templates
	var tmplWrapper = document.createElement( 'div' );
		tmplWrapper.setAttribute( 'class', 'carousel-container' );
		
	var tmplViewport = document.createElement( 'div' );
		tmplViewport.setAttribute( 'class', 'carousel-viewport' );
		
	var tmplPN = document.createElement( 'button' );
			
	var tmplPNDisabled = document.createElement( 'span' );
		tmplPNDisabled.setAttribute( 'class', 'disabled' );
	
	var tmplControls = document.createElement( 'div' );
		tmplControls.setAttribute( 'class', 'carousel-controls' );
		
	var tmplControlsParent = document.createElement( 'div' );
		tmplControlsParent.setAttribute( 'class', 'carousel-controls-wrapper' );
	
	var tmplPagination = document.createElement( 'ul' );
		tmplPagination.setAttribute( 'class', 'carousel-pagination' );
	
	var tmplCounter = document.createElement( 'div' );
		tmplCounter.setAttribute( 'class', 'carousel-display-counter' );
		
	var tmplSpacerTile = document.createElement( 'li' );
		tmplSpacerTile.setAttribute( 'class', 'carousel-panel-spacer state-hidden' );
	

	// - See more at: http:osric.com/chris/accidental-developer/2009/08/javascript-insertafter
	// Usage: nodeToInsertAfter.insertAfter(nodeToInsert);
	Object.prototype.insertAfter = function( newNode ) {
		this.parentNode.insertBefore( newNode, this.nextSibling );
	}
	
	
	
	
	var Core = function( x, options ) {
		this.log.msg( 'new Core instance created' );
		
		var self = this;
		
		self.x = x;
		x.state.init = false;
	}

	Core.prototype = {
		
		cacheObj: {},
		elementNode: null,
		element: null,
		parentNode: null,
		options: { id: 'options' },
		state: { test: 'test' },
		
		init: function( options ) {
			
			var self = this;
			this.elementNode = options.parent;
			this.element = options.parent;
			this.options = _.extend( defaults, options );
			
			// Make sure we have integers
			[ 'increment', 'speed', 'showTile', 'wrapperDelta', 'viewportDelta' ].forEach( function( el ) {
				self.options[ el ] = parseInt( self.options[ el ], 10 );
			});
			
			if ( this.x.state.init ) return;

			this.x.publish( 'beforeInit' );

			this.x.state.init = true;

			this.x.publish( 'afterInit' );
			
			this.setup();
			
		},

		setup: function() {
			var options			= this.options
				, self			= this
				, state			= self.state
				, carousel		= this.element
				, nextSibling	= this.elementNode.nextSibling
				, wrapper		= tmplWrapper
				, viewport		= tmplViewport
				, controls		= tmplControls
				, increment		= options.increment
				;
			
			// Make the main elements avaible to `this`
			this.parentNode = this.elementNode.parentNode;
			this.wrapper = wrapper;
			this.carousel = carousel;
			this.viewport = viewport;
			
			// Remove and build the carousel
			carousel.parentNode.removeChild( carousel );
			wrapper.appendChild( viewport );
			viewport.appendChild( carousel );
			
			// Replace the carousel
			if ( nextSibling ) nextSibling.insertAfter( wrapper );
			else parentNode.appendChild( wrapper );
			
			// Build out the frames and state object
			this.state = this.normalizeState();
			
			wrapper.style.margin = options.wrapperDelta + 'px';
			viewport.style.margin = options.viewportDelta + 'px';
			
			this.buildNavigation();
			
			// Cache array for lazy loader
			this.lazyloadCache = new Array( state.curTileLength );
			
			// Lazy load images
			// load only the visible frame
			this.lazyloadImages( state.index, state.index + options.increment );
			
			// Listen for focus on tiles		
			var panels = carousel.querySelectorAll( '.carousel-panel' );
			
			for( var i = 0, len = panels.length; i < len; ++i ) {
				this.addEvent( panels[ i ], 'focus', this.focusHandler );
				this.addEvent( panels[ i ], 'blur', this.focusHandler );
			}
			
		},
		
		focusHandler: function( e ) {
		
			var cls = ' state-focus';
			
			if ( e.type === 'focus' ) e.target.className = e.target.className + cls;
			else e.target.className = e.target.className.replace( cls, '' );
			
		},
		
		cache: function( key, value ) {
			
			var cache = this.cacheObj
				, query = cache[ key ] !== 'undefined' ? cache[ key ] : undefined
				;
			
			if ( !value ) return query;
				
			cache[ key ] = value;
			
			return cache;
			
		},
		
		normalizeState: function() {
			
			var index				= 0
				, state				= this.state
				, carousel			= this.carousel
				, tileArr			= carousel.children
				, origTiles			= tileArr
				, firstTile			= tileArr[ 0 ]
				, tileWidth			= firstTile.offsetWidth
				, tileHeight		= firstTile.offsetHeight
				, options			= this.options
				, increment			= options.increment
				, origTileLength	= tileArr.length
				, curTileLength		= origTileLength
				, frameLength		= Math.ceil( curTileLength / increment )
				, state = {
					index: index,
					offset: 0,
					spacers: 0,
					prevIndex: false,
					tileObj: tileArr,
					tileArr: tileArr,
					origTileLength: origTileLength,
					curTileLength: curTileLength,
					tileWidth: tileWidth,
					tileHeight: tileHeight,
					curTile: false,
					prevTile: false,
					frameArr: [],
					origFrameLength: frameLength,
					curFrameLength: frameLength,
					frameWidth: increment * tileWidth,
					curFrame: [],
					prevFrame: [],
					frameIndex: 0,
					prevFrameIndex: 0
				}
				;
			
			this.toggleAria( tileArr, 'add', 'carousel-panel' );
			
			// Build the normalized frames array
			for ( var sec = 0, len = tileArr.length / increment, count = 1; 
					sec < len; 
					sec++, count++ ) {
				var tile = Array.prototype.slice.call( tileArr, increment * sec, increment * count );
				state.frameArr.push( tile );
			};
			
			state.index				= index;
			state.offset			= state.index ? state.frameWidth : state.offset;
			state.tileArr			= tileArr;						
			state.tileObj			= state.tileArr;
			state.curTile			= state.tileObj[ state.index ];
			state.curTileLength		= state.tileArr.length;
			state.curFrameLength	= Math.ceil( state.curTileLength / increment );
			state.frameIndex		= Math.ceil( state.index / increment );
			state.prevFrameIndex	= state.frameIndex;
			state.curFrame			= state.frameArr[ state.frameIndex ];
			state.tileDelta			= ( increment * state.curFrameLength ) - state.curTileLength;
			
			this.toggleAria( state.curFrame, 'remove' );
			var tilePercent = ( parseInt( ( 100 / this.options.increment ) * 1000 ) ) / 1000
				, tileStyle = 'width: ' + tilePercent + '%; '
				;
				
			for ( var i = 0; i < tileArr.length; i++ ) {
				tileArr[ 0 ].setAttribute( 'style', tileStyle );
				tileArr[ 0 ].classList.add( 'component-container' );
				carousel.appendChild( tileArr[ 0 ] );
			}
			
			return state;
			
		},
		
		updateState: function( index, animate ) {

			var self				= this
				, state				= self.state
				, ops				= self.options
				, increment			= ops.increment
				, prevFrameIndex	= state.frameIndex
				, index				= index > state.curTileLength - increment ? state.curTileLength - increment
										: index < 0 ? 0
										: index
				, frameIndex		= Math.ceil( index / increment )
				, isFirstFrame		= index === 0
				, isLastFrame		= index === state.curTileLength - increment
				;
						
			_.extend( this.state, {
				index: index,
				offset: state.tileWidth * index,
				prevIndex: state.index,
				prevTile: state.curTile,
				curTile: isLastFrame && state.tileDelta && ops.incrementMode === 'frame'
							? state.tileArr[ index + state.tileDelta ]
							: state.tileArr[ index ],
				curFrame: Array.prototype.slice.call( state.tileArr, isLastFrame ? index : index, increment + index ),
				prevFrame: state.curFrame,
				frameIndex: frameIndex,
				prevFrameIndex: state.frameIndex
			});
				 
			animate && this.animate();
			
			return state;
		},
		
		animate: function() {
			
			var self = this
				, state = self.state
				, index = state.index
				, targetIndex = index
				, options = this.options
				, carousel = this.element
				, increment = options.increment
				, tileWidth = state.tileWidth
				, preFrameChange = options.preFrameChange
				, postFrameChange = options.postFrameChange
				, isFirst = index === 0
				, isLast = index === ( state.curTileLength - increment )
				;
			
			
			
			// Publish animation begin and call pre-animation option
			this.x.publish( 'preFrameChange' );
			preFrameChange && preFrameChange.call( self, state );
			
			
			carousel.setAttribute( 'class', 'state-busy' );
			self.toggleAria( state.tileArr, 'remove' );
			self.updateNavigation();
			self.toggleAria( state.tileArr, 'add' );
			self.toggleAria( state.curFrame, 'remove' );
			state.curTile.focus();
			carousel.className.replace( /\bstate-busy\b/, '' );
			
			
			// Publish animation end and call post-animation option
			this.x.publish( 'postFrameChange' );
			postFrameChange && postFrameChange.call( self, state );
						
		},
		
		lazyloadImages: function( start, stop ) {
			var self = this
				, tiles = self.state.tileObj
				;

			if ( this.lazyloadCache[ start ] ) return;
			
			for ( var i = start; i < stop; i++ ) {
								
				self.lazyloadCache[ i ] = true;
				
				var imgs = tiles[ i ].getElementsByTagName( 'img' );
				
				$('img', tiles[ i ] ).each( function() {
					
					if ( !this.src ) this.src = $( this ).attr( 'original' );

				});
			}
		},
		
		buildNavigation: function() {
			
			var text
				, self				= this
				, state				= this.state
				, index				= state.index
				, wrapper			= self.wrapper
				, options			= self.options
				, increment			= options.increment
				, controls			= tmplControls.cloneNode( true )
				, controlsParent	= tmplControlsParent.cloneNode( true )
				, controlsWrapper 	= options.encapsulateControls ? controls : wrapper
				, viewport			= self.viewport
				, viewportWidth		= state.tileWidth * options.increment + options.viewportDelta
				, prevFrame			= 'prevFrame'
				, nextFrame			= 'nextFrame'
				;
			
			text = options.prevText;
			self.prev = tmplPN.cloneNode( true );
			self.prev.setAttribute( 'class', prevFrame );
			self.prev.innerHTML = text;
			
			text = options.nextText;
			self.next = tmplPN.cloneNode( true );
			self.next.setAttribute( 'class', nextFrame );
			self.next.innerHTML = text;
			
			self.prevDisabled = tmplPNDisabled.cloneNode( true );
			self.prevDisabled.classList.add( prevFrame );
			self.nextDisabled = tmplPNDisabled.cloneNode( true );
			self.nextDisabled.classList.add( nextFrame );
			
			// Set original buttons
			self.prevBtn = self.prev;
			self.nextBtn = self.next;
				
			// Set click events buttons
			this.addEvent( this.parentNode, 'click', function( e ) {
				if ( e.target.nodeName == 'BUTTON' ) {
					var method = e.target.className;
					if ( method === 'prevFrame' || method === 'nextFrame' ) {
						self[ method ]();
					}
				}
			});
			
			// Disable buttons if there is only one frame
			if ( state.curTileLength <= options.increment ) {
				self.prevBtn = self.prevDisabled;
				self.nextBtn = self.nextDisabled;
			}
			
			// Disable prev button
			if ( index === 0 ) self.prevBtn = self.prevDisabled;
			
			// Insert controls
			if ( !options.encapsulateControls ) {
				
				wrapper.parentNode.insertBefore( self.prevBtn, wrapper );
				wrapper.parentNode.insertBefore( self.nextBtn, wrapper );
			
			} else {
				
				controlsParent.appendChild( controls );
				controls.appendChild( self.prevBtn );
				controls.appendChild( self.nextBtn );
				wrapper.appendChild( controlsParent );

				// Center controls beneath carousel
				var controlsWidth = self.prevBtn.clientWidth + self.nextBtn.clientWidth;
				
				var newStyle =
					'width: ' + controlsWidth + 'px,' +
					'left: ' + ( ( viewportWidth / 2 ) - ( controlsWidth / 2 ) ) + 'px';
				
				controls.setAttribute( 'style', newStyle );
				
			}
		},
		
		updateNavigation: function() {
			
			var prevDisabled
				, nextDisabled
				, self = this
				, state = this.state
				, index = state.index
				, options = self.options
				, isFirst = index === 0
				, isLast = index + this.options.increment >= state.curTileLength
				;
				
			prevDisabled = self.prevBtn !== self.prev;
			nextDisabled = self.nextBtn !== self.next;
										
			if ( isFirst ) this.toggleControl( 'prevBtn', 'prevDisabled', self );
			else if ( prevDisabled ) this.toggleControl( 'prevBtn', 'prev', self );

			if ( isLast ) this.toggleControl( 'nextBtn', 'nextDisabled', self );
			else if ( nextDisabled ) this.toggleControl( 'nextBtn', 'next', self );
		},
		
		prevFrame: function() {
			
			var index = this.state.index;
			
			if ( this.options.incrementMode === 'tile' ) index--;
			else index = index - this.options.increment;
			
			this.updateState( index, true );
			return this.carousel;
			
		},
		
		nextFrame: function() {
			
			var index = this.state.index;
			
			if ( this.options.incrementMode === 'tile' ) index++;
			else index = index + this.options.increment;
			
			this.updateState( index, true );
			return this.carousel;
			
		},
		
		reset: function() {
			
			var self = this
				, state = self.state
				, index = state.index
				, options = self.options
				;
			
			index = 0;
			
			self.updateState( index, true );
			
			return this.carousel;
			
		},
		
		
		toggleAria: function( itemArray, operation, initClass ) {
			
			var item
				, classes
				, i = 0
				, self = this
				, state = self.state
				, length = itemArray.length
				, ariaHClass = ' state-hidden'
				, ariaVClass = ' state-visible'
				, rAriaHClass = /\sstate-hidden/
				, rAriaVClass = /\sstate-visible/
				, rSpacerClass = /carousel-panel-spacer/
				, add = operation === 'add' ? true : false
				, initClass = initClass ? ' ' + initClass : ''
				, hasAriaInited = this.cache( 'hasAriaInited' )
				;
			
			for ( ; i < length; i++ ) {
				
				item = itemArray[ i ];
				classes = item.className + initClass;
				
				if ( rSpacerClass.test( classes ) ) continue;
				
				if ( add ) classes = classes.replace( rAriaVClass, ariaHClass );
				else classes = classes.replace( rAriaHClass, ariaVClass );
				
				item.className = classes.replace( /^\s/, '' );
				
				if ( !hasAriaInited ) {
					item.className = item.className + ariaHClass;
					item.setAttribute( tabindex, '-1' );
				}
																
				classes = null;
			}
						
			this.cache( 'hasAriaInited', true );
			
		},
		
		addEvent: function( obj, evt, fn, capture ) {
			if ( window.attachEvent ) {
				obj.attachEvent( 'on' + evt, fn );
			} else {
				if ( !capture ) capture = false;
				obj.addEventListener( evt, fn, capture )
			}
		},

		
		// Helper for updating buttons
		toggleControl: function( oldBtn, newBtn, obj ) {
			
			var parent = ( this.options.encapsulateControls ) ?
					this.parentNode.querySelector('.carousel-controls') :
					this.parentNode;
			
			parent.replaceChild( obj[ newBtn ], obj[ oldBtn ]);
			
			obj[ oldBtn ] = obj[ newBtn ];
		log: {
			enabled: true,
			msg: function( msg ) {
				if ( this.enabled ) console.log( msg );
			}
		}
	}

	window.core = function( extensions, options ) {
		
		var x = new X;

		for ( var i = 0; i < arguments.length; i++ ) {

			x.extend( arguments[ i ] );
		}
		
		
		var c = new Core( x, options );

		return {
			init: x.proxy( c, c.init )
		}
	}
	
	return {
		this: this
	}
});