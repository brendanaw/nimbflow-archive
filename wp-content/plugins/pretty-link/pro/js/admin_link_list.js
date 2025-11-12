jQuery(document).ready(function($) {
  $('.link_health #trigger-manual-health-check').on('click', function(e) {
    e.preventDefault();

    var $link = $(this);

    var data = {
      action: 'plp_check_single_link_health',
      link_id: $link.data('linkid'),
      nonce: $link.data('nonce'),
      return_broken_link_count: true
    };

    $link.text($link.data('link-alt'));

    $.ajax({
      type: 'POST',
      url: ajaxurl,
      data
    })
    .done(function(response) {
      if(response.status == 'success') {
        $link.closest('tr').find('.column-health_status .tooltip').replaceWith(response.markup);
        $link.closest('tr').find('.column-health_status .tooltip').tooltipster({
          position: 'top'
        });

        $('.prli_broken_links .count').text('(' + response.broken_link_count + ')');
      } else {
        alert(response.error);
      }
    })
    .always(function() {
      $link.text($link.data('link-text'));
    });
  });

  $('.column-health_status .tooltip').tooltipster({
    position: 'top'
  });
});