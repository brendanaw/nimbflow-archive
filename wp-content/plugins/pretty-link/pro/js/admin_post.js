jQuery(document).ready(function($) {
  var $plp_link_health_metabox = $('#plp-link-health');

  $('.tweet-toggle-pane').hide();

  $('.tweet-toggle-button').click(function() {
    $('.tweet-toggle-pane').toggle();
  });

  $('.tweet-button').click(function() {
    $.ajax( {
       type: "POST",
       url: ajaxurl,
       data: {
         'action': 'plp-auto-tweet',
         'post': PlpPost.post_id,
         'message': document.getElementById('tweet-message').value
       },
       success: function(msg) {
         $('.tweet-response').replaceWith('Tweet Successful:');
         $('.tweet-status').replaceWith('Has already been tweeted');
         $('.tweet-message-display').replaceWith('<blockquote>'+msg+'</blockquote>');
       }
    });
  });

  var plp_link_health_init_tooltip = function() {
    $plp_link_health_metabox.find('.status-wrap .tooltip').tooltipster({
      position: 'top'
    });
  }

  $plp_link_health_metabox.on('click', '#trigger-manual-health-check', function() {
    var $button = $(this);

    var data = {
      action: 'plp_check_single_link_health',
      link_id: $button.data('linkid'),
      nonce: $button.data('nonce')
    };

    $button.prop('disabled', true).text($button.data('button-alt'));

    $.ajax({
      type: 'POST',
      url: ajaxurl,
      data
    })
    .done(function(response) {
      if(response.status == 'success') {
        $plp_link_health_metabox.find('.status-wrap .tooltip').replaceWith(response.markup);
        plp_link_health_init_tooltip();
      } else {
        alert(response.error);
      }
    })
    .always(function() {
      $button.prop('disabled', false).text($button.data('button-text'));
    });
  });

  plp_link_health_init_tooltip();
});
