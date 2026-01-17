/**
 * ESTONIAN LANGUAGE FORM - INTERACTIVE FUNCTIONALITY
 * Handles form validation, floating labels, animations, and submission
 */

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initForm();
    initFloatingLabels();
    initProgressTracking();
    initAnimations();
    initPhoneInput();
});

// ============================================
// PHONE INPUT INITIALIZATION
// ============================================
let phoneInputIT;

function initPhoneInput() {
    const phoneInput = document.querySelector("#phone");
    if (phoneInput) {
        phoneInputIT = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            preferredCountries: ["ee", "us", "uk", "fi", "se", "lv", "lt"],
            separateDialCode: true,
            autoPlaceholder: "off"
        });

        // Function to update label position
        const updateLabelPosition = () => {
            // Get the flag container explicitly
            const flagContainer = document.querySelector('.iti__selected-flag');
            const label = document.querySelector('label[for="phone"]');

            if (label && flagContainer) {
                // Get the width of the flag/code section and add clearance
                const flagWidth = flagContainer.offsetWidth;
                // Add 12px extra space for better separation
                const leftOffset = `${flagWidth + 12}px`;
                label.style.setProperty('--phone-label-left', leftOffset);
            }
        };

        phoneInput.addEventListener('countrychange', updateLabelPosition);

        // Initial update with delay to ensure library has rendered
        setTimeout(updateLabelPosition, 500);

        // Also update on interactions just in case
        phoneInput.addEventListener('open:countrydropdown', updateLabelPosition);
        phoneInput.addEventListener('close:countrydropdown', updateLabelPosition);
    }
}

// ============================================
// FORM INITIALIZATION
// ============================================
function initForm() {
    const form = document.getElementById('intakeForm');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', handleFormSubmit);

    // Real-time validation on blur
    const inputs = form.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            // Clear error on input
            const field = input.closest('.form-field');
            if (field && field.classList.contains('error')) {
                field.classList.remove('error');
                const errorMsg = field.querySelector('.error-message');
                if (errorMsg) errorMsg.classList.remove('show');
            }
        });
    });

    // Radio button validation
    const radioInputs = form.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(radio => {
        radio.addEventListener('change', () => {
            const field = radio.closest('.form-field');
            if (field && field.classList.contains('error')) {
                field.classList.remove('error');
                const errorMsg = field.querySelector('.error-message');
                if (errorMsg) errorMsg.classList.remove('show');
            }
        });
    });
}

// ============================================
// FLOATING LABELS
// ============================================
function initFloatingLabels() {
    const inputs = document.querySelectorAll('.form-input');

    inputs.forEach(input => {
        const field = input.closest('.form-field');

        // Helper to update field state
        const updateFieldState = () => {
            if (input.value.trim() !== '') {
                input.classList.add('has-value');
                if (field) field.classList.add('field-has-value');
            } else {
                input.classList.remove('has-value');
                if (field) field.classList.remove('field-has-value');
            }
        };

        // Check on load
        updateFieldState();

        // Update on input
        input.addEventListener('input', updateFieldState);

        // Handle autofill and changes
        input.addEventListener('change', updateFieldState);
    });

    // Check for autofilled inputs after a short delay
    setTimeout(() => {
        inputs.forEach(input => {
            if (input.value.trim() !== '') {
                input.classList.add('has-value');
            }
        });
    }, 100);
}

// ============================================
// PROGRESS TRACKING
// ============================================
function initProgressTracking() {
    const form = document.getElementById('intakeForm');
    const progressBar = document.getElementById('progressBar');

    const updateProgress = () => {
        const requiredFields = [
            document.getElementById('fullName'),
            document.getElementById('email'),
            document.querySelector('input[name="languageLevel"]:checked'),
            document.getElementById('futureGoal'),
            document.getElementById('estonianKnowledge')
        ];

        let filledCount = 0;
        requiredFields.forEach(field => {
            if (field) {
                if (field.type === 'radio') {
                    if (field.checked) filledCount++;
                } else if (field.value.trim() !== '') {
                    filledCount++;
                }
            }
        });

        const progress = (filledCount / requiredFields.length) * 100;
        progressBar.style.width = `${progress}%`;
    };

    // Update progress on input, change, and blur events
    form.addEventListener('input', updateProgress);
    form.addEventListener('change', updateProgress);
    form.addEventListener('blur', updateProgress, true);

    // Initial progress check
    updateProgress();
}

// ============================================
// ANIMATIONS
// ============================================
function initAnimations() {
    // Stagger animation for form fields
    const formFields = document.querySelectorAll('.form-field');
    formFields.forEach((field, index) => {
        field.style.animation = `formSlideIn 0.5s ease-out ${0.1 * index}s both`;
    });
}

