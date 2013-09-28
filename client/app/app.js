// Application core init (models classes should be up first)
//
'use strict';

var _  = require('lodash');
var ko = require('knockout');

// Set font-specific variables to defaults
// Used in app init & settings menu
//
function reset_font() {
  N.app.fontName('');
  N.app.cssPrefixText('icon-');
  N.app.cssUseSuffix(false);
  N.app.fontUnitsPerEm(1000);
  N.app.fontAscent(850);
  N.app.fontFullName('');
  N.app.fontCopyright('');
}


////////////////////////////////////////////////////////////////////////////////

// App namespace/data setup, executed right after models init
//
N.wire.once('navigate.done', { priority: -90 }, function () {

  N.app = {};

  // App params
  //
  N.app.searchWord    = ko.observable('').extend({ throttle: 100 });
  N.app.searchMode    = ko.computed(function () { return N.app.searchWord().length > 0; });
  N.app.fontsList     = new N.models.FontsList({ searchWord: N.app.searchWord });
  N.app.fontSize      = ko.observable(16);
  N.app.apiMode       = ko.observable(false);
  N.app.apiUrl        = ko.observable('');
  N.app.apiSessionId  = null;
  N.app.hinting       = ko.observable(true);
  N.app.encoding      = ko.observable('pua');

  // Font Params
  //
  N.app.fontName      = ko.observable();
  N.app.cssPrefixText = ko.observable();
  N.app.cssUseSuffix  = ko.observable();
  // This font params needed only if one wish to create custom font,
  // or play with baseline. Can be tuned via advanced settings
  N.app.fontUnitsPerEm  = ko.observable();
  N.app.fontAscent      = ko.observable();
  N.app.fontFullName    = ko.observable();
  N.app.fontCopyright   = ko.observable();

  reset_font(); // init font params

  N.app.getConfig   = function () {
    var config = {
      name:             $.trim(N.app.fontName()),
      css_prefix_text:  $.trim(N.app.cssPrefixText()),
      css_use_suffix:   N.app.cssUseSuffix(),
      hinting:          N.app.hinting(),
      units_per_em:     N.app.fontUnitsPerEm(),
      ascent:           N.app.fontAscent()
    };

    if (!_.isEmpty(N.app.fontCopyright())) { config.copyright = $.trim(N.app.fontCopyright()); }
    if (!_.isEmpty(N.app.fontFullName())) { config.fullname = $.trim(N.app.fontFullName()); }

    config.glyphs = [];

    _.forEach(N.app.fontsList.fonts, function (font) {
      _.forEach(font.glyphs(), function (glyph) {

        if ((glyph.font.fontname === 'custom_icons') || glyph.selected()) {
          config.glyphs.push(glyph.serialize());
        }

      });
    });

    return config;
  };

  N.app.serverSave  = function(callback) {
    if (!N.app.apiSessionId) { return; }

    N.io.rpc('fontello.api.update', { sid: N.app.apiSessionId, config: N.app.getConfig() }, callback);
  };

});

////////////////////////////////////////////////////////////////////////////////


// Helper. Set new code for each selected glyph using currect encoding.
//
function updateGlyphCodes() {
  var glyphs = N.app.fontsList.selectedGlyphs();

  // Reselect all currently selected glyph to update their codes.
  _.invoke(glyphs, 'selected', false);
  _.invoke(glyphs, 'selected', true);
}


// Assign  actions handlers
//
N.wire.once('navigate.done', { priority: -10 }, function () {

  //
  // Setup autosave
  //

  [ 'fontName'
  , 'fontSize'
  , 'cssPrefixText'
  , 'cssUseSuffix'
  , 'hinting'
  , 'encoding'
  , 'fontUnitsPerEm'
  , 'fontAscent'
  , 'fontFullName'
  , 'fontCopyright'
  ].forEach(function (key) {
    N.app[key].subscribe(function () {
      N.wire.emit('session_save');
    });
  });

  // Try to load config before everything (tweak priority)
  if (!_.isEmpty(N.runtime.page_data && N.runtime.page_data.sid)) {
    N.app.apiSessionId = N.runtime.page_data.sid;
    N.app.apiMode(true);
    N.app.apiUrl(N.runtime.page_data.url || '');
    N.wire.emit('import.obj', N.runtime.page_data.config);
  } else {
    N.wire.emit('session_load');
  }

  //
  // Basic commands
  //

  N.wire.on('cmd:reset_selected', function () {
    _.each(N.app.fontsList.selectedGlyphs(), function (glyph) {
      glyph.selected(false);
    });
  });

  N.wire.on('cmd:reset_all', function (src) {

    // is `src` set, then event was produced
    // by link click and we need confirmation
    if (src) {
      if (!window.confirm(t('confirm_app_reset'))) {
        return;
      }
    }

    reset_font();

    _.each(N.app.fontsList.fonts, function(font) {
      _.each(font.glyphs(), function(glyph) {
        glyph.selected(false);
        glyph.code(glyph.originalCode);
        glyph.name(glyph.originalName);
      });
    });
  });

  N.wire.on('cmd:toggle_hinting', function () {
    N.app.hinting(!N.app.hinting());
  });

  N.wire.on('cmd:set_encoding_pua', function () {
    N.app.encoding('pua');
    updateGlyphCodes();
  });

  N.wire.on('cmd:set_encoding_ascii', function () {
    N.app.encoding('ascii');
    updateGlyphCodes();
  });

  N.wire.on('cmd:set_encoding_unicode', function () {
    N.app.encoding('unicode');
    updateGlyphCodes();
  });

  N.wire.on('cmd:clear_custom_icons', function () {
    var custom_icons = N.app.fontsList.getFont('custom_icons');

    custom_icons.glyphs().forEach(function (glyph) {
      glyph.selected(false);
    });
    custom_icons.glyphs([]);
  });
});
