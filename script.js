document.addEventListener('DOMContentLoaded', () => {

    // ══════════════════════════════════════════════════════════════════
    //  ДАННЫЕ И СОСТОЯНИЕ
    // ══════════════════════════════════════════════════════════════════
    let toursData = [];
    let favorites = [];   // массив tour_id (числа)
    let user = JSON.parse(localStorage.getItem('user')) || null;

    function initMobileNav() {
        const nav = document.querySelector('header nav');
        if (!nav) return;

        const toggleBtn = nav.querySelector('.nav-toggle');
        const navList = nav.querySelector('ul');
        if (!toggleBtn || !navList) return;

        function setMenuState(isOpen) {
            nav.classList.toggle('nav-open', isOpen);
            toggleBtn.setAttribute('aria-expanded', String(isOpen));
            document.body.classList.toggle('menu-open', isOpen);
        }

        toggleBtn.addEventListener('click', () => {
            const isOpen = !nav.classList.contains('nav-open');
            setMenuState(isOpen);
        });

        navList.addEventListener('click', (e) => {
            if (e.target.closest('a')) setMenuState(false);
        });

        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target)) setMenuState(false);
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) setMenuState(false);
        });
    }

    // ── Вспомогательные ───────────────────────────────────────────────
    function debounce(func, delay = 250) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }


    // ══════════════════════════════════════════════════════════════════
    //  ИЗБРАННОЕ — работа через базу данных
    // ══════════════════════════════════════════════════════════════════

    /** Собрать идентификатор пользователя для запросов к favorites.php.
     *  Передаём оба поля — сервер сам выберет, что использовать. */
    function userPayload() {
        return { user_id: user.id || 0, email: user.email || '' };
    }

    /** Загрузить избранное текущего пользователя с сервера */
    async function loadFavorites() {
        if (!user || (!user.id && !user.email)) {
            favorites = [];
            return;
        }
        try {
            const params = new URLSearchParams({ user_id: user.id || 0, email: user.email || '' });
            const res  = await fetch(`api/favorites.php?${params}`);
            const data = await res.json();
            favorites  = Array.isArray(data) ? data.map(Number) : [];
        } catch (e) {
            console.error('Ошибка загрузки избранного:', e);
            favorites = [];
        }
    }

    /** Добавить тур в избранное (БД) */
    async function addFavorite(tourId) {
        if (!user) return false;
        const res  = await fetch('api/favorites.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...userPayload(), tour_id: tourId })
        });
        const data = await res.json();
        if (data.success) favorites.push(tourId);
        return data.success;
    }

    /** Убрать тур из избранного (БД) */
    async function removeFavorite(tourId) {
        if (!user) return false;
        const res  = await fetch('api/favorites.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...userPayload(), tour_id: tourId })
        });
        const data = await res.json();
        if (data.success) favorites = favorites.filter(id => id !== tourId);
        return data.success;
    }

    /** Переключить состояние избранного для кнопки на карточке */
    async function toggleFavorite(tourId, btn) {
        if (!user) {
            alert('Пожалуйста, войдите в профиль, чтобы добавить тур в избранное.');
            if (authModal) authModal.style.display = 'flex';
            return;
        }
        const isFav = favorites.includes(tourId);
        btn.disabled = true;
        if (isFav) {
            await removeFavorite(tourId);
            btn.innerHTML = '♡';
            btn.classList.remove('favorited');
        } else {
            await addFavorite(tourId);
            btn.innerHTML = '♥';
            btn.classList.add('favorited');
        }
        btn.disabled = false;
    }

    // ══════════════════════════════════════════════════════════════════
    //  ЗАГРУЗКА ДАННЫХ С СЕРВЕРА
    // ══════════════════════════════════════════════════════════════════
    async function loadTours() {
        try {
            const [toursRes] = await Promise.all([
                fetch('api/tours.php')   // публичный эндпоинт — без ?admin=1
            ]);
            if (!toursRes.ok) throw new Error('Ошибка сети');
            toursData = await toursRes.json();

            // Загружаем избранное параллельно
            await loadFavorites();

            initHeroSearch();

            if (document.getElementById('tours-grid')) {
                // Устанавливаем максимум ползунка по самому дорогому туру
                if (priceFilter && toursData.length > 0) {
                    const maxPrice = Math.max(...toursData.map(t => Number(t.price)));
                    const roundedMax = Math.ceil(maxPrice / 10000) * 10000;
                    priceFilter.max   = roundedMax;
                    priceFilter.value = roundedMax;
                    if (priceValue) priceValue.textContent = roundedMax.toLocaleString('ru-RU');
                }
                applyFilters();
            }
            if (document.body.classList.contains('profile-body')) {
                renderFavorites();
            }
        } catch (error) {
            console.error('Не удалось загрузить туры:', error);
            const grid = document.getElementById('tours-grid');
            if (grid) grid.innerHTML = '<p class="tours-not-found">Ошибка загрузки данных. Пожалуйста, проверьте подключение к серверу.</p>';
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  НАВИГАЦИЯ / АВТОРИЗАЦИЯ
    // ══════════════════════════════════════════════════════════════════
    const authModal  = document.getElementById('auth-modal');
    const profileLink = document.getElementById('profile-link');

    function updateProfileLink() {
        if (!profileLink) return;
        if (user) {
            if (user.role === 'admin') {
                profileLink.textContent = 'Админ-панель';
                profileLink.href = 'admin.html';
            } else {
                profileLink.textContent = 'Профиль';
                profileLink.href = 'profile.html';
            }
            profileLink.onclick = null;
        } else {
            profileLink.textContent = 'Профиль';
            profileLink.href = '#';
            profileLink.onclick = (e) => {
                e.preventDefault();
                if (authModal) authModal.style.display = 'flex';
            };
        }
    }

    if (authModal) {
        const loginView     = document.getElementById('login-view');
        const registerView  = document.getElementById('register-view');
        const showRegisterBtn = document.getElementById('show-register-view');
        const showLoginBtn    = document.getElementById('show-login-view');

        if (showRegisterBtn && showLoginBtn) {
            showRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                loginView.style.display = 'none';
                registerView.style.display = 'block';
            });
            showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                registerView.style.display = 'none';
                loginView.style.display = 'block';
            });
        }

        authModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('close-modal')) {
                authModal.style.display = 'none';
            }
        });

        // Вход
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email    = e.target.querySelector('input[type="email"]').value;
                const password = e.target.querySelector('input[type="password"]').value;
                try {
                    const res  = await fetch('api/login.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    if (data.success) {
                        user = data.user; // содержит id, email, role
                        localStorage.setItem('user', JSON.stringify(user));
                        authModal.style.display = 'none';
                        alert(`Добро пожаловать, ${user.email}!`);
                        window.location.href = 'profile.html';
                    } else {
                        alert(data.message || 'Ошибка входа');
                    }
                } catch (err) {
                    alert('Ошибка соединения с сервером');
                }
            });
        }

        // Регистрация
        const registerForm  = document.getElementById('register-form');
        const policyCheckbox = document.getElementById('policy-checkbox');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (policyCheckbox && !policyCheckbox.checked) {
                    alert('Пожалуйста, подтвердите согласие с политикой конфиденциальности');
                    return;
                }
                const email           = document.getElementById('register-email').value;
                const password        = document.getElementById('register-password').value;
                const passwordConfirm = document.getElementById('register-password-confirm').value;
                if (password !== passwordConfirm) { alert('Пароли не совпадают!'); return; }
                try {
                    const res  = await fetch('api/register.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    if (data.success) {
                        user = { email, role: 'user' };
                        localStorage.setItem('user', JSON.stringify(user));
                        authModal.style.display = 'none';
                        alert(`Аккаунт для ${user.email} успешно создан!`);
                        window.location.href = 'profile.html';
                    } else {
                        alert(data.message || 'Ошибка регистрации');
                    }
                } catch (err) {
                    alert('Ошибка соединения с сервером');
                }
            });
        }
    }

    updateProfileLink();
    initMobileNav();

    // ══════════════════════════════════════════════════════════════════
    //  ОБРАТНАЯ СВЯЗЬ
    // ══════════════════════════════════════════════════════════════════
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email   = document.getElementById('fb-email').value;
            const message = document.getElementById('fb-message').value;
            try {
                const res  = await fetch('api/send_feedback.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, message })
                });
                const data = await res.json();
                if (data.success) { alert('Ваше сообщение отправлено!'); feedbackForm.reset(); }
                else { alert('Ошибка отправки сообщения.'); }
            } catch { alert('Ошибка соединения.'); }
        });
    }

    // ══════════════════════════════════════════════════════════════════
    //  ПОИСК НА ГЛАВНОЙ СТРАНИЦЕ
    // ══════════════════════════════════════════════════════════════════
    function initHeroSearch() {
        const searchInput    = document.getElementById('main-search-input');
        const resultsPreview = document.getElementById('search-results-preview');
        const moreToursLink  = document.getElementById('more-tours-link');
        const searchForm     = document.getElementById('main-search-form');
        if (!searchInput || !resultsPreview) return;

        function showResults(query) {
            const q = query.toLowerCase().trim();
            if (!q) {
                resultsPreview.innerHTML = '';
                resultsPreview.classList.remove('active');
                if (moreToursLink) moreToursLink.style.display = 'none';
                return;
            }
            const matches = toursData.filter(t => t.name.toLowerCase().includes(q)).slice(0, 5);
            if (matches.length > 0) {
                resultsPreview.innerHTML = matches.map(tour => `
                    <div class="search-result-item" data-id="${tour.id}">
                        <div class="search-result-thumb">
                            <img src="${tour.img || tour.image_url}" alt="${tour.name}">
                        </div>
                        <div class="search-result-info">
                            <span class="search-result-name">${tour.name}</span>
                            <span class="search-result-meta"><i class="fa-solid fa-clock"></i> ${tour.duration}</span>
                        </div>
                        <div class="search-result-price">${Number(tour.price).toLocaleString('ru-RU')} ₽</div>
                    </div>
                `).join('');
                resultsPreview.classList.add('active');
                if (moreToursLink) moreToursLink.style.display = 'block';
            } else {
                resultsPreview.innerHTML = `
                    <div class="search-no-results">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <span>По запросу «${query}» ничего не найдено</span>
                    </div>`;
                resultsPreview.classList.add('active');
                if (moreToursLink) moreToursLink.style.display = 'none';
            }
        }

        searchInput.addEventListener('input', (e) => showResults(e.target.value));
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => { e.preventDefault(); showResults(searchInput.value); });
        }
        resultsPreview.addEventListener('click', (e) => {
            const item = e.target.closest('.search-result-item');
            if (item) {
                const tourId = Number(item.dataset.id);
                resultsPreview.classList.remove('active');
                if (moreToursLink) moreToursLink.style.display = 'none';
                searchInput.value = '';
                showTourDetails(tourId);
            }
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.hero-search-container')) {
                resultsPreview.classList.remove('active');
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════
    //  КАТАЛОГ ТУРОВ
    // ══════════════════════════════════════════════════════════════════
    const toursGrid     = document.getElementById('tours-grid');
    const priceFilter   = document.getElementById('price-filter');
    const priceValue    = document.getElementById('price-value');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter    = document.getElementById('sort-filter');

    const includesIcons = {
        flight: '<i class="fa-solid fa-plane"></i> Перелет',
        hotel:  '<i class="fa-solid fa-hotel"></i> Отель',
        guide:  '<i class="fa-solid fa-user-check"></i> Гид',
        gear:   '<i class="fa-solid fa-person-hiking"></i> Снаряжение'
    };

    function renderTours(tours) {
        if (!toursGrid) return;
        toursGrid.innerHTML = '';
        if (tours.length === 0) {
            toursGrid.innerHTML = '<p class="tours-not-found">По вашему запросу туров не найдено. Попробуйте изменить фильтры.</p>';
            return;
        }
        tours.forEach(tour => {
            const tourId      = Number(tour.id);
            const isFavorited = favorites.includes(tourId);
            const includes    = Array.isArray(tour.includes) ? tour.includes : [];
            const includesHTML = includes.map(item => `<span>${includesIcons[item] || ''}</span>`).join('');
            toursGrid.innerHTML += `
                <div class="tour-card" data-id="${tourId}">
                    <div class="tour-card-image">
                        <img src="${tour.img || tour.image_url}" alt="${tour.name}">
                        <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" title="Добавить в избранное">
                            ${isFavorited ? '♥' : '♡'}
                        </button>
                    </div>
                    <div class="tour-card-content">
                        <h3>${tour.name}</h3>
                        <div class="tour-meta">
                            <span><i class="fa-solid fa-clock"></i> ${tour.duration}</span>
                            ${includesHTML}
                        </div>
                        <div class="tour-card-footer">
                            <span class="tour-price">${Number(tour.price).toLocaleString('ru-RU')} ₽</span>
                            <a href="#" class="btn-details">Подробнее</a>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    function applyFilters() {
        if (!priceFilter || !categoryFilter || !sortFilter) return;
        const maxPrice = Number(priceFilter.value);
        const category = categoryFilter.value;
        const sortBy   = sortFilter.value;
        let filtered   = toursData.filter(tour => {
            return Number(tour.price) <= maxPrice && (category === 'all' || tour.category === category);
        });
        if (sortBy === 'price-asc')  filtered.sort((a, b) => Number(a.price) - Number(b.price));
        if (sortBy === 'price-desc') filtered.sort((a, b) => Number(b.price) - Number(a.price));
        renderTours(filtered);
    }

    if (toursGrid) {
        const urlParams    = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        if (categoryFilter && categoryParam) categoryFilter.value = categoryParam;

        if (priceFilter && categoryFilter && sortFilter) {
            const debouncedFilter = debounce(() => {
                if (priceValue) priceValue.textContent = Number(priceFilter.value).toLocaleString('ru-RU');
                applyFilters();
            });
            priceFilter.addEventListener('input', debouncedFilter);
            categoryFilter.addEventListener('change', applyFilters);
            sortFilter.addEventListener('change', applyFilters);
        }

        toursGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.tour-card');
            if (!card) return;
            const tourId = Number(card.dataset.id);
            if (e.target.closest('.favorite-btn')) {
                e.preventDefault();
                toggleFavorite(tourId, e.target.closest('.favorite-btn'));
            }
            if (e.target.classList.contains('btn-details')) {
                e.preventDefault();
                showTourDetails(tourId);
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════
    //  МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ТУРА
    // ══════════════════════════════════════════════════════════════════
    const detailsModal = document.getElementById('tour-details-modal');

    function showTourDetails(tourId) {
        const tour = toursData.find(t => Number(t.id) === tourId);
        if (!detailsModal || !tour) return;
        window._currentBookingTour = tour;

        let options = tour.options;
        if (typeof options === 'string') {
            try { options = JSON.parse(options); } catch { options = {}; }
        }
        const categoryLabels = { adventure: 'Приключения', city: 'Городской отдых', culture: 'Культурные поездки' };
        const optionKeys     = Object.keys(options || {});

        detailsModal.innerHTML = `
            <div class="modal-content" id="tour-details-content">
                <span class="close-modal">&times;</span>
                <div class="tour-details-layout">
                    <img class="tour-details-img" src="${tour.img || tour.image_url}" alt="${tour.name}">
                    <div class="tour-details-info">
                        <span class="tour-details-tag">${categoryLabels[tour.category] || tour.category}</span>
                        <h2>${tour.name}</h2>
                        <p class="tour-desc">${tour.desc || tour.description}</p>
                        ${optionKeys.length > 0 ? `
                        <div class="tour-options">
                            <h4>Дополнительные опции</h4>
                            ${optionKeys.map(key => `
                                <label>
                                    <input type="checkbox" class="option-check" data-price="${options[key]}">
                                    ${key} <span style="margin-left:auto;color:#888;">+${Number(options[key]).toLocaleString('ru-RU')} ₽</span>
                                </label>
                            `).join('')}
                        </div>` : ''}
                        <p class="final-price">Итоговая стоимость</p>
                        <span class="final-price-value"><span id="final-price-value">${Number(tour.price).toLocaleString('ru-RU')}</span> ₽</span>
                        <a href="#" class="btn-book">Оформить путешествие</a>
                    </div>
                </div>
            </div>
        `;
        detailsModal.style.display = 'flex';

        const content = document.getElementById('tour-details-content');
        if (content) {
            content.addEventListener('change', (e) => {
                if (e.target.classList.contains('option-check')) {
                    let currentPrice = Number(tour.price);
                    content.querySelectorAll('.option-check:checked').forEach(cb => {
                        currentPrice += Number(cb.dataset.price);
                    });
                    document.getElementById('final-price-value').textContent = currentPrice.toLocaleString('ru-RU');
                }
            });
        }
    }

    if (detailsModal) {
        detailsModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('close-modal')) {
                detailsModal.style.display = 'none';
            }
            if (e.target.classList.contains('btn-book')) {
                e.preventDefault();
                if (!user) {
                    alert('Пожалуйста, войдите в профиль, чтобы оформить заказ.');
                    detailsModal.style.display = 'none';
                    if (authModal) authModal.style.display = 'flex';
                } else {
                    // Собираем выбранные опции
                    const content = document.getElementById('tour-details-content');
                    const selectedOptions = [];
                    if (content) {
                        content.querySelectorAll('.option-check:checked').forEach(cb => {
                            selectedOptions.push({ name: cb.closest('label').textContent.trim(), price: Number(cb.dataset.price) });
                        });
                    }
                    const finalPriceEl = document.getElementById('final-price-value');
                    const finalPrice = finalPriceEl ? parseInt(finalPriceEl.textContent.replace(/\s/g, ''), 10) : 0;

                    // Находим текущий тур
                    const tourCard = content ? content.closest('[data-tour-id]') : null;
                    // currentTourId устанавливается при открытии модального окна
                    const tourForOrder = window._currentBookingTour || {};

                    fetch('api/orders.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_email:       user.email || '',
                            user_name:        user.name  || user.email || '',
                            tour_id:          tourForOrder.id    || 0,
                            tour_name:        tourForOrder.name  || tourForOrder.title || '',
                            base_price:       tourForOrder.price || 0,
                            final_price:      finalPrice,
                            options_selected: selectedOptions
                        })
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            alert('Заказ успешно оформлен! Наш менеджер скоро с вами свяжется.');
                        } else {
                            alert('Заказ оформлен (локально). Наш менеджер скоро с вами свяжется.');
                        }
                    })
                    .catch(() => {
                        alert('Заказ оформлен! Наш менеджер скоро с вами свяжется.');
                    });
                    detailsModal.style.display = 'none';
                }
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════
    //  СТРАНИЦА ПРОФИЛЯ — ИЗБРАННОЕ
    // ══════════════════════════════════════════════════════════════════
    function renderFavorites() {
        const favoritesGrid = document.getElementById('favorites-grid');
        if (!favoritesGrid) return;

        const favoriteTours = toursData.filter(tour => favorites.includes(Number(tour.id)));

        if (favoriteTours.length === 0) {
            favoritesGrid.innerHTML = '<p>У вас пока нет избранных туров. Самое время <a href="tours.html">это исправить</a>!</p>';
            return;
        }

        favoritesGrid.innerHTML = '';
        favoriteTours.forEach(tour => {
            const includes     = Array.isArray(tour.includes) ? tour.includes : [];
            const includesHTML = includes.map(item => `<span>${includesIcons[item] || ''}</span>`).join('');
            favoritesGrid.innerHTML += `
                <div class="tour-card" data-id="${tour.id}">
                    <div class="tour-card-image">
                        <img src="${tour.img || tour.image_url}" alt="${tour.name}">
                        <button class="favorite-btn favorited fav-remove-btn"
                                title="Убрать из избранного">♥</button>
                    </div>
                    <div class="tour-card-content">
                        <h3>${tour.name}</h3>
                        <div class="tour-meta">
                            <span><i class="fa-solid fa-clock"></i> ${tour.duration}</span>
                            ${includesHTML}
                        </div>
                        <div class="tour-card-footer">
                            <span class="tour-price">${Number(tour.price).toLocaleString('ru-RU')} ₽</span>
                            <a href="#" class="btn-details">Подробнее</a>
                        </div>
                    </div>
                </div>
            `;
        });

        // Клики в сетке избранного
        favoritesGrid.addEventListener('click', async (e) => {
            const card = e.target.closest('.tour-card');
            if (!card) return;
            const tourId = Number(card.dataset.id);

            // Кнопка «убрать из избранного»
            if (e.target.closest('.fav-remove-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.fav-remove-btn');
                btn.disabled = true;
                const ok = await removeFavorite(tourId);
                if (ok) {
                    // Плавно убираем карточку
                    card.style.transition = 'opacity .3s';
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.remove();
                        if (favoritesGrid.querySelectorAll('.tour-card').length === 0) {
                            favoritesGrid.innerHTML = '<p>У вас пока нет избранных туров. Самое время <a href="tours.html">это исправить</a>!</p>';
                        }
                    }, 300);
                } else {
                    btn.disabled = false;
                }
                return;
            }

            // Кнопка «подробнее»
            if (e.target.classList.contains('btn-details')) {
                e.preventDefault();
                showTourDetails(tourId);
            }
        });
    }

    // ── Страница профиля ──────────────────────────────────────────────
    if (document.body.classList.contains('profile-body')) {
        if (!user) {
            alert('Пожалуйста, войдите в систему для доступа к профилю.');
            window.location.href = 'index.html';
            return;
        }
        const userEmailSpan = document.getElementById('user-email');
        if (userEmailSpan) userEmailSpan.textContent = user.email;

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите выйти?')) {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                }
            });
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  ЗАПУСК
    // ══════════════════════════════════════════════════════════════════
    loadTours();
});
