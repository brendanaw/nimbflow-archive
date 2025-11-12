

/* ================== public/assets/js/src/_forms.js =================== */


(function ($, window, document, undefined) {
  "use strict";

  // Create the defaults once
  var pluginName = "WordpressUlikeAjaxForms",
    $window = $(window),
    $document = $(document),
    defaults = {};

  // The actual plugin constructor
  function Plugin(element, options) {
    this.element = element;
    this.$element = $(element);
    this.settings = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;

    this.form = this.$element.find("form");

    this.init();
  }

  // Avoid Plugin.prototype conflicts
  $.extend(Plugin.prototype, {
    init: function () {
      // Call _ajaxify function on click button
      this.form.on("submit", this._submit.bind(this));
    },

    /**
     * global AJAX callback
     */
    _ajax: function (args, callback) {
      // Do Ajax & update default value
      $.ajax({
        url: UlikeProCommonConfig.AjaxUrl,
        type: "POST",
        cache: false,
        dataType: "json",
        data: args,
      }).done(callback);
    },

    /**
     * init ulike core process
     */
    _submit: function (event) {
      event.preventDefault();
      event.stopPropagation();

      // Manipulations
      $document.trigger("UlpAjaxFormStarted", [this.element]);

      this.currentForm = $(event.currentTarget);
      this.buttonElement = this.currentForm.find(".ulp-button");

      var values = {};
      $.each(this.currentForm.serializeArray(), function () {
        if (values[this.name] !== undefined) {
          if (!values[this.name].push) {
            values[this.name] = [values[this.name]];
          }
          values[this.name].push(this.value || "");
        } else {
          values[this.name] = this.value || "";
        }
      });

      // Disable button
      this.buttonElement.prop("disabled", true);
      // Add progress class
      this.currentForm.addClass("ulp-loading");
      // submit form data
      this._submitFormData(values);
    },

    _submitFormData: function (args) {
      // Start AJAX process
      this._ajax(
        args,
        function (response) {
          // if has nested ajax levels
          if (
            typeof response.data.action !== "undefined" &&
            response.data.action
          ) {
            this._submitFormData(response.data);
          }

          // Add progress class
          this.currentForm.removeClass("ulp-loading");
          // Re-enable button
          this.buttonElement.prop("disabled", false);

          if (
            typeof response.data.message !== "undefined" &&
            response.data.message
          ) {
            this._sendNotification(response.data.status, response.data.message);
          }

          if (
            typeof response.data.fragments !== "undefined" &&
            response.data.fragments
          ) {
            $.each(response.data.fragments, function (key, value) {
              switch (value.method) {
                case "prepend":
                  $(key).prepend(value.content);
                  break;

                case "hidden":
                  $(key).addClass("ulp-hidden-visually");
                  break;

                default:
                  $(key).append(value.content);
                  break;
              }
            });
          }

          if (
            typeof response.data.replace !== "undefined" &&
            response.data.replace
          ) {
            this.currentForm.replaceWith(response.data.replace);
          }

          // Add new trigger when process finished
          $document.trigger("UlpAjaxFormEnded", [this.element, response]);

          if (
            typeof response.data.refresh !== "undefined" &&
            response.data.refresh
          ) {
            location.reload();
          }

          if (
            typeof response.data.redirect !== "undefined" &&
            response.data.redirect
          ) {
            window.location.replace(response.data.redirect);
          }
        }.bind(this)
      );
    },

    /**
     * Send notification by 'WordpressUlikeNotifications' plugin
     */
    _sendNotification: function (messageType, messageText) {
      // Display Notification
      $(document.body).WordpressUlikeNotifications({
        messageType: messageType,
        messageText: messageText,
      });
    },
  });

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);


/* ================== public/assets/js/src/_modal.js =================== */


(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['jquery'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node/CommonJS
		module.exports = function (root, jQuery) {
			if (jQuery === undefined) {
				// require('jQuery') returns a factory that requires window to
				// build a jQuery instance, we normalize how we use modules
				// that require this pattern but the window provided is a noop
				// if it's defined (how jquery works)
				if (typeof window !== 'undefined') {
					jQuery = require('jquery');
				} else {
					jQuery = require('jquery')(root);
				}
			}
			factory(jQuery);
			return jQuery;
		};
	} else {
		// Browser globals
		factory(jQuery);
	}
})(function($) {
	"use strict";

	if('undefined' === typeof $) {
		if('console' in window){ window.console.info('Too much lightness, WordpressUlikeAjaxModal needs jQuery.'); }
		return;
	}
	if($.fn.jquery.match(/-ajax/)) {
		if('console' in window){ window.console.info('WordpressUlikeAjaxModal needs regular jQuery, not the slim version.'); }
		return;
	}
	/* WordpressUlikeAjaxModal is exported as $.ulpmodal.
	   It is a function used to open a ulpmodal lightbox.

	   [tech]
	   WordpressUlikeAjaxModal uses prototype inheritance.
	   Each opened lightbox will have a corresponding object.
	   That object may have some attributes that override the
	   prototype's.
	   Extensions created with WordpressUlikeAjaxModal.extend will have their
	   own prototype that inherits from WordpressUlikeAjaxModal's prototype,
	   thus attributes can be overriden either at the object level,
	   or at the extension level.
	   To create callbacks that chain themselves instead of overriding,
	   use chainCallbacks.
	   For those familiar with CoffeeScript, this correspond to
	   WordpressUlikeAjaxModal being a class and the Gallery being a class
	   extending WordpressUlikeAjaxModal.
	   The chainCallbacks is used since we don't have access to
	   CoffeeScript's `super`.
	*/

	function WordpressUlikeAjaxModal($content, config) {
		if(this instanceof WordpressUlikeAjaxModal) {  /* called with new */
			this.id = WordpressUlikeAjaxModal.id++;
			this.setup($content, config);
			this.chainCallbacks(WordpressUlikeAjaxModal._callbackChain);
		} else {
			var fl = new WordpressUlikeAjaxModal($content, config);
			fl.open();
			return fl;
		}
	}

	var opened = [],
		pruneOpened = function(remove) {
			opened = $.grep(opened, function(fl) {
				return fl !== remove && fl.$instance.closest('body').length > 0;
			} );
			return opened;
		};

	// Removes keys of `set` from `obj` and returns the removed key/values.
	function slice(obj, set) {
		var r = {};
		for (var key in obj) {
			if (key in set) {
				r[key] = obj[key];
				delete obj[key];
			}
		}
		return r;
	}

	// NOTE: List of available [iframe attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe).
	var iFrameAttributeSet = {
		allow: 1, allowfullscreen: 1, frameborder: 1, height: 1, longdesc: 1, marginheight: 1, marginwidth: 1,
		mozallowfullscreen: 1, name: 1, referrerpolicy: 1, sandbox: 1, scrolling: 1, src: 1, srcdoc: 1, style: 1,
		webkitallowfullscreen: 1, width: 1
	};

	// Converts camelCased attributes to dasherized versions for given prefix:
	//   parseAttrs({hello: 1, hellFrozeOver: 2}, 'hell') => {froze-over: 2}
	function parseAttrs(obj, prefix) {
		var attrs = {},
			regex = new RegExp('^' + prefix + '([A-Z])(.*)');
		for (var key in obj) {
			var match = key.match(regex);
			if (match) {
				var dasherized = (match[1] + match[2].replace(/([A-Z])/g, '-$1')).toLowerCase();
				attrs[dasherized] = obj[key];
			}
		}
		return attrs;
	}

	/* document wide key handler */
	var eventMap = { keyup: 'onKeyUp', resize: 'onResize' };

	var globalEventHandler = function(event) {
		$.each(WordpressUlikeAjaxModal.opened().reverse(), function() {
			if (!event.isDefaultPrevented()) {
				if (false === this[eventMap[event.type]](event)) {
					event.preventDefault(); event.stopPropagation(); return false;
			  }
			}
		});
	};

	var toggleGlobalEvents = function(set) {
			if(set !== WordpressUlikeAjaxModal._globalHandlerInstalled) {
				WordpressUlikeAjaxModal._globalHandlerInstalled = set;
				var events = $.map(eventMap, function(_, name) { return name+'.'+WordpressUlikeAjaxModal.prototype.namespace; } ).join(' ');
				$(window)[set ? 'on' : 'off'](events, globalEventHandler);
			}
		};

	WordpressUlikeAjaxModal.prototype = {
		constructor: WordpressUlikeAjaxModal,
		/*** defaults ***/
		/* extend ulpmodal with defaults and methods */
		namespace:      'ulpmodal',        /* Name of the events and css class prefix */
		targetAttr:     'data-ulpmodal',   /* Attribute of the triggered element that contains the selector to the lightbox content */
		variant:        null,                  /* Class that will be added to change look of the lightbox */
		resetCss:       false,                 /* Reset all css */
		background:     null,                  /* Custom DOM for the background, wrapper and the closebutton */
		openTrigger:    'click',               /* Event that triggers the lightbox */
		closeTrigger:   'click',               /* Event that triggers the closing of the lightbox */
		filter:         null,                  /* Selector to filter events. Think $(...).on('click', filter, eventHandler) */
		root:           'body',                /* Where to append ulpmodals */
		openSpeed:      250,                   /* Duration of opening animation */
		closeSpeed:     250,                   /* Duration of closing animation */
		closeOnClick:   'background',          /* Close lightbox on click ('background', 'anywhere' or false) */
		closeOnEsc:     true,                  /* Close lightbox when pressing esc */
		closeIcon:      '&#10005;',            /* Close icon */
		loading:        '',                    /* Content to show while initial content is loading */
		persist:        false,                 /* If set, the content will persist and will be shown again when opened again. 'shared' is a special value when binding multiple elements for them to share the same content */
		otherClose:     null,                  /* Selector for alternate close buttons (e.g. "a.close") */
		beforeOpen:     $.noop,                /* Called before open. can return false to prevent opening of lightbox. Gets event as parameter, this contains all data */
		beforeContent:  $.noop,                /* Called when content is loaded. Gets event as parameter, this contains all data */
		beforeClose:    $.noop,                /* Called before close. can return false to prevent closing of lightbox. Gets event as parameter, this contains all data */
		afterOpen:      $.noop,                /* Called after open. Gets event as parameter, this contains all data */
		afterContent:   $.noop,                /* Called after content is ready and has been set. Gets event as parameter, this contains all data */
		afterClose:     $.noop,                /* Called after close. Gets event as parameter, this contains all data */
		onKeyUp:        $.noop,                /* Called on key up for the frontmost ulpmodal */
		onResize:       $.noop,                /* Called after new content and when a window is resized */
		type:           null,                  /* Specify type of lightbox. If unset, it will check for the targetAttrs value. */
		contentFilters: ['jquery', 'image', 'html', 'ajax', 'iframe', 'text'], /* List of content filters to use to determine the content */

		/*** methods ***/
		/* setup iterates over a single instance of ulpmodal and prepares the background and binds the events */
		setup: function(target, config){
			/* all arguments are optional */
			if (typeof target === 'object' && target instanceof $ === false && !config) {
				config = target;
				target = undefined;
			}

			var self = $.extend(this, config, {target: target}),
				css = !self.resetCss ? self.namespace : self.namespace+'-reset', /* by adding -reset to the classname, we reset all the default css */
				$background = $(self.background || [
					'<div class="'+css+'-loading '+css+'">',
						'<div class="'+css+'-content">',
							'<button class="'+css+'-close-icon '+ self.namespace + '-close" aria-label="Close">',
								self.closeIcon,
							'</button>',
							'<div class="'+self.namespace+'-inner">' + self.loading + '</div>',
						'</div>',
					'</div>'].join('')),
				closeButtonSelector = '.'+self.namespace+'-close' + (self.otherClose ? ',' + self.otherClose : '');

			self.$instance = $background.clone().addClass(self.variant); /* clone DOM for the background, wrapper and the close button */

			/* close when click on background/anywhere/null or closebox */
			self.$instance.on(self.closeTrigger+'.'+self.namespace, function(event) {
				if(event.isDefaultPrevented()) {
					return;
				}
				var $target = $(event.target);
				if( ('background' === self.closeOnClick  && $target.is('.'+self.namespace))
					|| 'anywhere' === self.closeOnClick
					|| $target.closest(closeButtonSelector).length ){
					self.close(event);
					event.preventDefault();
				}
			});

			return this;
		},

		/* this method prepares the content and converts it into a jQuery object or a promise */
		getContent: function(){
			if(this.persist !== false && this.$content) {
				return this.$content;
			}
			var self = this,
				filters = this.constructor.contentFilters,
				readTargetAttr = function(name){ return self.$currentTarget && self.$currentTarget.attr(name); },
				targetValue = readTargetAttr(self.targetAttr),
				data = self.target || targetValue || '';

			/* Find which filter applies */
			var filter = filters[self.type]; /* check explicit type like {type: 'image'} */

			/* check explicit type like data-ulpmodal="image" */
			if(!filter && data in filters) {
				filter = filters[data];
				data = self.target && targetValue;
			}
			data = data || readTargetAttr('href') || '';

			/* check explicity type & content like {image: 'photo.jpg'} */
			if(!filter) {
				for(var filterName in filters) {
					if(self[filterName]) {
						filter = filters[filterName];
						data = self[filterName];
					}
				}
			}

			/* otherwise it's implicit, run checks */
			if(!filter) {
				var target = data;
				data = null;
				$.each(self.contentFilters, function() {
					filter = filters[this];
					if(filter.test)  {
						data = filter.test(target);
					}
					if(!data && filter.regex && target.match && target.match(filter.regex)) {
						data = target;
					}
					return !data;
				});
				if(!data) {
					if('console' in window){ window.console.error('WordpressUlikeAjaxModal: no content filter found ' + (target ? ' for "' + target + '"' : ' (no target specified)')); }
					return false;
				}
			}
			/* Process it */
			return filter.process.call(self, data);
		},

		/* sets the content of $instance to $content */
		setContent: function($content){
      this.$instance.removeClass(this.namespace+'-loading');

      /* we need a special class for the iframe */
      this.$instance.toggleClass(this.namespace+'-iframe', $content.is('iframe'));

      /* replace content by appending to existing one before it is removed
         this insures that ulpmodal-inner remain at the same relative
         position to any other items added to ulpmodal-content */
      this.$instance.find('.'+this.namespace+'-inner')
        .not($content)                /* excluded new content, important if persisted */
        .slice(1).remove().end()      /* In the unexpected event where there are many inner elements, remove all but the first one */
        .replaceWith($.contains(this.$instance[0], $content[0]) ? '' : $content);

      this.$content = $content.addClass(this.namespace+'-inner');

      return this;
		},

		/* opens the lightbox. "this" contains $instance with the lightbox, and with the config.
			Returns a promise that is resolved after is successfully opened. */
		open: function(event){
			var self = this;
			self.$instance.hide().appendTo(self.root);
			if((!event || !event.isDefaultPrevented())
				&& self.beforeOpen(event) !== false) {

				if(event){
					event.preventDefault();
				}
				var $content = self.getContent();

				if($content) {
					opened.push(self);

					toggleGlobalEvents(true);

					self.$instance.fadeIn(self.openSpeed);
					self.beforeContent(event);

					/* Set content and show */
					return $.when($content)
						.always(function($openendContent){
							if($openendContent) {
								self.setContent($openendContent);
								self.afterContent(event);
							}
						})
						.then(self.$instance.promise())
						/* Call afterOpen after fadeIn is done */
						.done(function(){ self.afterOpen(event); });
				}
			}
			self.$instance.detach();
			return $.Deferred().reject().promise();
		},

		/* closes the lightbox. "this" contains $instance with the lightbox, and with the config
			returns a promise, resolved after the lightbox is successfully closed. */
		close: function(event){
			var self = this,
				deferred = $.Deferred();

			if(self.beforeClose(event) === false) {
				deferred.reject();
			} else {

				if (0 === pruneOpened(self).length) {
					toggleGlobalEvents(false);
				}

				self.$instance.fadeOut(self.closeSpeed,function(){
					self.$instance.detach();
					self.afterClose(event);
					deferred.resolve();
				});
			}
			return deferred.promise();
		},

		/* resizes the content so it fits in visible area and keeps the same aspect ratio.
				Does nothing if either the width or the height is not specified.
				Called automatically on window resize.
				Override if you want different behavior. */
		resize: function(w, h) {
			if (w && h) {
				/* Reset apparent image size first so container grows */
				this.$content.css('width', '').css('height', '');
				/* Calculate the worst ratio so that dimensions fit */
				 /* Note: -1 to avoid rounding errors */
				var ratio = Math.max(
					w  / (this.$content.parent().width()-1),
					h / (this.$content.parent().height()-1));
				/* Resize content */
				if (ratio > 1) {
					ratio = h / Math.floor(h / ratio); /* Round ratio down so height calc works */
					this.$content.css('width', '' + w / ratio + 'px').css('height', '' + h / ratio + 'px');
				}
			}
		},

		/* Utility function to chain callbacks
		   [Warning: guru-level]
		   Used be extensions that want to let users specify callbacks but
		   also need themselves to use the callbacks.
		   The argument 'chain' has callback names as keys and function(super, event)
		   as values. That function is meant to call `super` at some point.
		*/
		chainCallbacks: function(chain) {
			for (var name in chain) {
				this[name] = $.proxy(chain[name], this, $.proxy(this[name], this));
			}
		}
	};

	$.extend(WordpressUlikeAjaxModal, {
		id: 0,                                    /* Used to id single ulpmodal instances */
		autoBind:       '[data-ulpmodal]',    /* Will automatically bind elements matching this selector. Clear or set before onReady */
		defaults:       WordpressUlikeAjaxModal.prototype,   /* You can access and override all defaults using $.ulpmodal.defaults, which is just a synonym for $.ulpmodal.prototype */
		/* Contains the logic to determine content */
		contentFilters: {
			jquery: {
				regex: /^[#.]\w/,         /* Anything that starts with a class name or identifiers */
				test: function(elem)    { return elem instanceof $ && elem; },
				process: function(elem) { return this.persist !== false ? $(elem) : $(elem).clone(true); }
			},
			image: {
				regex: /\.(png|jpg|jpeg|gif|tiff?|bmp|svg)(\?\S*)?$/i,
				process: function(url)  {
					var self = this,
						deferred = $.Deferred(),
						img = new Image(),
						$img = $('<img src="'+url+'" alt="" class="'+self.namespace+'-image" />');
					img.onload  = function() {
						/* Store naturalWidth & height for IE8 */
						$img.naturalWidth = img.width; $img.naturalHeight = img.height;
						deferred.resolve( $img );
					};
					img.onerror = function() { deferred.reject($img); };
					img.src = url;
					return deferred.promise();
				}
			},
			html: {
				regex: /^\s*<[\w!][^<]*>/, /* Anything that starts with some kind of valid tag */
				process: function(html) { return $(html); }
			},
			ajax: {
				regex: /./,            /* At this point, any content is assumed to be an URL */
				process: function(url)  {
					var self = this,
						deferred = $.Deferred();
					/* we are using load so one can specify a target with: url.html #targetelement */
					var $container = $('<div></div>').load(url, function(response, status){
						if ( status !== "error" ) {
							deferred.resolve($container.contents());
						}
						deferred.reject();
					});
					return deferred.promise();
				}
			},
			iframe: {
				process: function(url) {
					var deferred = new $.Deferred();
					var $content = $('<iframe/>');
					var css = parseAttrs(this, 'iframe');
					var attrs = slice(css, iFrameAttributeSet);
					$content.hide()
						.attr('src', url)
						.attr(attrs)
						.css(css)
						.on('load', function() { deferred.resolve($content.show()); })
						// We can't move an <iframe> and avoid reloading it,
						// so let's put it in place ourselves right now:
						.appendTo(this.$instance.find('.' + this.namespace + '-content'));
					return deferred.promise();
				}
			},
			text: {
				process: function(text) { return $('<div>', {text: text}); }
			}
		},

		functionAttributes: ['beforeOpen', 'afterOpen', 'beforeContent', 'afterContent', 'beforeClose', 'afterClose'],

		/*** class methods ***/
		/* read element's attributes starting with data-ulpmodal- */
		readElementConfig: function(element, namespace) {
			var Klass = this,
				regexp = new RegExp('^data-' + namespace + '-(.*)'),
				config = {};
			if (element && element.attributes) {
				$.each(element.attributes, function(){
					var match = this.name.match(regexp);
					if (match) {
						var val = this.value,
							name = $.camelCase(match[1]);
						if ($.inArray(name, Klass.functionAttributes) >= 0) {  /* jshint -W054 */
							val = new Function(val);                           /* jshint +W054 */
						} else {
							try { val = JSON.parse(val); }
							catch(e) {}
						}
						config[name] = val;
					}
				});
			}
			return config;
		},

		/* Used to create a WordpressUlikeAjaxModal extension
		   [Warning: guru-level]
		   Creates the extension's prototype that in turn
		   inherits WordpressUlikeAjaxModal's prototype.
		   Could be used to extend an extension too...
		   This is pretty high level wizardy, it comes pretty much straight
		   from CoffeeScript and won't teach you anything about WordpressUlikeAjaxModal
		   as it's not really specific to this library.
		   My suggestion: move along and keep your sanity.
		*/
		extend: function(child, defaults) {
			/* Setup class hierarchy, adapted from CoffeeScript */
			var Ctor = function(){ this.constructor = child; };
			Ctor.prototype = this.prototype;
			child.prototype = new Ctor();
			child.__super__ = this.prototype;
			/* Copy class methods & attributes */
			$.extend(child, this, defaults);
			child.defaults = child.prototype;
			return child;
		},

		attach: function($source, $content, config) {
			var Klass = this;
			if (typeof $content === 'object' && $content instanceof $ === false && !config) {
				config = $content;
				$content = undefined;
			}
			/* make a copy */
			config = $.extend({}, config);

			/* Only for openTrigger, filter & namespace... */
			var namespace = config.namespace || Klass.defaults.namespace,
				tempConfig = $.extend({}, Klass.defaults, Klass.readElementConfig($source[0], namespace), config),
				sharedPersist;
			var handler = function(event) {
				var $target = $(event.currentTarget);
				/* ... since we might as well compute the config on the actual target */
				var elemConfig = $.extend(
					{$source: $source, $currentTarget: $target},
					Klass.readElementConfig($source[0], tempConfig.namespace),
					Klass.readElementConfig(event.currentTarget, tempConfig.namespace),
					config);
				var fl = sharedPersist || $target.data('ulpmodal-persisted') || new Klass($content, elemConfig);
				if(fl.persist === 'shared') {
					sharedPersist = fl;
				} else if(fl.persist !== false) {
					$target.data('ulpmodal-persisted', fl);
				}
				if (typeof elemConfig.$currentTarget.trigger === "function") {
					elemConfig.$currentTarget.trigger('blur'); // Otherwise 'enter' key might trigger the dialog again
				}
				fl.open(event);
			};

			$source.on(tempConfig.openTrigger+'.'+tempConfig.namespace, tempConfig.filter, handler);

			return {filter: tempConfig.filter, handler: handler};
		},

		current: function() {
			var all = this.opened();
			return all[all.length - 1] || null;
		},

		opened: function() {
			var klass = this;
			pruneOpened();
			return $.grep(opened, function(fl) { return fl instanceof klass; } );
		},

		close: function(event) {
			var cur = this.current();
			if(cur) { return cur.close(event); }
		},

		/* Does the auto binding on startup.
		   Meant only to be used by WordpressUlikeAjaxModal and its extensions
		*/
		_onReady: function() {
			var Klass = this;
			if(Klass.autoBind){
				var $autobound = $(Klass.autoBind);
				/* Bind existing elements */
				$autobound.each(function(){
					Klass.attach($(this));
				});
				/* If a click propagates to the document level, then we have an item that was added later on */
				$(document).on('click', Klass.autoBind, function(evt) {
					if (evt.isDefaultPrevented()) {
						return;
					}
					var $cur = $(evt.currentTarget);
					var len = $autobound.length;
					$autobound = $autobound.add($cur);
					if(len === $autobound.length) {
						return; /* already bound */
					}
					/* Bind ulpmodal */
					var data = Klass.attach($cur);
					/* Dispatch event directly */
					if (!data.filter || $(evt.target).parentsUntil($cur, data.filter).length > 0) {
						data.handler(evt);
					}
				});
			}
		},

		/* WordpressUlikeAjaxModal uses the onKeyUp callback to intercept the escape key.
		   Private to WordpressUlikeAjaxModal.
		*/
		_callbackChain: {
			onKeyUp: function(_super, event){
				if(27 === event.keyCode) {
					if (this.closeOnEsc) {
						$.ulpmodal.close(event);
					}
					return false;
				} else {
					return _super(event);
				}
			},

			beforeOpen: function(_super, event) {
				// Used to disable scrolling
				$(document.documentElement).addClass('with-ulpmodal');

				// Remember focus:
				this._previouslyActive = document.activeElement;

				// Disable tabbing:
				// See http://stackoverflow.com/questions/1599660/which-html-elements-can-receive-focus
				this._$previouslyTabbable = $("a, input, select, textarea, iframe, button, iframe, [contentEditable=true]")
					.not('[tabindex]')
					.not(this.$instance.find('button'));

				this._$previouslyWithTabIndex = $('[tabindex]').not('[tabindex="-1"]');
				this._previousWithTabIndices = this._$previouslyWithTabIndex.map(function(_i, elem) {
					return $(elem).attr('tabindex');
				});

				this._$previouslyWithTabIndex.add(this._$previouslyTabbable).attr('tabindex', -1);

				if (typeof document.activeElement.trigger === "function") {
					document.activeElement.trigger('blur');
				}
				return _super(event);
			},

			afterClose: function(_super, event) {
				var r = _super(event);
				// Restore focus
				var self = this;
				this._$previouslyTabbable.removeAttr('tabindex');
				this._$previouslyWithTabIndex.each(function(i, elem) {
					$(elem).attr('tabindex', self._previousWithTabIndices[i]);
				});
				if(typeof this._previouslyActive.trigger === "function"){
					this._previouslyActive.trigger('focus');
				}
				// Restore scroll
				if(WordpressUlikeAjaxModal.opened().length === 0) {
					$(document.documentElement).removeClass('with-ulpmodal');
				}
				return r;
			},

			onResize: function(_super, event){
				this.resize(this.$content.naturalWidth, this.$content.naturalHeight);
				return _super(event);
			},

			afterContent: function(_super, event){
				var r = _super(event);
				this.$instance.find('[autofocus]:not([disabled])').trigger('focus');
				this.onResize(event);
				return r;
			}
		}
	});

	$.ulpmodal = WordpressUlikeAjaxModal;

	/* bind jQuery elements to trigger ulpmodal */
	$.fn.ulpmodal = function($content, config) {
		WordpressUlikeAjaxModal.attach(this, $content, config);
		return this;
	};

	/* bind ulpmodal on ready if config autoBind is set */
	$(function() {
		WordpressUlikeAjaxModal._onReady();
	} );
});


/* ================== public/assets/js/src/_toast.js =================== */


/* 'WordpressUlikeNotifications' plugin : https://github.com/alimir/wp-ulike */
(function ($, window, document, undefined) {
  "use strict";

  // Create the defaults once
  var pluginName = "WordpressUlikeNotifications",
    defaults = {
      messageType: "success",
      messageText: "Hello World!",
      timeout: 8000,
      messageElement: "wpulike-message",
      notifContainer: "wpulike-notification"
    };
  // The actual plugin constructor
  function Plugin(element, options) {
    this.element = element;
    this.$element = $(element);
    this.settings = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  }

  // Avoid Plugin.prototype conflicts
  $.extend(Plugin.prototype, {
    init: function () {
      // Create Message Wrapper
      this._message();
      // Create Notification Container
      this._container();
      // Append Notification
      this._append();
      // Remove Notification
      this._remove();
    },

    /**
     * Create Message Wrapper
     */
    _message: function () {
      this.$messageElement = $("<div/>")
        .addClass(
          this.settings.messageElement + " wpulike-" + this.settings.messageType
        )
        .text(this.settings.messageText);
    },

    /**
     * Create notification container
     */
    _container: function () {
      // Make notification container if not exist
      if (!$("." + this.settings.notifContainer).length) {
        this.$element.append(
          $("<div/>").addClass(this.settings.notifContainer)
        );
      }
      this.$notifContainer = this.$element.find(
        "." + this.settings.notifContainer
      );
    },

    /**
     * Append notice
     */
    _append: function () {
      // Append Notification
      this.$notifContainer
        .append(this.$messageElement)
        .trigger("WordpressUlikeNotificationAppend");
    },

    /**
     * Disappear notice
     */
    _remove: function () {
      var self = this;
      // Remove Message On Click
      this.$messageElement.on('click', function () {
        $(this)
          .fadeOut(300, function () {
            $(this).remove();
            if (!$("." + self.settings.messageElement).length) {
              self.$notifContainer.remove();
            }
          })
          .trigger("WordpressUlikeRemoveNotification");
      });
      // Remove Message With Timeout
      if (self.settings.timeout) {
        setTimeout(function () {
          self.$messageElement
            .fadeOut(300, function () {
              $(this).remove();
              if (!$("." + self.settings.messageElement).length) {
                self.$notifContainer.remove();
              }
            })
            .trigger("WordpressUlikeRemoveNotification");
        }, self.settings.timeout);
      }

    }
  });

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function (options) {
    return this.each(function () {
      new Plugin(this, options);
    });
  };
})(jQuery, window, document);


/* ================== public/assets/js/src/_tooltip.js =================== */


; (function ($) {

    $.fn.WordpressUlikeTooltip = function (options) {

        //Instantiate WordpressUlikeTooltip once per dom element
        if (this.length > 1) {
            this.each(function () {
                $(this).WordpressUlikeTooltip(options);
            });
            return this;
        }

        //if there's nothing being passed
        if (typeof this === 'undefined' || this.length !== 1) {
            return false;
        }

        const dom_wrapped = $(this);

        //get list of options
        options = $.extend({}, $.WordpressUlikeTooltip.defaults, options, dom_wrapped.data());

        //get title attribute
        let title = dom_wrapped.attr('title');

        //if exists, override defaults
        if (typeof title !== 'undefined' && title.length) {
            options.title = title;
        }

        //add theme class
        options.class += ' ulf-' + options.theme + '-theme';
        //add size class
        options.class += ' ulf-' + options.size;

        //lowercase and trim whatever trigger is provided to try to make it more forgiving (this means "Hover " works just as well as "hover")
        options.trigger = options.trigger.toLowerCase().trim();

        let helper = {
            dom: this,
            dom_wrapped: dom_wrapped,
            position_debug: options.position_debug,
            trigger: options.trigger,
            id: options.id,
            title: options.title,
            content: options.title,
            child_class: options.child,
            theme: options.theme,
            class: options.class,
            position: options.position,
            close_on_outside_click: options.close_on_outside_click,
            singleton: options.singleton,
            dataAttr: 'ulike-tooltip',
            //create tooltip html
            createTooltipHTML: function () {
                return `<div class='ulf-tooltip ${helper.class}' role='tooltip'><div class='ulf-arrow'></div><div class='ulf-content'>${helper.content}</div></div>`;
            },
            //disable existing options/handlers
            destroy: function () {
                //only if it's actually tied to this element
                const existing = helper.dom_wrapped.data(helper.dataAttr);
                if (typeof existing !== 'undefined' && existing !== null) {
                    existing.dom_wrapped.off('touchstart mouseenter', existing.show);
                    existing.dom_wrapped.off('click', existing.preventDefaultHandler);

                    //attach resize handler to reposition tooltip
                    $(window).off('resize', existing.onResize);

                    //if currently shown, hide it
                    existing.isVisible() && existing.hide();

                    //detach from dom
                    existing.dom_wrapped.data(existing.dataAttr, null);
                }
            },
            //initialize the plugin on this element
            initialize: function () {
                //attach on handler to show tooltip
                //use touchstart and mousedown just like if you click outside the tooltip to close it
                //this way it blocks the hide if you click the button a second time to close the tooltip
                helper.dom_wrapped.on('touchstart mouseenter', helper.show);
                helper.dom_wrapped.on('click', helper.preventDefaultHandler);
                // helper.dom_wrapped.on('touchend mouseleave', helper.hide);


                if (!$.WordpressUlikeTooltip.body_click_initialized) {
                    $(document).on('touchstart mousedown', helper.onClickOutside);
                    $.WordpressUlikeTooltip.bodyClickInitialized = true;
                }

                //attach to dom for easy access later
                helper.dom_wrapped.data(helper.dataAttr, helper);

                // WP ULike Actions
                $(document).on('WordpressUlikeLikersMarkupUpdated', function (e, el, type, temp) {
                    if (type == 'popover') {
                        if (temp.length) {
                            helper.show();
                        } else {
                            let existing = el.data(helper.dataAttr);
                            if (typeof existing !== 'undefined' && existing !== null) {
                                existing.destroy();
                            }
                        }
                    }
                });

                //return dom for chaining of event handlers and such
                return helper.dom;
            },
            //on click of element, prevent default
            preventDefaultHandler: function (e) {
                e.preventDefault();
                return false;
            },
            //shows the tooltip
            show: function (trigger_event) {
                //if already visible, don't show
                if (helper.isVisible()) {
                    return false;
                }

                if (helper.singleton) {
                    helper.hideAllVisible();
                }

                //cache reference to the body
                const body = $('body');

                //get string from function
                if (typeof trigger_event === 'undefined' || trigger_event) {
                    if (typeof helper.title === 'function') helper.content = helper.title(helper.dom_wrapped, helper);
                }
                //add the tooltip to the dom
                body.append(helper.createTooltipHTML());
                //cache tooltip
                helper.tooltip = $('.ulf-tooltip:last');
                //position it
                helper.positionTooltip();
                //attach resize handler to reposition tooltip
                $(window).on('resize', helper.onResize);
                //give the tooltip an id so we can set accessibility props
                const id = 'ulp-dom-' + helper.id;
                helper.tooltip.attr('id', id);
                helper.dom.attr('aria-describedby', id);
                //add to open array
                $.WordpressUlikeTooltip.visible.push(helper);
                //trigger event on show and pass the tooltip
                if (typeof trigger_event === 'undefined' || trigger_event) {
                    helper.dom.trigger('ulf-show', [helper.tooltip, helper.hide]);
                }
                //if the trigger element is modified, reposition tooltip (hides if no longer exists or invisible)
                //if tooltip is modified, trigger reposition
                //this is admittedly inefficient, but it's only listening when the tooltip is open
                // Create a MutationObserver instance to replace the deprecated DOMSubtreeModified event
                helper.observer = new MutationObserver(function(mutations) {
                    // Call the positionTooltip method on DOM modifications
                    helper.positionTooltip();
                });

                // Configuration for the observer to listen to DOM modifications
                const config = { attributes: true, childList: true, subtree: true };

                // Start observing the body for DOM modifications
                helper.observer.observe(document.body, config);
            },
            //is this tooltip visible
            isVisible: function () {
                return $.inArray(helper, $.WordpressUlikeTooltip.visible) > -1;
            },
            //hide all visible tooltips
            hideAllVisible: function () {
                $.each($.WordpressUlikeTooltip.visible, function (index, WordpressUlikeTooltip) {
                    //if it's not a focus/hoverfocus tooltip with focus currently, hide it
                    if (!WordpressUlikeTooltip.dom_wrapped.hasClass('ulf-focused')) {
                        WordpressUlikeTooltip.hide();
                    }
                });
                return this;
            },
            //hides the tooltip for this element
            hide: function (trigger_event) {
                // Disconnect the MutationObserver to stop listening for DOM modifications
                if (helper.observer) {
                    helper.observer.disconnect();
                    helper.observer = null;
                }
                //remove scroll handler to reposition tooltip
                $(window).off('resize', helper.onResize);
                //remove accessbility props
                helper.dom.attr('aria-describedby', null);
                //remove from dom
                if (helper.tooltip && helper.tooltip.length) {
                    helper.tooltip.remove();
                }
                //trigger hide event
                if (typeof trigger_event === 'undefined' || trigger_event) {
                    helper.dom.trigger('ulf-hide');
                }
                //hide on click if not click
                if (helper.trigger !== 'click') {
                    helper.dom_wrapped.off('touchstart mousedown', helper.hide);
                }
                //remove from open array
                var index = $.inArray(helper, $.WordpressUlikeTooltip.visible);
                $.WordpressUlikeTooltip.visible.splice(index, 1);

                return helper.dom;
            },
            //on body resized
            onResize: function () {
                //hiding and showing the tooltip will update it's position
                helper.hide(false);
                helper.show(false);
            },
            //on click outside of the tooltip
            onClickOutside: function (e) {
                const target = $(e.target);
                if (!target.hasClass('ulf-tooltip') && !target.parents('.ulf-tooltip:first').length) {
                    $.each($.WordpressUlikeTooltip.visible, function (index, WordpressUlikeTooltip) {
                        if (typeof WordpressUlikeTooltip !== 'undefined') {
                            //if close on click AND target is NOT the trigger element OR it is the trigger element,
                            // but the trigger is not focus/hoverfocus (since on click focus is granted in those cases and the tooltip should be displayed)
                            if (WordpressUlikeTooltip.close_on_outside_click && (target !== WordpressUlikeTooltip.dom_wrapped || (WordpressUlikeTooltip.trigger !== 'focus' && WordpressUlikeTooltip.trigger !== 'hoverfocus'))) {
                                WordpressUlikeTooltip.hide();
                            }
                        }
                    });
                }
            },
            //position tooltip based on where the clicked element is
            positionTooltip: function () {

                helper.positionDebug('-- Start positioning --');

                //if no longer exists or is no longer visible
                if (!helper.dom_wrapped.length || !helper.dom_wrapped.is(":visible")) {
                    helper.positionDebug('Elem no longer exists. Removing tooltip');

                    helper.hide(true);
                }

                //cache reference to arrow
                let arrow = helper.tooltip.find('.ulf-arrow');

                //first try to fit it with the preferred position
                let [arrow_dir, elem_width, tooltip_width, tooltip_height, left, top] = helper.calculateSafePosition(helper.position);

                //if still couldn't fit, switch to auto
                if (typeof left === 'undefined' && helper.position !== 'auto') {
                    helper.positionDebug('Couldn\'t fit preferred position');
                    [arrow_dir, elem_width, tooltip_width, tooltip_height, left, top] = helper.calculateSafePosition('auto');
                }

                //fallback to centered (modal style)
                if (typeof left === 'undefined') {
                    helper.positionDebug('Doesn\'t appear to fit. Displaying centered');
                    helper.tooltip.addClass('ulf-centered').css({
                        'top': '50%',
                        'left': '50%',
                        'margin-left': -(tooltip_width / 2),
                        'margin-top': -(tooltip_height / 2)
                    });
                    if (arrow && arrow.length) {
                        arrow.remove();
                    }
                    helper.positionDebug('-- Done positioning --');
                    return;
                }

                //position the tooltip
                helper.positionDebug({ 'Setting Position': { 'Left': left, 'Top': top } });
                helper.tooltip.css('left', left);
                helper.tooltip.css('top', top);

                //arrow won't point at it if hugging side
                if (elem_width < 60) {
                    helper.positionDebug('Element is less than ' + elem_width + 'px. Setting arrow to hug the side tighter');
                    arrow_dir += ' ulf-arrow-super-hug';
                }

                //set the arrow location
                arrow.addClass('ulf-arrow-' + arrow_dir);

                helper.positionDebug('-- Done positioning --');

                return helper;
            },
            //detects where it will fit and returns the positioning info
            calculateSafePosition: function (position) {
                //cache reference to arrow
                let arrow = helper.tooltip.find('.ulf-arrow');

                //get position + size of clicked element
                let elem_position = helper.dom_wrapped.offset();
                let elem_height = helper.dom_wrapped.outerHeight();
                let elem_width = helper.dom_wrapped.outerWidth();

                //get tooltip dimensions
                let tooltip_width = helper.tooltip.outerWidth();
                let tooltip_height = helper.tooltip.outerHeight();

                //get window dimensions
                let window_width = document.querySelector('body').offsetWidth;
                let window_height = document.querySelector('body').offsetHeight;

                //get arrow size so we can pad
                let arrow_height = arrow.is(":visible") ? arrow.outerHeight() : 0;
                let arrow_width = arrow.is(":visible") ? arrow.outerWidth() : 0;

                //see where it fits in relation to the clicked element
                let fits = {};
                fits.below = (window_height - (tooltip_height + elem_height + elem_position.top)) > 5;
                fits.above = (elem_position.top - tooltip_height) > 5;
                fits.vertical_half = (elem_position.top + (elem_width / 2) - (tooltip_height / 2)) > 5;
                fits.right = (window_width - (tooltip_width + elem_width + elem_position.left)) > 5;
                fits.right_half = (window_width - elem_position.left - (elem_width / 2) - (tooltip_width / 2)) > 5;
                fits.right_full = (window_width - elem_position.left - tooltip_width) > 5;
                fits.left = (elem_position.left - tooltip_width) > 5;
                fits.left_half = (elem_position.left + (elem_width / 2) - (tooltip_width / 2)) > 5;
                fits.left_full = (elem_position.left - tooltip_width) > 5;

                //in debug mode, display all details
                helper.positionDebug({
                    'Clicked Element': { 'Left': elem_position.left, 'Top': elem_position.top },
                });
                helper.positionDebug({
                    'Element Dimensions': { 'Height': elem_height, 'Width': elem_width },
                    'Tooltip Dimensions': { 'Height': tooltip_height, 'Width': tooltip_width },
                    'Window Dimensions': { 'Height': window_height, 'Width': window_width },
                    'Arrow Dimensions': { 'Height': arrow_height, 'Width': arrow_width },
                });
                helper.positionDebug(fits);

                //vars we need for positioning
                let arrow_dir, left, top;

                if ((position === 'auto' || position === 'bottom') && fits.below && fits.left_half && fits.right_half) {
                    helper.positionDebug('Displaying below, centered');
                    arrow_dir = 'top';
                    left = elem_position.left - (tooltip_width / 2) + (elem_width / 2);
                    top = elem_position.top + elem_height + (arrow_height / 2);
                }
                else if ((position === 'auto' || position === 'top') && fits.above && fits.left_half && fits.right_half) {
                    helper.positionDebug('Displaying above, centered');
                    arrow_dir = 'bottom';
                    if (helper.child_class) {
                        let $child_element = helper.dom_wrapped.find(helper.child_class).first();
                        left = $child_element.offset().left - (tooltip_width / 2) + ($child_element.width() / 2);
                    } else {
                        left = elem_position.left - (tooltip_width / 2) + (elem_width / 2);
                    }
                    top = elem_position.top - tooltip_height - (arrow_height / 2);
                }
                else if ((position === 'auto' || position === 'left') && fits.left && fits.vertical_half) {
                    helper.positionDebug('Displaying left, centered');
                    arrow_dir = 'right';
                    left = elem_position.left - tooltip_width - (arrow_width / 2);
                    top = elem_position.top + (elem_height / 2) - (tooltip_height / 2);
                }
                else if ((position === 'auto' || position === 'right') && fits.right && fits.vertical_half) {
                    helper.positionDebug('Displaying right, centered');
                    arrow_dir = 'left';
                    left = elem_position.left + elem_width + (arrow_width / 2);
                    top = elem_position.top + (elem_height / 2) - (tooltip_height / 2);
                }
                else if ((position === 'auto' || position === 'bottom') && fits.below && fits.right_full) {
                    helper.positionDebug('Displaying below, to the right');
                    arrow_dir = 'top ulf-arrow-hug-left';
                    left = elem_position.left;
                    top = elem_position.top + elem_height + (arrow_height / 2);
                }
                else if ((position === 'auto' || position === 'bottom') && fits.below && fits.left_full) {
                    helper.positionDebug('Displaying below, to the left');
                    arrow_dir = 'top ulf-arrow-hug-right';
                    left = elem_position.left + elem_width - tooltip_width;
                    top = elem_position.top + elem_height + (arrow_height / 2);
                }
                else if ((position === 'auto' || position === 'top') && fits.above && fits.right_full) {
                    helper.positionDebug('Displaying above, to the right');
                    arrow_dir = 'bottom ulf-arrow-hug-left';
                    left = elem_position.left;
                    top = elem_position.top - tooltip_height - (arrow_height / 2);
                }
                else if ((position === 'auto' || position === 'top') && fits.above && fits.left_full) {
                    helper.positionDebug('Displaying above, to the left');
                    arrow_dir = 'bottom ulf-arrow-hug-right';
                    left = elem_position.left + elem_width - tooltip_width;
                    top = elem_position.top - tooltip_height - (arrow_height / 2);
                }

                return [arrow_dir, elem_width, tooltip_width, tooltip_height, left, top];
            },
            //if position_debug is enabled, let's console.log the details
            positionDebug: function (msg) {
                if (!helper.position_debug) {
                    return false;
                }

                return typeof msg === 'object' ? console.table(msg) : console.log(`Position: ${msg}`);
            }
        };

        helper.destroy();

        return helper.initialize();
    };

    $.WordpressUlikeTooltip = {};
    $.WordpressUlikeTooltip.visible = [];
    $.WordpressUlikeTooltip.body_click_initialized = false;
    $.WordpressUlikeTooltip.defaults = {
        id: Date.now(),
        title: '',
        trigger: 'hoverfocus',
        position: 'auto',
        class: '',
        theme: 'black',
        size: 'small',
        singleton: true,
        close_on_outside_click: true,
    }

})(jQuery);


/* ================== public/assets/js/src/_ulike.js =================== */


(function ($, window, document, undefined) {
  "use strict";

  // Create the defaults once
  var pluginName = "WordpressUlike",
    $window = $(window),
    $document = $(document),
    defaults = {
      ID: 0,
      nonce: 0,
      type: "",
      append: "",
      appendTimeout: 2000,
      displayLikers: false,
      likersTemplate: "default",
      disablePophover: true,
      isTotal: false,
      factor: "",
      template: "",
      counterSelector: ".count-box",
      generalSelector: ".wp_ulike_general_class",
      buttonSelector: ".wp_ulike_btn",
      likersSelector: ".wp_ulike_likers_wrapper",
    },
    attributesMap = {
      "ulike-id": "ID",
      "ulike-nonce": "nonce",
      "ulike-type": "type",
      "ulike-append": "append",
      "ulike-is-total": "isTotal",
      "ulike-display-likers": "displayLikers",
      "ulike-likers-style": "likersTemplate",
      "ulike-disable-pophover": "disablePophover",
      "ulike-append-timeout": "appendTimeout",
      "ulike-factor": "factor",
      "ulike-template": "template",
    };

  // The actual plugin constructor
  function Plugin(element, options) {
    this.element = element;
    this.$element = $(element);
    this.settings = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;

    // Create main selectors
    this.buttonElement = this.$element.find(this.settings.buttonSelector);

    // read attributes
    for (var attrName in attributesMap) {
      var value = this.buttonElement.data(attrName);
      if (value !== undefined) {
        this.settings[attributesMap[attrName]] = value;
      }
    }

    // General element
    this.generalElement = this.$element.find(this.settings.generalSelector);

    // Create counter element
    this.counterElement = this.generalElement.find(
      this.settings.counterSelector
    );

    // Append dom counter element
    if (this.counterElement.length) {
      this.counterElement.each(
        function (index, element) {
          if (typeof $(element).data("ulike-counter-value") !== "undefined") {
            $(element).html($(element).data("ulike-counter-value"));
          }
        }.bind(this)
      );
    }
    // Get likers box container element
    this.likersElement = this.$element.find(this.settings.likersSelector);

    this.init();
  }

  // Avoid Plugin.prototype conflicts
  $.extend(Plugin.prototype, {
    init: function () {
      // Call _ajaxify function on click button
      this.buttonElement.on("click", this._initLike.bind(this));
      // Call likers box generator
      this.generalElement.one("mouseenter", this._updateLikers.bind(this));
    },

    /**
     * global AJAX callback
     */
    _ajax: function (args, callback) {
      // Do Ajax & update default value
      $.ajax({
        url: UlikeProCommonConfig.AjaxUrl,
        type: "POST",
        dataType: "json",
        data: args,
      }).done(callback);
    },

    /**
     * init ulike core process
     */
    _initLike: function (event) {
      // Prevents further propagation of the current event in the capturing and bubbling phases
      event.stopPropagation();
      // Update element if there's more thab one button
      this._maybeUpdateElements(event);
      // Check for same buttons elements
      this._updateSameButtons();
      // Check for same likers elements
      this._updateSameLikers();
      // Disable button
      this.buttonElement.prop("disabled", true);
      // Manipulations
      $document.trigger("WordpressUlikeLoading", this.element);
      // Add progress class
      this.generalElement.addClass("wp_ulike_is_loading");
      // Start AJAX process
      this._ajax(
        {
          action: "wp_ulike_process",
          id: this.settings.ID,
          nonce: this.settings.nonce,
          factor: this.settings.factor,
          type: this.settings.type,
          template: this.settings.template,
          displayLikers: this.settings.displayLikers,
          likersTemplate: this.settings.likersTemplate,
        },
        function (response) {
          //remove progress class
          this.generalElement.removeClass("wp_ulike_is_loading");
          // Make changes
          if (response.success) {
            if (
              typeof response.data.hasToast !== "undefined" &&
              typeof response.data.modalTemplate !== "undefined" &&
              response.data.modalTemplate
            ) {
              this._openModal(response.data.modalTemplate);
            } else {
              this._updateMarkup(response);
              // Append html data
              this._appendChild();
            }
          } else if (response.data.hasToast) {
            this._sendNotification("error", response.data.message);
          }
          // Re-enable button
          this.buttonElement.prop("disabled", false);
          // Add new trigger when process finished
          $document.trigger("WordpressUlikeUpdated", this.element);
        }.bind(this)
      );
    },

    _openModal: function (data) {
      // Content
      var content = $("<div/>").addClass("ulpmodal-ajax-wrapper").html(data);

      $.ulpmodal(content, {
        closeOnClick: "background",
        afterOpen: function (event) {
          // Add custom trigger
          $document.trigger("WordpressUlikeModalAfterOpen", event);
        },
        closeOnEsc: true,
      });
    },

    _maybeUpdateElements: function (event) {
      this.buttonElement = $(event.currentTarget);
      this.generalElement = this.buttonElement.closest(
        this.settings.generalSelector
      );
      this.counterElement = this.generalElement.find(
        this.settings.counterSelector
      );
      this.settings.factor = this.buttonElement.data("ulike-factor");
    },

    /**
     * append child
     */
    _appendChild: function () {
      if (this.settings.append !== "") {
        var $appendedElement = $(this.settings.append);
        this.buttonElement.append($appendedElement);
        if (this.settings.appendTimeout) {
          setTimeout(function () {
            $appendedElement.detach();
          }, this.settings.appendTimeout);
        }
      }
    },

    /**
     * update button markup and calling some actions
     */
    _updateMarkup: function (response) {
      // Set sibling general elements
      this._setSbilingElement();
      // Set sibling button elements
      this._setSbilingButtons();
      // Update general element class names
      this._updateGeneralClassNames(response.data.status);
      // If data exist
      if (response.data.data !== null) {
        // Update counter + check refresh likers box
        if (response.data.status != 5) {
          this.__updateCounter(response.data.data);
          // Refresh likers box on data update
          if (
            this.settings.displayLikers &&
            typeof response.data.likers !== "undefined"
          ) {
            this._updateLikersMarkup(response.data.likers);
          }
        }
        // Update button status
        this._updateButton(response.data.btnText, response.data.status);
      }
      // Display Notifications
      if (response.data.hasToast) {
        this._sendNotification(
          response.data.messageType,
          response.data.message
        );
      }
      // Display share buttons
      if (response.data.modalAfterSuccess) {
        this._openModal(response.data.modalAfterSuccess);
      }
    },

    _updateGeneralClassNames: function (status) {
      // Our base status class names
      var classNameObj = {
        start: "wp_ulike_is_not_liked",
        active: "wp_ulike_is_liked",
        deactive: "wp_ulike_is_unliked",
        disable: "wp_ulike_click_is_disabled",
      };

      // Remove status from sibling element
      if (this.siblingElement.length) {
        this.siblingElement.removeClass(
          this._arrayToString([classNameObj.active, classNameObj.deactive])
        );
      }

      switch (status) {
        case 1:
          this.generalElement
            .addClass(classNameObj.active)
            .removeClass(classNameObj.start);
          this.generalElement.children().first().addClass(classNameObj.disable);
          break;

        case 2:
          this.generalElement
            .addClass(classNameObj.deactive)
            .removeClass(classNameObj.active);
          break;

        case 3:
          this.generalElement
            .addClass(classNameObj.active)
            .removeClass(classNameObj.deactive);
          break;

        case 0:
        case 5:
          this.generalElement.addClass(classNameObj.disable);
          if (this.siblingElement.length) {
            this.siblingElement.addClass(classNameObj.disable);
          }
          break;
      }
    },

    _arrayToString: function (data) {
      return data.join(" ");
    },

    _setSbilingElement: function () {
      this.siblingElement = this.generalElement.siblings();
    },

    _setSbilingButtons: function () {
      this.siblingButton = this.buttonElement.siblings(
        this.settings.buttonSelector
      );
    },

    __updateCounter: function (counterValue) {
      // Update counter element
      if (typeof counterValue !== "object") {
        this.counterElement
          .attr("data-ulike-counter-value", counterValue)
          .html(counterValue);
      } else {
        if (this.settings.isTotal && typeof counterValue.sub !== "undefined") {
          this.counterElement
            .attr("data-ulike-counter-value", counterValue.sub)
            .html(counterValue.sub);
        } else {
          if (this.settings.factor === "down") {
            this.counterElement
              .attr("data-ulike-counter-value", counterValue.down)
              .html(counterValue.down);
            if (this.siblingElement.length) {
              this.siblingElement
                .find(this.settings.counterSelector)
                .attr("data-ulike-counter-value", counterValue.up)
                .html(counterValue.up);
            }
          } else {
            this.counterElement
              .attr("data-ulike-counter-value", counterValue.up)
              .html(counterValue.up);
            if (this.siblingElement.length) {
              this.siblingElement
                .find(this.settings.counterSelector)
                .attr("data-ulike-counter-value", counterValue.down)
                .html(counterValue.down);
            }
          }
        }
      }

      $document.trigger("WordpressUlikeCounterUpdated", [this.buttonElement]);
    },

    /**
     * init & update likers box
     */
    _updateLikers: function (event) {
      // Make a request to generate or refresh the likers box
      if (this.settings.displayLikers) {
        // return on these conditions
        if (
          this.settings.likersTemplate == "popover" &&
          this.$element.data("ulike-tooltip")
        ) {
          return;
        } else if (
          ["default", "pile"].includes(this.settings.likersTemplate) &&
          this.likersElement.length
        ) {
          return;
        }
        // Add progress status class
        this.generalElement.addClass("wp_ulike_is_getting_likers_list");
        // Start ajax process
        this._ajax(
          {
            action: "wp_ulike_get_likers",
            id: this.settings.ID,
            nonce: this.settings.nonce,
            type: this.settings.type,
            displayLikers: this.settings.displayLikers,
            likersTemplate: this.settings.likersTemplate,
          },
          function (response) {
            // Remove progress status class
            this.generalElement.removeClass("wp_ulike_is_getting_likers_list");
            // Change markup
            if (response.success) {
              this._updateLikersMarkup(response.data);
            }
          }.bind(this)
        );

        event.stopImmediatePropagation();
        return false;
      }
    },

    /**
     * Update likers markup
     */
    _updateLikersMarkup: function (data) {
      if (this.settings.likersTemplate == "popover") {
        this.likersElement = this.$element;
        if (data.template) {
          this.likersElement.WordpressUlikeTooltip({
            id: this.settings.type.toLowerCase() + "-" + this.settings.ID,
            title: data.template,
            position: "top",
            child: this.settings.generalSelector,
            theme: "white",
            size: "tiny",
            trigger: "hover",
          });
        }
      } else {
        // If the likers container is not exist, we've to add it.
        if (!this.likersElement.length) {
          this.likersElement = $(data.template).appendTo(this.$element);
        }
        // Modify likers box innerHTML
        if (data.template) {
          this.likersElement.show().html(data.template);
        } else {
          this.likersElement.hide().empty();
        }
      }

      $document.trigger("WordpressUlikeLikersMarkupUpdated", [
        this.likersElement,
        this.settings.likersTemplate,
        data.template,
      ]);
    },

    /**
     * Update the elements of same buttons at the same time
     */
    _updateSameButtons: function () {
      // Get buttons with same unique class names
      var factorMethod =
        typeof this.settings.factor !== "undefined"
          ? "_" + this.settings.factor
          : "";
      this.sameButtons = $document.find(
        ".wp_" +
          this.settings.type.toLowerCase() +
          factorMethod +
          "_btn_" +
          this.settings.ID
      );
      // Update general elements
      if (this.sameButtons.length > 1) {
        this.buttonElement = this.sameButtons;
        this.generalElement = this.buttonElement.closest(
          this.settings.generalSelector
        );
        this.counterElement = this.generalElement.find(
          this.settings.counterSelector
        );
      }
    },

    /**
     * Update the elements of same buttons at the same time
     */
    _updateSameLikers: function () {
      this.sameLikers = $document.find(
        ".wp_" +
          this.settings.type.toLowerCase() +
          "_likers_" +
          this.settings.ID
      );
      // Update general elements
      if (this.sameLikers.length > 1) {
        this.likersElement = this.sameLikers;
      }
    },

    /**
     * Get likers wrapper element
     */
    _getLikersElement: function () {
      return this.likersElement;
    },

    /**
     * Control actions
     */
    _updateButton: function (btnText, status) {
      if (this.buttonElement.hasClass("wp_ulike_put_image")) {
        if (status == 4) {
          this.buttonElement.addClass("image-unlike wp_ulike_btn_is_active");
        } else {
          this.buttonElement.toggleClass("image-unlike wp_ulike_btn_is_active");
        }

        if (this.siblingElement.length) {
          this.siblingElement
            .find(this.settings.buttonSelector)
            .removeClass("image-unlike wp_ulike_btn_is_active");
        }
        if (this.siblingButton.length) {
          this.siblingButton.removeClass("image-unlike wp_ulike_btn_is_active");
        }
      } else if (
        this.buttonElement.hasClass("wp_ulike_put_text") &&
        btnText !== null
      ) {
        if (this.settings.factor === "down") {
          this.buttonElement.find("span").html(btnText.down);
          if (this.siblingElement.length) {
            this.siblingElement
              .find(this.settings.buttonSelector)
              .find("span")
              .html(btnText.up);
          }
        } else {
          this.buttonElement.find("span").html(btnText.up);
          if (this.siblingElement.length) {
            this.siblingElement
              .find(this.settings.buttonSelector)
              .find("span")
              .html(btnText.down);
          }
        }
      }
    },

    /**
     * Send notification by 'WordpressUlikeNotifications' plugin
     */
    _sendNotification: function (messageType, messageText) {
      // Display Notification
      $(document.body).WordpressUlikeNotifications({
        messageType: messageType,
        messageText: messageText,
      });
    },
  });

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);


/* ================== public/assets/js/src/scripts.js =================== */


/* Run :) */
(function ($) {
  $(function () {
    // Init share buttons
    $(".ulp-ajax-form").WordpressUlikeAjaxForms();
    // Init goodshare
    if (typeof window._goodshare !== "undefined") {
      window._goodshare.reNewAllInstance();
    }
  });

  /**
   * otp digit separator
   */
  function ulpOtpInput() {
    const inputs = document.querySelectorAll("#ulp-2fa-code > *[id]");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener("keydown", function (event) {
        if (event.key === "Backspace") {
          inputs[i].value = "";
          if (i !== 0) inputs[i - 1].focus();
        } else {
          if (i === inputs.length - 1 && inputs[i].value !== "") {
            return true;
          } else if (event.keyCode > 47 && event.keyCode < 58) {
            inputs[i].value = event.key;
            if (i !== inputs.length - 1) inputs[i + 1].focus();
            event.preventDefault();
          } else if (event.keyCode > 64 && event.keyCode < 91) {
            inputs[i].value = String.fromCharCode(event.keyCode);
            if (i !== inputs.length - 1) inputs[i + 1].focus();
            event.preventDefault();
          }
        }
      });
    }
  }

  /**
   * jquery detecting div of certain class has been added to DOM
   */
  function ulpOnElementInserted(containerSelector, elementSelector, callback) {
    var onMutationsObserved = function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length) {
          var elements = $(mutation.addedNodes).find(elementSelector);
          for (var i = 0, len = elements.length; i < len; i++) {
            callback(elements[i]);
          }
        }
      });
    };

    var target = $(containerSelector)[0];
    var config = {
      childList: true,
      subtree: true,
    };
    var MutationObserver =
      window.MutationObserver || window.WebKitMutationObserver;
    var observer = new MutationObserver(onMutationsObserved);
    observer.observe(target, config);
  }

  // Init ulike buttons
  $(".wpulike").WordpressUlike();

  // On wp ulike element added
  ulpOnElementInserted("body", ".wpulike", function (element) {
    $(element).WordpressUlike();
  });

  // On share button element added
  ulpOnElementInserted("body", ".ulp-social-wrapper", function (element) {
    // Init goodshare
    if (typeof window._goodshare !== "undefined") {
      window._goodshare.reNewAllInstance();
    }
  });

  // On form element added
  ulpOnElementInserted("body", ".ulp-ajax-form", function (element) {
    $(element).WordpressUlikeAjaxForms();
  });

  // On recaptcha element added
  ulpOnElementInserted("body", ".ulp-recaptcha-field", function (element) {
    $(document).trigger("UlpRecaptchaReload", [this.element]);
  });

  $(".ulp-2fa-remove").on("click", function (e) {
    e.preventDefault();
    if (confirm("Are you sure you want to make this change?")) {
      var $self = $(this),
        $itemElement = $self.closest(".ulp-2fa-item");

      $.ajax({
        data: {
          action: "ulp_two_factor_remove",
          nonce: $self.data("nonce"),
          key: $self.data("key"),
        },
        dataType: "json",
        type: "POST",
        url: UlikeProCommonConfig.AjaxUrl,
        success: function (response) {
          if (response.success) {
            $itemElement.fadeOut();
          }
          // Display Notification
          $(document.body).WordpressUlikeNotifications({
            messageType: response.data.status,
            messageText: response.data.message,
          });
        },
      });
    }
  });

  // switch between forms
  $(document).on("click", "a[data-form-toggle]", function (e) {
    e.preventDefault();
    var $self = $(this),
      $contentEl = $self.closest('.ulp-ajax-form'),
      $formEl = $contentEl.find('form');

      $formEl.addClass("ulp-loading");

      $.ajax({
        data: {
          action: "ulp_forms_toggle",
          request: $self.data("form-toggle"),
        },
        dataType: "json",
        type: "POST",
        url: UlikeProCommonConfig.AjaxUrl,
        success: function (response) {
          if (response.success) {
            var $fragmentEl = $(response.data.content).WordpressUlikeAjaxForms();
            $contentEl.replaceWith($fragmentEl);
          } else {
            $(document.body).WordpressUlikeNotifications({
              messageType: response.data.status,
              messageText: response.data.message,
            });
          }
          $formEl.removeClass("ulp-loading");
        }
      });
  });

})(jQuery);