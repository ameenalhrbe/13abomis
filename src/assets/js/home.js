import "lite-youtube-embed";
import BasePage from "./base-page";
import Lightbox from "fslightbox";
window.fslightbox = Lightbox;

class Home extends BasePage {
    onReady() {
        this.initFeaturedTabs();
        this.loadAutoFP5();
    }

    /**
     * used in views/components/home/featured-products-style*.twig
     */
    initFeaturedTabs() {
        app.all('.tab-trigger', el => {
            el.addEventListener('click', ({ currentTarget: btn }) => {
                let id = btn.dataset.componentId;
                app.toggleClassIf(`#${id} .tabs-wrapper>div`, 'is-active opacity-0 translate-y-3', 'inactive', tab => tab.id == btn.dataset.target)
                    .toggleClassIf(`#${id} .tab-trigger`, 'is-active', 'inactive', tabBtn => tabBtn == btn);

                setTimeout(() => app.toggleClassIf(`#${id} .tabs-wrapper>div`, 'opacity-100 translate-y-0', 'opacity-0 translate-y-3', tab => tab.id == btn.dataset.target), 100);
            })
        });
        document.querySelectorAll('.s-block-tabs').forEach(block => block.classList.add('tabs-initialized'));
    }

    async loadAutoFP5() {
        const section = document.getElementById('fp5-auto-section');
        if (!section) return;

        this._fp5Api   = (section.dataset.api || '').replace(/\/+$/, '');
        this._fp5Title = section.dataset.title || 'جميع المنتجات';
        this._fp5Page  = 1;
        this._fp5Last  = 1;
        this._fp5Grid  = null;

        const { products, lastPage } = await this._fetchFP5Page(1);

        if (!products.length) { section.remove(); return; }

        this._fp5Last = lastPage;
        section.classList.remove('fp5-auto-loading');
        section.innerHTML = this._buildFP5Shell(this._fp5Title);
        this._fp5Grid = section.querySelector('.fp5-grid');
        this._fp5Grid.insertAdjacentHTML('beforeend', products.map(p => this._buildCard(p)).join(''));

        if (lastPage > 1) {
            const btn = section.querySelector('.fp5-load-more');
            btn && btn.addEventListener('click', () => this._loadNextPage());
        } else {
            const btn = section.querySelector('.fp5-load-more');
            btn && btn.remove();
        }
    }

    async _loadNextPage() {
        if (this._fp5Page >= this._fp5Last) return;
        this._fp5Page++;

        const btn = document.querySelector('.fp5-load-more');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="sicon-loading animate-spin"></i>'; }

        const { products, lastPage } = await this._fetchFP5Page(this._fp5Page);
        this._fp5Last = lastPage;

        if (products.length && this._fp5Grid) {
            this._fp5Grid.insertAdjacentHTML('beforeend', products.map(p => this._buildCard(p)).join(''));
        }

        if (btn) {
            if (this._fp5Page >= this._fp5Last) {
                btn.remove();
            } else {
                btn.disabled = false;
                btn.innerHTML = 'عرض المزيد';
            }
        }
    }

    async _fetchFP5Page(page) {
        const perPage = 8;
        const apiBase = this._fp5Api;
        const q       = `per_page=${perPage}&page=${page}`;
        let products  = [];
        let lastPage  = 1;

        // 1 — Salla JS SDK
        try {
            if (salla?.api?.get) {
                const r = await salla.api.get('/store/products', { per_page: perPage, page });
                const p = r?.data?.products || r?.products;
                if (Array.isArray(p) && p.length) {
                    products = p;
                    lastPage = r?.data?.pagination?.total_pages || r?.data?.last_page || 1;
                    return { products, lastPage };
                }
            }
        } catch { /* fall through */ }

        // 2 — direct REST fetch
        const paths = [`/v1/products?${q}`, `/products?${q}`];
        for (const path of paths) {
            try {
                const res  = await fetch(apiBase + path, { headers: { Accept: 'application/json' } });
                if (!res.ok) continue;
                const json = await res.json();
                const p    = json?.data?.products || json?.data?.data || json?.products;
                if (Array.isArray(p) && p.length) {
                    products = p;
                    const pg = json?.data?.pagination || json?.pagination || json?.meta;
                    lastPage = pg?.total_pages || pg?.last_page || pg?.pageCount || 1;
                    return { products, lastPage };
                }
            } catch { /* next */ }
        }

        return { products: [], lastPage: 1 };
    }

