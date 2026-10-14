const storageKey = 'kots-tasty-bites-cart';
const cartItemsElement = document.querySelector('#cart-items');
const cartEmptyElement = document.querySelector('#cart-empty');
const cartStatusElement = document.querySelector('#cart-status');
const cartCountElement = document.querySelector('#cart-count');
const cartTotalElement = document.querySelector('#cart-total');
const customerForm = document.querySelector('#customer-form');
const placeOrderButton = document.querySelector('#place-order');
const whatsappOrderLink = document.querySelector('#whatsapp-order-link');
const callLink = document.querySelector('.call-link');

let cart = loadCart();

function loadCart() {
	try {
		const savedCart = JSON.parse(localStorage.getItem(storageKey) || '[]');
		if (!Array.isArray(savedCart)) return [];

		const currentPrices = new Map();
		document.querySelectorAll('.add-to-cart').forEach((button) => {
			const prices = currentPrices.get(button.dataset.item) || [];
			const price = Number(button.dataset.price);
			if (!prices.includes(price)) prices.push(price);
			currentPrices.set(button.dataset.item, prices);
		});

		return savedCart.flatMap((item) => {
			if (
				!item || typeof item.name !== 'string' ||
				!Number.isFinite(item.price) || item.price <= 0 ||
				!Number.isInteger(item.quantity) || item.quantity <= 0
			) return [];

			const prices = currentPrices.get(item.name);
			if (!prices) return [];
			const price = prices.includes(item.price) ? item.price : prices.length === 1 ? prices[0] : null;
			if (price === null) return [];
			return [{ ...item, id: `${item.name}::${price}`, price }];
		});
	} catch {
		return [];
	}
}

function saveCart() {
	try {
		localStorage.setItem(storageKey, JSON.stringify(cart));
	} catch {
		cartStatusElement.textContent = 'Cart changes will not be saved after you leave this page.';
	}
}

function formatPrice(amount) {
	return `₦${amount.toLocaleString('en-NG')}`;
}

function renderCart() {
	cartItemsElement.replaceChildren();
	let itemCount = 0;
	let total = 0;

	for (const item of cart) {
		itemCount += item.quantity;
		total += item.price * item.quantity;

		const row = document.createElement('li');
		row.className = 'cart-line';

		const copy = document.createElement('div');
		copy.className = 'cart-line-copy';
		const name = document.createElement('span');
		name.className = 'cart-line-name';
		name.textContent = item.name;
		const subtotal = document.createElement('span');
		subtotal.className = 'cart-line-subtotal';
		subtotal.textContent = `${formatPrice(item.price)} each · ${formatPrice(item.price * item.quantity)}`;
		copy.append(name, subtotal);

		const controls = document.createElement('div');
		controls.className = 'cart-line-controls';
		controls.append(
			createCartButton('−', `Decrease ${item.name} quantity`, 'decrease', item.id),
		);
		const quantity = document.createElement('span');
		quantity.textContent = String(item.quantity);
		quantity.setAttribute('aria-label', `Quantity: ${item.quantity}`);
		controls.append(quantity);
		controls.append(
			createCartButton('+', `Increase ${item.name} quantity`, 'increase', item.id),
			createCartButton('Remove', `Remove ${item.name}`, 'remove', item.id, 'remove-item'),
		);

		row.append(copy, controls);
		cartItemsElement.append(row);
	}

	cartEmptyElement.hidden = cart.length > 0;
	cartCountElement.textContent = String(itemCount);
	cartTotalElement.textContent = formatPrice(total);
	placeOrderButton.disabled = cart.length === 0;
	placeOrderButton.hidden = false;
	whatsappOrderLink.hidden = true;
	whatsappOrderLink.removeAttribute('href');
	cartStatusElement.textContent = cart.length ? `${itemCount} item${itemCount === 1 ? '' : 's'} in your cart.` : '';
}

function createCartButton(text, label, action, itemId, className = '') {
	const button = document.createElement('button');
	button.type = 'button';
	button.textContent = text;
	button.setAttribute('aria-label', label);
	button.dataset.action = action;
	button.dataset.itemId = itemId;
	if (className) button.className = className;
	return button;
}

document.querySelectorAll('.add-to-cart').forEach((button) => {
	button.addEventListener('click', () => {
		const name = button.dataset.item;
		const price = Number(button.dataset.price);
		const id = `${name}::${price}`;
		const existingItem = cart.find((item) => item.id === id);

		if (existingItem) {
			existingItem.quantity += 1;
		} else {
			cart.push({ id, name, price, quantity: 1 });
		}

		saveCart();
		renderCart();
	});
});

cartItemsElement.addEventListener('click', (event) => {
	const button = event.target.closest('button[data-action]');
	if (!button) return;

	const item = cart.find((entry) => entry.id === button.dataset.itemId);
	if (!item) return;

	if (button.dataset.action === 'increase') item.quantity += 1;
	if (button.dataset.action === 'decrease') item.quantity -= 1;
	if (button.dataset.action === 'remove' || item.quantity < 1) {
		cart = cart.filter((entry) => entry.id !== item.id);
	}

	saveCart();
	renderCart();
});

customerForm.addEventListener('submit', (event) => {
	event.preventDefault();
	if (!cart.length || !customerForm.reportValidity()) return;

	const formData = new FormData(customerForm);
	const orderLines = cart.map((item) =>
		`- ${item.quantity} x ${item.name} (${formatPrice(item.price)} each): ${formatPrice(item.price * item.quantity)}`
	);
	const message = [
		"Hello, I'd like to place an order from Kot's Tasty Bites World.",
		'',
		`Name: ${formData.get('name')}`,
		`Customer phone: ${formData.get('phone')}`,
		formData.get('address') ? `Address or directions: ${formData.get('address')}` : '',
		'',
		'Order:',
		...orderLines,
		`Total: ${formatPrice(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))}`,
		formData.get('notes') ? `Order notes: ${formData.get('notes')}` : '',
	].filter(Boolean).join('\n');
	const businessPhone = callLink.href.replace(/^tel:/, '').replace(/\D/g, '');
	whatsappOrderLink.href = `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`;
	whatsappOrderLink.hidden = false;
	placeOrderButton.hidden = true;
	cartStatusElement.textContent = 'Order details are ready. Open WhatsApp to review and send your order.';
	whatsappOrderLink.focus();
});

renderCart();