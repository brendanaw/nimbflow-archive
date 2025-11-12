/**
 * NF Tools ROI Calculator
 * JavaScript for calculator functionality, modals and AJAX
 */
jQuery(document).ready(function($) {
    // Object to handle calculator functionality
    var NF_ROI_Calculator = {
        /**
         * Initialize all calculators on the page
         */
        init: function() {
            console.log('ROI Calculator initializing...');
            const self = this;

            $('.nf-roi-calculator-wrapper').each(function() {
                // Pass the wrapper element directly to the initializer
                self.initializeCalculator($(this)); 
            });
        },

        /**
         * Initialize a single calculator instance
         * 
         * @param {jQuery} $calculator The jQuery object for the .nf-roi-calculator-wrapper div
         */
        initializeCalculator: function($calculator) {
            const calculatorId = $calculator.data('calculator-id');
            // Read setting directly from data attribute, convert string '1'/'0' to boolean
            const enableLeadCaptureAttribute = $calculator.data('enable-lead-capture'); 
            
            // IMPORTANT DEBUGGING OUTPUT
            console.log('Raw lead capture attribute value:', enableLeadCaptureAttribute);
            console.log('Lead capture attribute type:', typeof enableLeadCaptureAttribute);
            
            // TEMPORARY FIX: Force enable lead capture regardless of attribute value
            const enableLeadCapture = true; // Forcing this to true to test lead capture functionality
            
            console.log('Setting up calculator with ID:', calculatorId, 'Lead Capture Enabled:', enableLeadCapture);
            
            const $form = $calculator.find('.nf-roi-form');
            
            // FIX: Select the lead modal by ID instead of by class
            // Old: const $leadModal = $calculator.find('.nf-roi-lead-capture-modal');
            const $leadModal = $('#nf-roi-lead-capture-modal_' + calculatorId);
            
            const $resultsModal = $calculator.find('.nf-roi-results-modal');
            const $leadForm = $leadModal.find('.nf-roi-lead-form');
            
            // Debug lead modal
            console.log('Lead modal element found:', $leadModal.length > 0);
            if ($leadModal.length > 0) {
                console.log('Lead modal HTML structure:', $leadModal.html().substring(0, 100) + '...');
            } else {
                console.error('Lead modal not found in the DOM! This is why lead capture is not working.');
                // Extra debugging - try another selector approach
                const alternativeModal = document.getElementById('nf-roi-lead-capture-modal_' + calculatorId);
                console.log('Alternate lookup with document.getElementById:', alternativeModal ? 'FOUND' : 'NOT FOUND');
            }
            
            if (!$form.length) {
                console.error('Calculator form not found for ID:', calculatorId);
                return; // Skip if essential elements are missing
            }
            
            // Pass the enableLeadCapture boolean directly
            this.setupConditionalFields($calculator);
            this.setupFormSubmission($calculator, $form, $leadModal, $resultsModal, $leadForm, enableLeadCapture);
            this.setupModalClosers($calculator);
            
        },
        
        /**
         * Set up conditional fields based on who performs the task
         */
        setupConditionalFields: function($calculator) {
            const $performedBy = $calculator.find('select[name="performed_by"]');
            const $employeeFields = $calculator.find('.nf-roi-employee-fields');
            const $selfFields = $calculator.find('.nf-roi-self-fields');
            
            // Handle initial state
            if ($performedBy.val() === 'employee') {
                $employeeFields.show();
                $selfFields.hide();
            } else if ($performedBy.val() === 'self') {
                $selfFields.show();
                $employeeFields.hide();
            } else {
                $employeeFields.hide();
                $selfFields.hide();
            }
            
            // Handle change event
            $performedBy.on('change', function() {
                if ($(this).val() === 'employee') {
                    $employeeFields.slideDown();
                    $selfFields.slideUp();
                    $employeeFields.find('input').prop('required', true);
                    $selfFields.find('input').prop('required', false);
                } else if ($(this).val() === 'self') {
                    $selfFields.slideDown();
                    $employeeFields.slideUp();
                    $selfFields.find('input').prop('required', true);
                    $employeeFields.find('input').prop('required', false);
                } else {
                    $employeeFields.slideUp();
                    $selfFields.slideUp();
                    $employeeFields.find('input').prop('required', false);
                    $selfFields.find('input').prop('required', false);
                }
            });
        },
        
        /**
         * Set up form submission and modal handling
         */
        setupFormSubmission: function($calculator, $form, $leadModal, $resultsModal, $leadForm, enableLeadCapture) {
            // Add clearer debug output
            console.log('Setting up form submission - Lead capture enabled:', enableLeadCapture);
            console.log('Lead modal present:', $leadModal.length > 0);
            
            // Handle main form submission
            $form.on('submit', function(e) {
                e.preventDefault();
                const calculatorId = $calculator.data('calculator-id');
                console.log('Form submitted, calculator ID:', calculatorId);
                
                // Clear any existing error messages
                NF_ROI_Calculator.clearErrorMessage($form);
                
                // Validate the form
                if (!this.checkValidity()) {
                    console.log('Form validation failed');
                    this.reportValidity();
                    return;
                }
                
                // Convert string '1'/'0' to boolean for reliable comparison
                const leadCaptureEnabled = enableLeadCapture === true || enableLeadCapture === 1 || enableLeadCapture === '1';
                console.log('Lead capture determined to be:', leadCaptureEnabled ? 'ENABLED' : 'DISABLED');
                
                // If lead capture is enabled AND the lead modal exists, show lead modal
                // Otherwise calculate directly
                if (leadCaptureEnabled && $leadModal.length > 0) {
                    console.log('Lead capture enabled, showing lead form');
                    NF_ROI_Calculator.openModal($leadModal);
                } else {
                    console.log('Lead capture disabled or modal missing, calculating directly');
                    NF_ROI_Calculator.submitCalculation($form, null, $resultsModal);
                }
            });
            
            // Handle lead form submission
            if ($leadForm.length > 0) {
                $leadForm.on('submit', function(e) {
                    e.preventDefault();
                    console.log('Lead form submitted');
                    
                    // Clear any existing error messages
                    NF_ROI_Calculator.clearErrorMessage($leadForm);
                    
                    // Validate the form
                    if (!this.checkValidity()) {
                        console.log('Lead form validation failed');
                        this.reportValidity();
                        return;
                    }
                    
                    // Submit for calculation
                    NF_ROI_Calculator.submitCalculation($form, $leadForm, $resultsModal);
                    NF_ROI_Calculator.closeModal($leadModal);
                });
            } else {
                console.log('Lead form not found, skipping lead form submission setup');
            }
        },
        
        /**
         * Set up modal close buttons
         */
        setupModalClosers: function($calculator) {
            // Handle modal close buttons
            $calculator.parent().find('.nf-roi-modal-close').on('click', function() {
                const $modal = $(this).closest('.nf-roi-modal');
                NF_ROI_Calculator.closeModal($modal);
            });
            
            // Close modal when clicking outside the modal content
            $calculator.parent().find('.nf-roi-modal').on('click', function(e) {
                if ($(e.target).hasClass('nf-roi-modal')) {
                    NF_ROI_Calculator.closeModal($(this));
                }
            });
        },
        
        /**
         * Submit calculation via AJAX
         */
        submitCalculation: function($mainForm, $leadForm, $resultsModal) {
            console.log('Submitting calculation', {main: $mainForm.length, lead: $leadForm ? $leadForm.length : 'none'});
            
            const $calculator = $mainForm.closest('.nf-roi-calculator-wrapper');
            const calculatorId = $calculator.data('calculator-id');
            
            // Get nonce and ajax_url directly from data attributes
            const nonce = $calculator.data('nonce');
            const ajaxUrl = $calculator.data('ajax-url');

            // Ensure nonce and ajaxUrl were found
            if (!nonce || !ajaxUrl) {
                console.error('Error: Security data (nonce or ajax_url) not found in data attributes for calculator ID:', calculatorId);
                NF_ROI_Calculator.showErrorMessage($mainForm, 'Security data missing. Cannot submit.');
                return; // Stop submission
            }

            console.log('JS DEBUG: Sending Nonce:', nonce);
            console.log('JS DEBUG: Sending Calculator ID:', calculatorId);

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
            } else {
                console.log('No lead form - lead data will not be included');
            }
            
            // Log all form data for debugging
            console.log('Main form data collected:', mainFormData);
            console.log('Lead form data collected:', leadFormData);
            console.log('Has lead data:', hasLeadData);
            
            // Build AJAX data object
            let ajaxData = {
                action: 'nf_tools_roi_calculate',
                _ajax_nonce: nonce, // Standard WordPress AJAX nonce parameter
                nonce: nonce,       // Alternative parameter name - make sure at least one will be accepted
                calculator_id: calculatorId,
                
                // Required form fields from main form
                service_area: mainFormData.service_area || '',
                task_name: mainFormData.task_name || '',
                hours_spent_per_week: mainFormData.hours_spent_per_week || '',
                performed_by: mainFormData.performed_by || '',
                hourly_value: mainFormData.hourly_value || '',
                
                // Optional fields from main form
                setup_cost: mainFormData.setup_cost || '',
                monthly_maintenance: mainFormData.monthly_maintenance || '',
                num_employees: mainFormData.num_employees || '',
                total_yearly_salary: mainFormData.total_yearly_salary || '',
            };
            
            // Only include lead data if lead form was actually submitted
            if (hasLeadData) {
                console.log('Including lead data in AJAX request');
                ajaxData.first_name = leadFormData.first_name || '';
                ajaxData.last_name = leadFormData.last_name || '';
                ajaxData.email = leadFormData.email || '';
            }
            
            // Show the loading indicator
            $mainForm.find('.nf-roi-loader').show();
            $mainForm.find('.nf-roi-submit-button').prop('disabled', true);
            
            console.log('AJAX data to be sent:', ajaxData); // Verify nonce is included
            
            // Send AJAX request
            $.ajax({
                url: ajaxUrl, // Use retrieved AJAX URL
                type: 'POST',
                data: ajaxData,
                dataType: 'json',
                success: function(response) {
                    console.log('AJAX success - Full Response:', response);
                    $mainForm.find('.nf-roi-loader').hide();
                    $mainForm.find('.nf-roi-submit-button').prop('disabled', false);
                    
                    if (response.success) {
                        NF_ROI_Calculator.displayResults(response.data, $resultsModal);
                    } else {
                        NF_ROI_Calculator.showErrorMessage(
                            $mainForm, 
                            response.data && response.data.message ? response.data.message : 'An unknown error occurred.'
                        );
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log('AJAX error full response text:', jqXHR.responseText);
                    $mainForm.find('.nf-roi-loader').hide();
                    $mainForm.find('.nf-roi-submit-button').prop('disabled', false);
                    
                    let errorMessage = 'AJAX error: ' + textStatus;
                    if (jqXHR.responseJSON && jqXHR.responseJSON.data && jqXHR.responseJSON.data.message) {
                        errorMessage = jqXHR.responseJSON.data.message;
                    } else if (errorThrown) {
                        errorMessage += ' - ' + errorThrown;
                    }
                    
                    NF_ROI_Calculator.showErrorMessage($mainForm, errorMessage);
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
            const serviceLabel = data.service_label || 'our services';
            const serviceUrl = data.service_url || '#';
            
            // Get the message templates with fallbacks
            let resultsMessage = data.results_message || 'Thank you, {first_name} for using our calculator!';
            let serviceLinkMessage = data.service_link_message || 'Learn more about {service_label}';
            
            // Replace placeholders in the messages
            resultsMessage = resultsMessage.replace('{first_name}', firstName)
                                        .replace('{service_label}', serviceLabel)
                                        .replace('{task_name}', data.task_name || '');
                                        
            serviceLinkMessage = serviceLinkMessage.replace('{first_name}', firstName)
                                        .replace('{service_label}', serviceLabel)
                                        .replace('{task_name}', data.task_name || '');
            
            const yearlySavingsRaw = parseFloat(data.yearly_savings);
            const roi_percentage_raw = parseFloat(data.roi_percentage);
            const payback_period_months_raw = parseFloat(data.payback_period_months);
            const yearlyHoursSavedRaw = parseFloat(data.yearly_hours_saved);

            const yearlySavings = currencySymbol + yearlySavingsRaw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formatted_roi = roi_percentage_raw.toFixed(2) + '%';
            const formatted_payback = payback_period_months_raw.toFixed(2) + ' Months';
            const formatted_hours = yearlyHoursSavedRaw.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' hrs';

            const resultsHtml = `
                <div class="nf-roi-result-card">
                    <h3>Annual savings</h3>
                    <div class="nf-roi-result-value">${yearlySavings}</div>
                </div>
                <div class="nf-roi-result-card">
                    <h3>Return on investment</h3>
                    <div class="nf-roi-result-value">${formatted_roi}</div>
                </div>
                <div class="nf-roi-result-card">
                    <h3>Payback period</h3>
                    <div class="nf-roi-result-value">${formatted_payback}</div>
                </div>
                <div class="nf-roi-result-card">
                    <h3>Yearly hours saved</h3>
                    <div class="nf-roi-result-value">${formatted_hours}</div>
                </div>
                <div class="nf-roi-thank-you">
                    ${resultsMessage}
                    <br><a href="${serviceUrl}">${serviceLinkMessage}</a>
                </div>
            `;
            
            // Insert HTML into results modal content body
            $resultsModal.find('.nf-roi-modal-content-body').html(resultsHtml);
            
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
                $('body').addClass('nf-roi-modal-open');
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
                $('body').removeClass('nf-roi-modal-open');
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
            const $error = $('<div class="nf-roi-error-message"></div>').html(message);
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
            $form.find('.nf-roi-error-message').remove();
        }
    };
    
    // Initialize the calculator
    NF_ROI_Calculator.init();
});
