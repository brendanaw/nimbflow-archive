(function ($) {
  $(function () {
    // Recaptcha
    if (typeof UlikeProRecaptchaData.recaptchaVersion !== "undefined") {
      $(document).on("UlpAjaxFormEnded", function (event, element, response) {
        if (
          (typeof response.success !== "undefined" && !response.success) ||
          (typeof response.data.refresh_recaptcha !== "undefined" &&
            response.data.refresh_recaptcha)
        ) {
          if (
            typeof ulp_recaptcha_refresh !== "undefined" &&
            UlikeProRecaptchaData.recaptchaVersion === "v2"
          ) {
            ulp_recaptcha_refresh();
          } else if (UlikeProRecaptchaData.recaptchaVersion === "v3") {
            ulp_recaptcha_v3_execute(element);
          }
        }
      });
      $(document).on("UlpRecaptchaReload", function (event, element) {
          if (
            typeof ulpOnloadCallback !== "undefined" &&
            UlikeProRecaptchaData.recaptchaVersion === "v2"
          ) {
            ulpOnloadCallback();
          } else if (UlikeProRecaptchaData.recaptchaVersion === "v3") {
            ulp_recaptcha_v3_execute(element);
          }
      });
    }
  });

  if (typeof UlikeProRecaptchaData.recaptchaVersion !== "undefined") {
    if (
      typeof grecaptcha !== "undefined" &&
      UlikeProRecaptchaData.recaptchaVersion === "v3"
    ) {
      grecaptcha.ready(function () {
        $(".ulp-ajax-form").each(function () {
          ulp_recaptcha_v3_execute(this);
        });
      });
    }
  }

  function ulp_recaptcha_v3_execute(element) {
    var $form = $(element).find("form");
    var action = $form.find(".ulp-google-recaptch").data("mode") || "homepage";
    grecaptcha
      .execute(UlikeProRecaptchaData.recaptchaSiteKey, {
        action: action,
      })
      .then(function (token) {
        if ($form.find('[name="g-recaptcha-response"]').length) {
          $form.find('[name="g-recaptcha-response"]').val(token);
        } else {
          $form.append(
            '<input type="hidden" name="g-recaptcha-response" value="' +
              token +
              '">'
          );
        }
      });
  }
})(jQuery);
