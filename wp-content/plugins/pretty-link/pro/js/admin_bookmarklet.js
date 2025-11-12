jQuery(document).ready(function($) {
  $('#prlipro-custom-bookmarklet-form').change(function() {
    var redirect_type = $('#prlipro-bookmarklet-redirect-type').val();
    var track = $('#prlipro-bookmarklet-track').val();
    var category = $('#prlipro-bookmarklet-category').val();
    var label = $('#prlipro-bookmarklet-label').val();

    var link = '<span class="bookmarklet-updated"><a class="button button-primary" href="javascript:location.href=\'' + PlpBookmarklet.url + '&rt=' + redirect_type + '&trk=' + track + '&ct=' + category + '&target_url=\'+escape(location.href);">' + label + '</a></span>';
    $('#prlipro-custom-bookmarklet-link').html(link);
    $('#prlipro-custom-bookmarklet-link').hide();
    $('#prlipro-custom-bookmarklet-link').fadeIn('slow');
  });
});