// ============================================
// FORM VALIDATION
// ============================================
function validateField(input) {
    const field = input.closest('.form-field');
    const fieldId = input.id;
    let errorMessage = '';
    let isValid = true;

    // Full Name validation
    if (fieldId === 'fullName') {
        const value = input.value.trim();
        if (value === '') {
            errorMessage = 'Please enter your full name';
            isValid = false;
        } else if (value.length < 2) {
            errorMessage = 'Name must be at least 2 characters';
            isValid = false;
        }
    }

    // Email validation
    if (fieldId === 'email') {
        const value = input.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value === '') {
            errorMessage = 'Please enter your email address';
            isValid = false;
        } else if (!emailRegex.test(value)) {
            errorMessage = 'Please enter a valid email address';
            isValid = false;
        }
    }

    // Phone validation (optional but if filled should be valid)
    if (fieldId === 'phone') {
        const value = input.value.trim();
        if (value !== '') {
            if (phoneInputIT && !phoneInputIT.isValidNumber()) {
                errorMessage = 'Please enter a valid phone number';
                isValid = false;
            }
        }
    }

    // Textarea validation
    if (fieldId === 'futureGoal' || fieldId === 'estonianKnowledge') {
        const value = input.value.trim();
        if (value === '') {
            errorMessage = 'This field is required';
            isValid = false;
        } else if (value.length < 10) {
            errorMessage = 'Please provide more detail (at least 10 characters)';
            isValid = false;
        }
    }

    // Display error
    if (!isValid) {
        showError(field, fieldId, errorMessage);
    } else {
        clearError(field, fieldId);
    }

    return isValid;
}

function validateRadioGroup() {
    const radioGroup = document.querySelector('input[name="languageLevel"]:checked');
    const field = document.querySelector('.radio-group');

    if (!radioGroup) {
        showError(field, 'languageLevel', 'Please select your current language level');
        return false;
    } else {
        clearError(field, 'languageLevel');
        return true;
    }
}

function showError(field, fieldId, message) {
    field.classList.add('error');
    const errorElement = document.getElementById(`${fieldId}Error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function clearError(field, fieldId) {
    field.classList.remove('error');
    const errorElement = document.getElementById(`${fieldId}Error`);
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

// ============================================
// FORM SUBMISSION
// ============================================
// ============================================
// FORM SUBMISSION
// ============================================
async function handleFormSubmit(e) {
    e.preventDefault();

    // Validate all fields
    const fullName = document.getElementById('fullName');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const futureGoal = document.getElementById('futureGoal');
    const estonianKnowledge = document.getElementById('estonianKnowledge');

    let isValid = true;

    // Validate each field
    if (!validateField(fullName)) isValid = false;
    if (!validateField(email)) isValid = false;
    if (!validateField(phone)) isValid = false;
    if (!validateRadioGroup()) isValid = false;
    if (!validateField(futureGoal)) isValid = false;
    if (!validateField(estonianKnowledge)) isValid = false;

    if (!isValid) {
        // Scroll to first error
        const firstError = document.querySelector('.form-field.error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    // Get form data
    const formData = {
        action: 'formsubmit',
        fullName: fullName.value.trim(),
        email: email.value.trim(),
        email: email.value.trim(),
        phone: phoneInputIT ? phoneInputIT.getNumber() : (phone.value.trim() || null),
        languageLevel: document.querySelector('input[name="languageLevel"]:checked')?.value,
        futureGoal: futureGoal.value.trim(),
        estonianKnowledge: estonianKnowledge.value.trim(),
        timestamp: new Date().toISOString()
    };

    // Show loading state
    const submitBtn = document.getElementById('submitBtn');
    const originalBtnText = submitBtn.querySelector('.button-text');
    const loadingSpinner = submitBtn.querySelector('.button-loading');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
    }

    try {
        // Send data to webhook
        const response = await fetch('https://n8n.srv1106977.hstgr.cloud/webhook/studentsubmit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        // Try to parse JSON response
        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            // Check if response was text or empty
        }

        // Check for specific duplicate error (Status 409 Conflict)
        if (response.status === 409 || data.error === 'duplicate_email') {
            const emailField = email.closest('.form-field');
            showError(emailField, 'email', 'This email is already registered.');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            // Scroll to email field
            emailField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!response.ok) {
            throw new Error(`Webhook error: ${response.status}`);
        }

        // Show success animation
        setTimeout(() => {
            submitBtn.classList.remove('loading');
            showSuccessMessage();
        }, 800);

    } catch (error) {
        console.error('Submission error:', error);
        alert('There was an error submitting your form. Please try again.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }
}

// ============================================
// SUCCESS ANIMATION
// ============================================
function showSuccessMessage() {
    const formContainer = document.getElementById('formContainer');
    const successMessage = document.getElementById('successMessage');
    const progressBar = document.getElementById('progressBar');
    const formHeader = document.querySelector('.form-header'); // Optional: hide header too

    // 1. Fade out Form
    if (formContainer) formContainer.classList.add('fade-out');
    if (formHeader) formHeader.classList.add('fade-out');

    // 2. Wait for fade out (500ms)
    setTimeout(() => {
        // Hide form completely to collapse space
        if (formContainer) formContainer.style.display = 'none';
        if (formHeader) formHeader.style.display = 'none';

        // Prepare Success Message
        if (successMessage) {
            successMessage.classList.add('active'); // active sets display:block

            // Short delay to allow display:block to render before opacity transition
            requestAnimationFrame(() => {
                successMessage.classList.add('fade-in');
            });
        }

        // Reset progress bar
        if (progressBar) {
            progressBar.style.width = '100%';
        }
    }, 500);
}


// ============================================
// ACCESSIBILITY ENHANCEMENTS
// ============================================
// Announce form errors to screen readers
function announceError(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'polite');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
// Smooth scroll polyfill for older browsers
if (!('scrollBehavior' in document.documentElement.style)) {
    const scrollToElement = (element) => {
        const targetPosition = element.offsetTop;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 500;
        let start = null;

        const animation = (currentTime) => {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        };

        const easeInOutQuad = (t, b, c, d) => {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        };

        requestAnimationFrame(animation);
    };
}