    _buildFP5Shell(title) {
        return `
        <section class="s-block fp5-section container">
          <div class="fp5-head">
            <div class="fp5-title-pill">${this._esc(title)}</div>
            <div class="fp5-title-dot"></div>
          </div>
          <div class="fp5-grid"></div>
          <div class="fp5-load-more-wrap">
            <button class="fp5-load-more">عرض المزيد</button>
          </div>
        </section>`;
    }

    _buildCard(p) {
        const addLabel   = salla?.lang?.get('cart.add_to_cart') || 'أضف للسلة';
        const tags       = (p.tags || []).slice(0, 6);
        const half       = Math.ceil(tags.length / 2);
        const img        = p.thumbnail || p.image?.url || p.images?.[0]?.url || '';
        const name       = this._esc(p.name || p.title || '');
        const url        = p.url || p.link || '#';
        const price      = salla?.money ? salla.money(p.price?.amount ?? p.price) : (p.price?.formatted ?? String(p.price));
        const isOnSale   = !!(p.is_on_sale || p.sale_price);
        const oldPrice   = isOnSale
            ? (salla?.money ? salla.money(p.regular_price?.amount ?? p.regular_price) : (p.regular_price?.formatted ?? ''))
            : '';

        const mkNote = (t, rev) => rev
            ? `<div class="fp5-note fp5-note--rev"><span class="fp5-note__text">${this._esc(t)}</span><span class="fp5-note__dot"></span></div>`
            : `<div class="fp5-note"><span class="fp5-note__dot"></span><span class="fp5-note__text">${this._esc(t)}</span></div>`;

        const notesStart = tags.slice(0, half).map(t => mkNote(t, false)).join('');
        const notesEnd   = tags.slice(half).map(t => mkNote(t, true)).join('');
        const badge      = isOnSale && p.discount_percentage ? `<span class="fp5-badge">${p.discount_percentage}</span>` : '';
        const stars      = p.rating?.count > 0 ? `<div class="fp5-card__stars"><salla-rating-stars rate="${p.rating.stars}"></salla-rating-stars></div>` : '';

        return `
        <div class="fp5-item">
          <div class="fp5-float">
            <div class="fp5-notes fp5-notes--start">${notesStart}</div>
            <div class="fp5-bottle">
              ${badge}
              <a href="${url}" aria-label="${name}">
                <img src="${img}" alt="${name}" class="fp5-bottle__img" loading="lazy">
              </a>
              <button class="fp5-wish" onclick="salla.wishlist.toggle(${p.id})" title="المفضلة">
                <i class="sicon-heart"></i>
              </button>
            </div>
            <div class="fp5-notes fp5-notes--end">${notesEnd}</div>
          </div>
          <div class="fp5-card">
            <a href="${url}" class="fp5-card__name">${name}</a>
            <div class="fp5-card__prices">
              ${oldPrice ? `<del class="fp5-card__price-old">${oldPrice}</del>` : ''}
              <span class="fp5-card__price">${price}</span>
            </div>
            <div class="fp5-card__actions">
              <salla-add-product-button product-id="${p.id}" product-status="${p.status || 'sale'}" product-type="${p.type || 'simple'}" class="fp5-add-btn">
                <i class="sicon-bag-add"></i><span>${addLabel}</span>
              </salla-add-product-button>
              <salla-quantity-input product-id="${p.id}" class="fp5-qty"></salla-quantity-input>
            </div>
            ${stars}
          </div>
        </div>`;
    }

    _esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

Home.initiateWhenReady(['index']);