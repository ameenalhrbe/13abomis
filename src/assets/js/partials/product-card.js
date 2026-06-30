import BasePage from '../base-page';

class ProductCard extends HTMLElement {
    constructor() { super(); }

    connectedCallback() {
        this.product = this.product || JSON.parse(this.getAttribute('product'));
        if (window.app?.status === 'ready') {
            this.onReady();
        } else {
            document.addEventListener('theme::ready', () => this.onReady());
        }
    }

    onReady() {
        this.placeholder = salla.url.asset(salla.config.get('theme.settings.placeholder'));
        this.hideAddBtn  = this.hasAttribute('hideAddBtn');

        if (salla.config.get('page.slug') === 'landing-page') {
            this.hideAddBtn  = true;
            this.showQuantity = window.showQuantity;
        }

        salla.lang.onLoaded(() => this.render());
        this.render();
    }

    getPriceFormat(price) {
        if (!price || price == 0) {
            return salla.config.get('store.settings.product.show_price_as_dash') ? '-' : '';
        }
        return salla.money(price);
    }

    getAddButtonLabel() {
        const p = this.product;
        if (p.has_preorder_campaign)                      return salla.lang.get('pages.products.pre_order_now');
        if (p.status === 'sale' && p.type === 'booking')  return salla.lang.get('pages.cart.book_now');
        if (p.status === 'sale')                          return salla.lang.get('pages.cart.add_to_cart');
        if (p.type !== 'donating')                        return salla.lang.get('pages.products.out_of_stock');
        return salla.lang.get('pages.products.donation_exceed');
    }

    esc(str = '') {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    render() {
        const p            = this.product;
        const tags         = (p.tags || []).slice(0, 6);
        const half         = Math.ceil(tags.length / 2);
        const img          = p.image?.url || p.thumbnail || this.placeholder;
        const url          = p.url || '#';
        const name         = this.esc(p.name || '');
        const isInWishlist = !salla.config.isGuest() &&
                             salla.storage.get('salla::wishlist', []).includes(Number(p.id));

        const noteTag = (t, rev) => rev
            ? `<div class="fp5-note fp5-note--rev"><span class="fp5-note__text">${this.esc(t)}</span><span class="fp5-note__dot"></span></div>`
            : `<div class="fp5-note"><span class="fp5-note__dot"></span><span class="fp5-note__text">${this.esc(t)}</span></div>`;

        const notesStart = tags.slice(0, half).map(t => noteTag(t, false)).join('');
        const notesEnd   = tags.slice(half).map(t => noteTag(t, true)).join('');

        const badge = p.is_on_sale && p.discount_percentage
            ? `<span class="fp5-badge">${this.esc(String(p.discount_percentage))}</span>` : '';

        const prices = p.is_on_sale
            ? `<del class="fp5-card__price-old">${this.getPriceFormat(p.regular_price)}</del>
               <span class="fp5-card__price">${this.getPriceFormat(p.sale_price)}</span>`
            : `<span class="fp5-card__price">${this.getPriceFormat(p.price)}</span>`;

        const stars = p.rating?.stars
            ? `<div class="fp5-card__stars"><salla-rating-stars rate="${p.rating.stars}"></salla-rating-stars></div>`
            : '';

        const actions = !this.hideAddBtn ? `
            <div class="fp5-card__actions">
                <salla-add-product-button
                    product-id="${p.id}"
                    product-status="${p.status}"
                    product-type="${p.type}"
                    class="fp5-add-btn">
                    <i class="sicon-bag-add"></i>
                    <span>${p.add_to_cart_label || this.getAddButtonLabel()}</span>
                </salla-add-product-button>
                <salla-quantity-input product-id="${p.id}" max="${p.max_quantity || ''}" class="fp5-qty"></salla-quantity-input>
            </div>` : '';

        this.classList.add('fp5-item');
        this.setAttribute('id', p.id);

        this.innerHTML = `
        <div class="fp5-float">
            <div class="fp5-notes fp5-notes--start">${notesStart}</div>
            <div class="fp5-bottle">
                ${badge}
                <a href="${url}" aria-label="${name}">
                    <img src="${this.placeholder}" data-src="${img}" alt="${name}"
                         class="fp5-bottle__img lazy" loading="lazy">
                </a>
                <button class="fp5-wish${isInWishlist ? ' fp5-wish--active' : ''}"
                        onclick="salla.wishlist.toggle(${p.id})" title="المفضلة">
                    <i class="${isInWishlist ? 'sicon-heart-fill text-red-400' : 'sicon-heart'}"></i>
                </button>
            </div>
            <div class="fp5-notes fp5-notes--end">${notesEnd}</div>
        </div>
        <div class="fp5-card">
            <a href="${url}" class="fp5-card__name">${name}</a>
            <div class="fp5-card__prices">${prices}</div>
            ${actions}
            ${stars}
        </div>`;

        document.lazyLoadInstance?.update(this.querySelectorAll('.lazy'));
    }
}

customElements.define('custom-salla-product-card', ProductCard);
