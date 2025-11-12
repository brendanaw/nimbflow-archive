/**
 * NF Tools Client Onboarding Drop-Off Cost Calculator
 * JavaScript for calculator functionality, modals and AJAX
 */
jQuery(document).ready(function($) {
    // Object to handle calculator functionality
    var NF_COB_Calculator = {
        /**
         * Initialize all calculators on the page
         */
        init: function() {
            console.log('Client Onboarding Calculator initializing...');
            const self = this;

            $('.nf-cob-calculator-wrapper').each(function() {
                // Pass the wrapper element directly to the initializer
                self.initializeCalculator($(this)); 
            });
        },

        /**
         * Initialize a single calculator instance
         * 
         * @param {jQuery} $calculator The jQuery object for the .nf-cob-calculator-wrapper div
         */
        initializeCalculator: function($calculator) {
            const calculatorId = $calculator.data('calculator-id');
            // Read setting directly from data attribute, convert string '1'/'0' to boolean
            const enableLeadCaptureAttribute = $calculator.data('enable-lead-capture'); 
            
            // Convert to boolean
            const enableLeadCapture = enableLeadCaptureAttribute === true || enableLeadCaptureAttribute === 1 || enableLeadCaptureAttribute === '1';
            
            console.log('Setting up calculator with ID:', calculatorId, 'Lead Capture Enabled:', enableLeadCapture);
            
            const $form = $calculator.find('.nf-cob-form');
            
            // Select the lead modal by ID
            const $leadModal = $('#nf-cob-lead-capture-modal_' + calculatorId);
            const $resultsModal = $calculator.find('.nf-cob-results-modal');
            const $leadForm = $leadModal.find('.nf-cob-lead-form');
            
            if (!$form.length) {
                console.error('Calculator form not found for ID:', calculatorId);
                return; // Skip if essential elements are missing
            }
            
            // Pass the enableLeadCapture boolean directly
            this.setupConditionalFields($calculator);
            this.setupSlider($calculator);
            this.setupFormSubmission($calculator, $form, $leadModal, $resultsModal, $leadForm, enableLeadCapture);
            this.setupModalClosers($calculator);
            
        },
        
        /**
         * Set up conditional fields based on who performs onboarding
         */
        setupConditionalFields: function($calculator) {
            const $performedBySelect = $calculator.find('select[name="performed_by"]');
            const $employeeFields = $calculator.find('.nf-cob-employee-fields');
            const $selfFields = $calculator.find('.nf-cob-self-fields');
            
            // Handle change event
            $performedBySelect.on('change', function() {
                const selectedValue = $(this).val();
                
                if (selectedValue === 'employee') {
                    $employeeFields.slideDown();
                    $employeeFields.find('input').prop('required', true);
                    $selfFields.slideUp();
                    $selfFields.find('input').prop('required', false).val('');
                } else if (selectedValue === 'self') {
                    $selfFields.slideDown();
                    $selfFields.find('input').prop('required', true);
                    $employeeFields.slideUp();
                    $employeeFields.find('input').prop('required', false).val('');
                } else {
                    // No selection
                    $employeeFields.slideUp();
                    $selfFields.slideUp();
                    $employeeFields.find('input').prop('required', false).val('');
                    $selfFields.find('input').prop('required', false).val('');
                }
            });
        },

        /**
         * Set up slider functionality
         */
        setupSlider: function($calculator) {
            const $slider = $calculator.find('.nf-cob-slider');
            const $sliderValue = $calculator.find('.nf-cob-slider-value');
            
            $slider.on('input', function() {
                $sliderValue.text($(this).val() + '%');
            });
        },
        
        /**
         * Set up form submission and modal handling
         */
        setupFormSubmission: function($calculator, $form, $leadModal, $resultsModal, $leadForm, enableLeadCapture) {
            // Handle main form submission
            $form.on('submit', function(e) {
                e.preventDefault();
                const calculatorId = $calculator.data('calculator-id');
                console.log('Form submitted, calculator ID:', calculatorId);
                
                // Clear any existing error messages
                NF_COB_Calculator.clearErrorMessage($form);
                
                // Validate the form
                if (!this.checkValidity()) {
                    console.log('Form validation failed');
                    this.reportValidity();
                    return;
                }
                
                // If lead capture is enabled AND the lead modal exists, show lead modal
                // Otherwise calculate directly
                if (enableLeadCapture && $leadModal.length > 0) {
                    console.log('Lead capture enabled, showing lead form');
                    NF_COB_Calculator.openModal($leadModal);
                } else {
                    console.log('Lead capture disabled or modal missing, calculating directly');
                    NF_COB_Calculator.submitCalculation($form, null, $resultsModal);
                }
            });
            
            // Handle lead form submission
            if ($leadForm.length > 0) {
                $leadForm.on('submit', function(e) {
                    e.preventDefault();
                    console.log('Lead form submitted');
                    
                    // Clear any existing error messages
                    NF_COB_Calculator.clearErrorMessage($leadForm);
                    
                    // Validate the form
                    if (!this.checkValidity()) {
                        console.log('Lead form validation failed');
                        this.reportValidity();
                        return;
                    }
                    
                    // Submit for calculation
                    NF_COB_Calculator.submitCalculation($form, $leadForm, $resultsModal);
                    NF_COB_Calculator.closeModal($leadModal);
                });
            }
        },
        
        /**
         * Set up modal close buttons
         */
        setupModalClosers: function($calculator) {
            // Handle modal close buttons
            $calculator.parent().find('.nf-cob-modal-close').on('click', function() {
                const $modal = $(this).closest('.nf-cob-modal');
                NF_COB_Calculator.closeModal($modal);
            });
            
            // Close modal when clicking outside the modal content
            $calculator.parent().find('.nf-cob-modal').on('click', function(e) {
                if ($(e.target).hasClass('nf-cob-modal')) {
                    NF_COB_Calculator.closeModal($(this));
                }
            });
        },
        
        /**
         * Submit calculation via AJAX
         */
        submitCalculation: function($mainForm, $leadForm, $resultsModal) {
            console.log('Submitting calculation', {main: $mainForm.length, lead: $leadForm ? $leadForm.length : 'none'});
            
            const $calculator = $mainForm.closest('.nf-cob-calculator-wrapper');
            const calculatorId = $calculator.data('calculator-id');
            
            // Get nonce and ajax_url directly from data attributes
            const nonce = $calculator.data('nonce');
            const ajaxUrl = $calculator.data('ajax-url');

            // Ensure nonce and ajaxUrl were found
            if (!nonce || !ajaxUrl) {
                console.error('Error: Security data (nonce or ajax_url) not found in data attributes for calculator ID:', calculatorId);
                NF_COB_Calculator.showErrorMessage($mainForm, 'Security data missing. Cannot submit.');
                return; // Stop submission
            }

            // Collect all form data - handle $mainForm first
            let formData = $mainForm.serializeArray();
            const mainFormData = {};
            $.each(formData, function(i, field) {
                mainFormData[field.name] = field.value;
            });
            
            // Handle lead form data separately
            const leadFormData = {};
            let hasLeadData = false;
            
            if ($leadForm && $leadForm.length) {
                console.log('Lead form present - collecting lead data');
                const leadFields = $leadForm.serializeArray();
                $.each(leadFields, function(i, field) {
                    leadFormData[field.name] = field.value;
                    hasLeadData = true;
                });
            }
            
            // Build AJAX data object
            let ajaxData = {
                action: 'nf_tools_client_onboarding_calculate',
                _ajax_nonce: nonce, // Standard WordPress AJAX nonce parameter
                nonce: nonce,       // Alternative parameter name
                calculator_id: calculatorId,
                
                // Required form fields from main form
                clients_per_month: mainFormData.clients_per_month || '',
                average_client_value: mainFormData.average_client_value || '',
                hours_per_client: mainFormData.hours_per_client || '',
                dropoff_rate: mainFormData.dropoff_rate || '15',
                onboarding_timeline: mainFormData.onboarding_timeline || '2_3_days',
                performed_by: mainFormData.performed_by || '',
                num_employees: mainFormData.num_employees || '',
                total_yearly_salary: mainFormData.total_yearly_salary || '',
                hourly_value: mainFormData.hourly_value || '',
                
                // Optional automation cost fields
                setup_cost: mainFormData.setup_cost || '',
                monthly_maintenance: mainFormData.monthly_maintenance || '',
            };
            
            // Only include lead data if lead form was actually submitted
            if (hasLeadData) {
                console.log('Including lead data in AJAX request');
                ajaxData.first_name = leadFormData.first_name || '';
                ajaxData.last_name = leadFormData.last_name || '';
                ajaxData.email = leadFormData.email || '';
            }
            
            // Show the loading indicator
            $mainForm.find('.nf-cob-loader').show();
            $mainForm.find('.nf-cob-submit-button').prop('disabled', true);
            
            console.log('AJAX data to be sent:', ajaxData);
            
            // Send AJAX request
            $.ajax({
                url: ajaxUrl,
                type: 'POST',
                data: ajaxData,
                dataType: 'json',
                success: function(response) {
                    console.log('AJAX success - Full Response:', response);
                    $mainForm.find('.nf-cob-loader').hide();
                    $mainForm.find('.nf-cob-submit-button').prop('disabled', false);
                    
                    if (response.success) {
                        NF_COB_Calculator.displayResults(response.data, $resultsModal);
                    } else {
                        NF_COB_Calculator.showErrorMessage(
                            $mainForm, 
                            response.data && response.data.message ? response.data.message : 'An unknown error occurred.'
                        );
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log('AJAX error full response text:', jqXHR.responseText);
                    $mainForm.find('.nf-cob-loader').hide();
                    $mainForm.find('.nf-cob-submit-button').prop('disabled', false);
                    
                    let errorMessage = 'AJAX error: ' + textStatus;
                    if (jqXHR.responseJSON && jqXHR.responseJSON.data && jqXHR.responseJSON.data.message) {
                        errorMessage = jqXHR.responseJSON.data.message;
                    } else if (errorThrown) {
                        errorMessage += ' - ' + errorThrown;
                    }
                    
                    NF_COB_Calculator.showErrorMessage($mainForm, errorMessage);
                    console.error('AJAX Error:', textStatus, errorThrown);
                }
            });
        },
        
        /**
         * Display results in modal
         */
        displayResults: function(data, $resultsModal) {
            console.log('Displaying results:', data);
            
            const currencySymbol = data.currency_symbol || '$';
            const firstName = data.first_name || 'there';
            const serviceLabel = data.service_label || 'client onboarding';
            const serviceUrl = data.service_url || '#';
            
            // Get the message templates with fallbacks
            let resultsMessage = data.results_message || 'Thank you, {first_name} for using our calculator!';
            let serviceLinkMessage = data.service_link_message || 'Learn more about {service_label}';
            
            // Replace placeholders in the messages
            resultsMessage = resultsMessage.replace('{first_name}', firstName)
                                        .replace('{service_label}', serviceLabel);
                                        
            serviceLinkMessage = serviceLinkMessage.replace('{first_name}', firstName)
                                        .replace('{service_label}', serviceLabel);
            
            // Format the numbers
            const monthlyRevenueLost = parseFloat(data.monthly_revenue_lost);
            const monthlyCostOfTime = parseFloat(data.monthly_cost_of_time);
            const annualCostOfOnboarding = parseFloat(data.annual_cost_of_onboarding);
            const annualTotalImpact = parseFloat(data.annual_total_impact);
            const hoursSavedPerYear = parseFloat(data.hours_saved_per_year);
            const breakevenMonths = data.breakeven_months;

            const formattedMonthlyRevenueLost = currencySymbol + monthlyRevenueLost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedMonthlyCostOfTime = currencySymbol + monthlyCostOfTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedAnnualCost = currencySymbol + annualCostOfOnboarding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedTotalImpact = currencySymbol + annualTotalImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedHours = hoursSavedPerYear.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' hrs';
            const formattedBreakeven = breakevenMonths !== 'N/A' ? breakevenMonths + ' months' : 'N/A';

            const resultsHtml = `
                <div class="nf-cob-result-card">
                    <h3>Total annual impact</h3>
                    <div class="nf-cob-result-value">${formattedTotalImpact}</div>
                </div>
                <div class="nf-cob-result-card">
                    <h3>Monthly revenue lost from drop-offs</h3>
                    <div class="nf-cob-result-value">${formattedMonthlyRevenueLost}</div>
                </div>
                <div class="nf-cob-result-card">
                    <h3>Monthly cost of manual onboarding time</h3>
                    <div class="nf-cob-result-value">${formattedMonthlyCostOfTime}</div>
                </div>
                <div class="nf-cob-result-card">
                    <h3>Annual cost of manual onboarding</h3>
                    <div class="nf-cob-result-value">${formattedAnnualCost}</div>
                </div>
                <div class="nf-cob-result-card">
                    <h3>Estimated payback period</h3>
                    <div class="nf-cob-result-value">${formattedBreakeven}</div>
                </div>
                <div class="nf-cob-result-card">
                    <h3>Estimated hours saved per year</h3>
                    <div class="nf-cob-result-value">${formattedHours}</div>
                </div>
                <div class="nf-cob-thank-you">
                    ${resultsMessage}
                    <br><a href="${serviceUrl}">${serviceLinkMessage}</a>
                </div>
            `;
            
            // Insert HTML into results modal content body
            $resultsModal.find('.nf-cob-modal-content-body').html(resultsHtml);
            
            // Show the modal
            $resultsModal.show();
        },
        
        /**
         * Open a modal
         */
        openModal: function($modal) {
            if ($modal && $modal.length) {
                console.log('Opening modal:', $modal.attr('id'));
                $modal.fadeIn(300);
                $('body').addClass('nf-cob-modal-open');
            } else {
                console.error('Cannot open modal: Invalid element', $modal);
            }
        },
        
        /**
         * Close a modal
         */
        closeModal: function($modal) {
            if ($modal && $modal.length) {
                console.log('Closing modal:', $modal.attr('id'));
                $modal.fadeOut(200);
                $('body').removeClass('nf-cob-modal-open');
            } else {
                console.error('Cannot close modal: Invalid element', $modal);
            }
        },
        
        /**
         * Show error message
         */
        showErrorMessage: function($form, message) {
            console.log('Showing error:', message);
            
            // Remove any existing error
            this.clearErrorMessage($form);
            
            // Create and insert error message
            const $error = $('<div class="nf-cob-error-message"></div>').html(message);
            $form.prepend($error);
            
            // Scroll to the error
            $('html, body').animate({
                scrollTop: $error.offset().top - 100
            }, 300);
        },
        
        /**
         * Clear error message
         */
        clearErrorMessage: function($form) {
            $form.find('.nf-cob-error-message').remove();
        }
    };
    
    // Initialize the calculator
    NF_COB_Calculator.init();
});