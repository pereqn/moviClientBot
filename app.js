(function() {
    'use strict';
    const CONFIG = {
        phonePrefix: '+7',
        defaultCity: 'Калининград',
        deliveryTypes: ['Мебель', 'Техника'],
        animationDuration: 2000,
        reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };
    const i18n = (function() {
        const translations = {
            ru: {
                title: 'MOVI - Заявка на доставку',
                nameLabel: 'ФИО',
                namePlaceholder: 'Введите ваше ФИО',
                phoneLabel: 'Телефон',
                addressLabel: 'Адрес',
                addressPlaceholder: 'Введите адрес доставки',
                cityLabel: 'Город',
                deliveryTypeLabel: 'Тип доставки',
                dateLabel: 'Дата доставки',
                timeLabel: 'Время доставки',
                optionsTitle: 'Дополнительные опции',
                barrierOption: 'Нужен пропуск через шлагбаум',
                assemblyOption: 'Нужна сборка',
                elevatorOption: 'Нужен лифт/грузовой подъёмник',
                submitBtn: 'Отправить заявку',
                successMessage: 'Заявка создана! ✓'
            },
            en: {
                title: 'MOVI - Delivery Request',
                nameLabel: 'Full Name',
                namePlaceholder: 'Enter your full name',
                phoneLabel: 'Phone',
                addressLabel: 'Address',
                addressPlaceholder: 'Enter delivery address',
                cityLabel: 'City',
                deliveryTypeLabel: 'Delivery Type',
                dateLabel: 'Delivery Date',
                timeLabel: 'Delivery Time',
                optionsTitle: 'Additional Options',
                barrierOption: 'Need barrier pass',
                assemblyOption: 'Need assembly',
                elevatorOption: 'Need elevator/freight lift',
                submitBtn: 'Submit Request',
                successMessage: 'Order placed! ✓'
            }
        };
        let currentLang = 'ru';
        function detectLanguage() {
            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code) {
                const tgLang = window.Telegram.WebApp.initDataUnsafe.user.language_code;
                if (translations[tgLang]) return tgLang;
                if (tgLang.startsWith('en')) return 'en';
            }
            const browserLang = navigator.language.split('-')[0];
            if (translations[browserLang]) return browserLang;
            const savedLang = localStorage.getItem('movi_lang');
            if (savedLang && translations[savedLang]) return savedLang;
            return 'ru';
        }
        function t(key) {
            return translations[currentLang]?.[key] || translations.ru[key] || key;
        }
        function setLanguage(lang) {
            if (translations[lang]) {
                currentLang = lang;
                localStorage.setItem('movi_lang', lang);
                applyTranslations();
                return true;
            }
            return false;
        }
        function applyTranslations() {
            const elements = document.querySelectorAll('[data-i18n]');
            elements.forEach(element => {
                const key = element.getAttribute('data-i18n');
                if (key) element.textContent = t(key);
            });
            const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
            placeholders.forEach(element => {
                const key = element.getAttribute('data-i18n-placeholder');
                if (key) element.placeholder = t(key);
            });
        }
        function getCurrentLanguage() {
            return currentLang;
        }
        return { t, setLanguage, getCurrentLanguage, applyTranslations, detectLanguage };
    })();
    const telegramApp = (function() {
        let isTelegram = false;
        function init() {
            if (window.Telegram?.WebApp) {
                isTelegram = true;
                Telegram.WebApp.expand();
                applyThemeParams();
                Telegram.WebApp.setHeaderColor('#1a1a1a');
                Telegram.WebApp.setBackgroundColor('#1a1a1a');
                Telegram.WebApp.onEvent('themeChanged', applyThemeParams);
            }
        }
        function applyThemeParams() {
            if (!isTelegram) return;
            const themeParams = Telegram.WebApp.themeParams;
            const root = document.documentElement;
            if (themeParams.bg_color) root.style.setProperty('--tg-bg-color', themeParams.bg_color);
            if (themeParams.text_color) root.style.setProperty('--tg-text-color', themeParams.text_color);
            if (themeParams.hint_color) root.style.setProperty('--tg-hint-color', themeParams.hint_color);
            if (themeParams.button_color) root.style.setProperty('--tg-button-color', themeParams.button_color);
            if (themeParams.button_text_color) root.style.setProperty('--tg-button-text-color', themeParams.button_text_color);
        }
        function isTelegramWebApp() { return isTelegram; }
        function getInitData() { return isTelegram ? Telegram.WebApp.initDataUnsafe : null; }
        return { init, isTelegramWebApp, getInitData };
    })();
    const animationManager = (function() {
        let animationFrameId = null;
        function animateButton(button, callback) {
            if (CONFIG.reduceMotion) {
                button.classList.add('loading');
                setTimeout(() => {
                    button.classList.remove('loading');
                    button.classList.add('success');
                    if (callback) callback();
                }, 500);
                return;
            }
            button.classList.add('loading');
            const startTime = performance.now();
            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / CONFIG.animationDuration, 1);
                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(animate);
                } else {
                    button.classList.remove('loading');
                    button.classList.add('success');
                    if (callback) callback();
                    animationFrameId = null;
                }
            }
            animationFrameId = requestAnimationFrame(animate);
        }
        function resetButton(button) {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            button.classList.remove('loading', 'success');
        }
        function scrollToTop() {
            const behavior = CONFIG.reduceMotion ? 'auto' : 'smooth';
            window.scrollTo({ top: 0, behavior });
        }
        return { animateButton, resetButton, scrollToTop };
    })();
    const formManager = (function() {
        let form = null;
        let phoneInput = null;
        function init() {
            form = document.getElementById('deliveryForm');
            phoneInput = document.getElementById('phone');
            if (!form || !phoneInput) return;
            setupPhoneInput();
            setupEventListeners();
            setDefaultCity();
        }
        function setupPhoneInput() {
            phoneInput.value = CONFIG.phonePrefix;
            phoneInput.addEventListener('input', handlePhoneInput);
            phoneInput.addEventListener('keydown', handlePhoneKeydown);
            phoneInput.addEventListener('paste', handlePhonePaste);
            phoneInput.addEventListener('focus', handlePhoneFocus);
        }
        function setupEventListeners() {
            if (!form) return;
            form.addEventListener('submit', handleFormSubmit, { passive: false });
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('invalid', handleInvalidInput);
                input.addEventListener('input', clearValidity);
            });
        }
        function handlePhoneInput(e) {
            const input = e.target;
            let value = input.value.replace(/\D/g, '');
            if (!value.startsWith('7')) value = '7' + value.replace(/^7/, '');
            value = value.substring(0, 11);
            let formattedValue = CONFIG.phonePrefix;
            if (value.length > 1) {
                const digits = value.substring(1);
                formattedValue += ' ' + formatPhoneDigits(digits);
            }
            input.value = formattedValue;
        }
        function handlePhoneKeydown(e) {
            const input = e.target;
            const selectionStart = input.selectionStart;
            if (e.key === 'Backspace' && selectionStart <= CONFIG.phonePrefix.length) {
                e.preventDefault();
                return;
            }
            if (e.key === 'Delete' && selectionStart < CONFIG.phonePrefix.length) {
                e.preventDefault();
            }
        }
        function handlePhonePaste(e) {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').replace(/\D/g, '');
            if (pasteData.startsWith('7')) {
                phoneInput.value = CONFIG.phonePrefix + ' ' + formatPhoneDigits(pasteData.substring(1));
            } else if (pasteData.startsWith('8')) {
                phoneInput.value = CONFIG.phonePrefix + ' ' + formatPhoneDigits(pasteData.substring(1));
            } else {
                phoneInput.value = CONFIG.phonePrefix + ' ' + formatPhoneDigits(pasteData);
            }
        }
        function handlePhoneFocus() {
            requestAnimationFrame(() => {
                const currentValue = phoneInput.value;
                if (currentValue.length > CONFIG.phonePrefix.length) {
                    phoneInput.setSelectionRange(currentValue.length, currentValue.length);
                } else {
                    phoneInput.setSelectionRange(CONFIG.phonePrefix.length, CONFIG.phonePrefix.length);
                }
            });
        }
        function formatPhoneDigits(digits) {
            let formatted = '';
            for (let i = 0; i < Math.min(digits.length, 10); i++) {
                if (i === 3 || i === 6 || i === 8) formatted += ' ';
                formatted += digits[i];
            }
            return formatted;
        }
        function handleFormSubmit(e) {
            e.preventDefault();
            if (!validateForm()) return;
            const submitBtn = document.getElementById('submitBtn');
            if (!submitBtn) return;
            submitBtn.disabled = true;
            animationManager.animateButton(submitBtn, () => {
                const btnText = submitBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = i18n.t('successMessage');
                setTimeout(() => {
                    submitFormData();
                    resetForm();
                    animationManager.scrollToTop();
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        animationManager.resetButton(submitBtn);
                        if (btnText) btnText.textContent = i18n.t('submitBtn');
                    }, 3000);
                }, 500);
            });
        }
        function validateForm() {
            let isValid = true;
            const inputs = form.querySelectorAll('input[required], select[required]');
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    markInvalid(input);
                    isValid = false;
                }
            });
            const phoneValue = phoneInput.value.replace(/\D/g, '');
            if (phoneValue.length !== 11) {
                markInvalid(phoneInput);
                isValid = false;
            }
            return isValid;
        }
        function markInvalid(input) {
            input.style.borderColor = '#ff4444';
            input.setCustomValidity('Please fill out this field');
        }
        function clearValidity(e) {
            const input = e.target;
            input.style.borderColor = '';
            input.setCustomValidity('');
        }
        function handleInvalidInput(e) {
            markInvalid(e.target);
        }
        function submitFormData() {
            const formData = {
                name: document.getElementById('name').value,
                phone: phoneInput.value.replace(/\D/g, ''),
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                deliveryType: document.getElementById('deliveryType').value,
                date: document.getElementById('date').value,
                time: document.getElementById('time').value,
                barrier: document.getElementById('barrier').checked,
                assembly: document.getElementById('assembly').checked,
                elevator: document.getElementById('elevator').checked,
                timestamp: new Date().toISOString()
            };
            if (telegramApp.isTelegramWebApp()) {
                setTimeout(() => { Telegram.WebApp.close(); }, 2000);
            }
        }
        function resetForm() {
            if (!form) return;
            form.reset();
            setDefaultCity();
            phoneInput.value = CONFIG.phonePrefix;
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.style.borderColor = '';
                input.setCustomValidity('');
            });
        }
        function setDefaultCity() {
            const cityInput = document.getElementById('city');
            if (cityInput && !cityInput.value) cityInput.value = CONFIG.defaultCity;
        }
        return { init, resetForm, validateForm };
    })();
    document.addEventListener('DOMContentLoaded', function() {
        telegramApp.init();
        i18n.setLanguage(i18n.detectLanguage());
        i18n.applyTranslations();
        formManager.init();
        if ('connection' in navigator) {
            void navigator.connection.effectiveType;
        }
    });
    window.MOVIApp = {
        i18n: {
            setLanguage: i18n.setLanguage,
            getCurrentLanguage: i18n.getCurrentLanguage
        },
        form: {
            reset: formManager.resetForm,
            validate: formManager.validateForm
        },
        telegram: {
            isTelegram: telegramApp.isTelegramWebApp,
            getInitData: telegramApp.getInitData
        }
    };
})();