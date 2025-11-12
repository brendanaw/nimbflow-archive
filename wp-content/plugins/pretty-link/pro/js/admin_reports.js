jQuery(document).ready(function($) {
  $('.report_actions').hide();
  $('.edit_report').hover(
    function() {
      $(this).children('.report_actions').show();
    },
    function() {
      $(this).children('.report_actions').hide();
    }
  );
});

