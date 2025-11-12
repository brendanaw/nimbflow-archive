/**
 * NF Tools Lead Follow-Up Leak Calculator
 * JavaScript for calculator functionality, modals and AJAX
 */
jQuery(document).ready(function($) {
    // Object to handle calculator functionality
    var NF_Lead_Leak_Calculator = {
        /**
         * Initialize all calculators on the page
         */
        init: function() {
            console.log('Lead Follow-Up Leak Calculator initializing...');
            const self = this;

            $('.nf-lead-leak-calculator-wrapper').each(function() {
                // Pass the wrapper element directly to the initializer
                self.initializeCalculator($(this)); 
            });
        },

        /**
         * Initialize a single calculator instance
         * 
         * @param {jQuery} $calculator The jQuery object for the .nf-lead-leak-calculator-wrapper div
         */
        initializeCalculator: function($calculator) {
            const calculatorId = $calculator.data('calculator-id');
            // Read setting directly from data attribute, convert string '1'/'0' to boolean
            const enableLeadCaptureAttribute = $calculator.data('enable-lead-capture');
            const enableLeadCapture = enableLeadCaptureAttribute === '1' || enableLeadCaptureAttribute === 1;
            
            console.log('Setting up calculator with ID:', calculatorId, 'Lead Capture Enabled:', enableLeadCapture);
            
            const $form = $calculator.find('.nf-lead-leak-form');
            const $leadModal = $('#nf-lead-leak-lead-capture-modal_' + calculatorId);
            const $resultsModal = $('#nf-lead-leak-results-modal_' + calculatorId);
            const $leadForm = $leadModal.find('.nf-lead-leak-lead-form');
            
            if (!$form.length) {
                console.error('Calculator form not found for ID:', calculatorId);
                return; // Skip if essential elements are missing
            }
            
            // Set up conditional fields based on who performs follow-up
            this.setupPerformedByField($calculator);
            // Set up form submission
            this.setupFormSubmission($calculator, $form, $leadModal, $resultsModal, $leadForm, enableLeadCapture);
            // Set up modal closers
            this.setupModalClosers($calculator);
        },
        
        /**
         * Set up conditional fields based on who performs follow-up
         */
        setupPerformedByField: function($calculator) {
            const $performedBySelect = $calculator.find('select[name="performed_by"]');
            const $employeeFields = $calculator.find('.nf-lead-leak-employee-fields');
            const $selfFields = $calculator.find('.nf-lead-leak-self-fields');
            
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
         * Set up form submission and modal handling
         */
        setupFormSubmission: function($calculator, $form, $leadModal, $resultsModal, $leadForm, enableLeadCapture) {
            console.log('Setting up form submission - Lead capture enabled:', enableLeadCapture);
            
            // Handle main form submission
            $form.on('submit', function(e) {
                e.preventDefault();
                const calculatorId = $calculator.data('calculator-id');
                console.log('Form submitted, calculator ID:', calculatorId);
                
                // Clear any existing error messages
                NF_Lead_Leak_Calculator.clearErrorMessage($form);
                
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
                    NF_Lead_Leak_Calculator.openModal($leadModal);
                } else {
                    console.log('Lead capture disabled or modal missing, calculating directly');
                    NF_Lead_Leak_Calculator.submitCalculation($form, null, $resultsModal);
                }
            });
            
            // Handle lead form submission
            if ($leadForm.length > 0) {
                $leadForm.on('submit', function(e) {
                    e.preventDefault();
                    console.log('Lead form submitted');
                    
                    // Clear any existing error messages
                    NF_Lead_Leak_Calculator.clearErrorMessage($leadForm);
                    
                    // Validate the form
                    if (!this.checkValidity()) {
                        console.log('Lead form validation failed');
                        this.reportValidity();
                        return;
                    }
                    
                    // Submit for calculation
                    NF_Lead_Leak_Calculator.submitCalculation($form, $leadForm, $resultsModal);
                    NF_Lead_Leak_Calculator.closeModal($leadModal);
                });
            }
        },
        
        /**
         * Set up modal close buttons
         */
        setupModalClosers: function($calculator) {
            // Handle modal close buttons
            $('.nf-lead-leak-close').on('click', function() {
                const $modal = $(this).closest('.nf-lead-leak-modal');
                NF_Lead_Leak_Calculator.closeModal($modal);
            });
            
            // Close modal when clicking outside the modal content
            $('.nf-lead-leak-modal').on('click', function(e) {
                if ($(e.target).hasClass('nf-lead-leak-modal')) {
                    NF_Lead_Leak_Calculator.closeModal($(this));
                }
            });
        },
        
        /**
         * Submit calculation via AJAX
         */
        submitCalculation: function($mainForm, $leadForm, $resultsModal) {
            console.log('Submitting calculation');
            
            const $calculator = $mainForm.closest('.nf-lead-leak-calculator-wrapper');
            const calculatorId = $calculator.data('calculator-id');
            
            // Get nonce and ajax_url directly from data attributes
            const nonce = $calculator.data('nonce');
            const ajaxUrl = $calculator.data('ajax-url');

            // Ensure nonce and ajaxUrl were found
            if (!nonce || !ajaxUrl) {
                console.error('Error: Security data (nonce or ajax_url) not found');
                NF_Lead_Leak_Calculator.showErrorMessage($mainForm, 'Security data missing. Cannot submit.');
                return;
            }

            // Collect all form data
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
                action: 'nf_tools_lead_followup_leak_calculate',
                nonce: nonce,
                calculator_id: calculatorId,
                
                // Required form fields
                leads_per_month: mainFormData.leads_per_month || '',
                avg_deal_value: mainFormData.avg_deal_value || '',
                current_followup_delay: mainFormData.current_followup_delay || '',
                manual_touch_hours_wk: mainFormData.manual_touch_hours_wk || '',
                close_rate_with_follow: mainFormData.close_rate_with_follow || '25',
                close_rate_current: mainFormData.close_rate_current || '12',
                performed_by: mainFormData.performed_by || '',
                
                // Conditional fields based on who performs
                num_employees: mainFormData.num_employees || '',
                total_yearly_salary: mainFormData.total_yearly_salary || '',
                hourly_value: mainFormData.hourly_value || '',
                
                // Optional fields
                setup_cost: mainFormData.setup_cost || '',
                monthly_maintenance_cost: mainFormData.monthly_maintenance_cost || ''
            };
            
            // Only include lead data if lead form was actually submitted
            if (hasLeadData) {
                ajaxData.user_info = {
                    first_name: leadFormData.first_name || '',
                    last_name: leadFormData.last_name || '',
                    email: leadFormData.email || ''
                };
            }
            
            // Show the loading indicator
            $mainForm.find('.nf-lead-leak-loader').show();
            $mainForm.find('.nf-lead-leak-submit-button').prop('disabled', true);
            
            console.log('AJAX data to be sent:', ajaxData);
            
            // Send AJAX request
            $.ajax({
                url: ajaxUrl,
                type: 'POST',
                data: ajaxData,
                dataType: 'json',
                success: function(response) {
                    console.log('AJAX success - Full Response:', response);
                    $mainForm.find('.nf-lead-leak-loader').hide();
                    $mainForm.find('.nf-lead-leak-submit-button').prop('disabled', false);
                    
                    if (response.success) {
                        NF_Lead_Leak_Calculator.displayResults(response.data, $resultsModal);
                    } else {
                        NF_Lead_Leak_Calculator.showErrorMessage(
                            $mainForm, 
                            response.data && response.data.message ? response.data.message : 'An unknown error occurred.'
                        );
                    }
                },
                error: function(xhr, status, error) {
                    console.error('AJAX error:', status, error);
                    $mainForm.find('.nf-lead-leak-loader').hide();
                    $mainForm.find('.nf-lead-leak-submit-button').prop('disabled', false);
                    NF_Lead_Leak_Calculator.showErrorMessage(
                        $mainForm, 
                        'An error occurred while processing your request. Please try again.'
                    );
                }
            });
        },
        
        /**
         * Display calculation results in the modal
         */
        displayResults: function(data, $resultsModal) {
            console.log('Displaying results:', data);
            
            // Build the results HTML
            let resultsHtml = `
                <div class="nf-lead-leak-result-card">
                    <h3>Monthly revenue lost</h3>
                    <div class="nf-lead-leak-result-value">${data.currency_symbol}${this.formatNumber(data.monthly_revenue_lost, 2)}</div>
                </div>
                
                <div class="nf-lead-leak-result-card">
                    <h3>Monthly time cost</h3>
                    <div class="nf-lead-leak-result-value">${data.currency_symbol}${this.formatNumber(data.monthly_time_cost, 2)}</div>
                </div>
                
                <div class="nf-lead-leak-result-card">
                    <h3>Annual total impact</h3>
                    <div class="nf-lead-leak-result-value">${data.currency_symbol}${this.formatNumber(data.annual_total_impact, 2)}</div>
                </div>
                
                <div class="nf-lead-leak-result-card">
                    <h3>Payback period</h3>
                    <div class="nf-lead-leak-result-value">${data.breakeven_months !== 'N/A' ? this.formatNumber(data.breakeven_months, 2) + ' Months' : 'N/A'}</div>
                </div>
                
                <div class="nf-lead-leak-result-card">
                    <h3>Yearly hours saved</h3>
                    <div class="nf-lead-leak-result-value">${this.formatNumber(data.hours_saved_year, 2)} hrs</div>
                </div>
                
                <div class="nf-lead-leak-result-card">
                    <h3>Return on investment</h3>
                    <div class="nf-lead-leak-result-value">${this.formatNumber(data.roi_percent_year1, 2)}%</div>
                </div>
            `;
            
            // Build complete modal content
            let modalContent = resultsHtml;
            
            // Handle thank you message and service link
            if (data.results_message || data.service_url) {
                modalContent += '<div class="nf-lead-leak-thank-you">';
                
                // Process thank you message with placeholders
                if (data.results_message) {
                    let thankYouMessage = data.results_message;
                    const firstName = data.first_name || 'there';
                    thankYouMessage = thankYouMessage.replace('{first_name}', firstName);
                    thankYouMessage = thankYouMessage.replace('{last_name}', data.last_name || '');
                    thankYouMessage = thankYouMessage.replace('{email}', data.email || '');
                    modalContent += thankYouMessage;
                }
                
                // Add service link if available
                if (data.service_url && data.service_link_message) {
                    let linkText = data.service_link_message;
                    linkText = linkText.replace('{service_label}', data.service_label || '');
                    modalContent += `<br><a href="${data.service_url}">${linkText}</a>`;
                }
                
                modalContent += '</div>';
            }
            
            // Insert all content into modal body
            $resultsModal.find('.nf-lead-leak-modal-content-body').html(modalContent);
            
            // Open the results modal
            this.openModal($resultsModal);
        },
        
        /**
         * Open a modal
         */
        openModal: function($modal) {
            $modal.fadeIn(300);
            $('body').css('overflow', 'hidden'); // Prevent scrolling
        },
        
        /**
         * Close a modal
         */
        closeModal: function($modal) {
            $modal.fadeOut(300);
            $('body').css('overflow', 'auto'); // Re-enable scrolling
        },
        
        /**
         * Show error message
         */
        showErrorMessage: function($form, message) {
            const errorHtml = `<div class="nf-lead-leak-error-message">${message}</div>`;
            $form.before(errorHtml);
        },
        
        /**
         * Clear error messages
         */
        clearErrorMessage: function($form) {
            $form.parent().find('.nf-lead-leak-error-message').remove();
        },
        
        /**
         * Format number with commas and decimals
         */
        formatNumber: function(num, decimals = 0) {
            return num.toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        }
    };
    
    // Initialize when DOM is ready
    NF_Lead_Leak_Calculator.init();
});