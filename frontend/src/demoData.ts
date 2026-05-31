export const DEMO_MODE_KEY = 'apni_demo_mode'

export const demoMerchants = [
  { id: 101, name: 'King Spice & Mini Mart', suburb: 'Pendle Hill', category: 'Spice Shop', emoji: '🌶️', description: 'Premium spices and groceries from the subcontinent', phone: '02 9123 4567', stripe_connected: true, is_active: true },
  { id: 102, name: 'Al Madina Halal Meats', suburb: 'Auburn', category: 'Halal Butcher', emoji: '🥩', description: 'Fresh halal meats delivered daily', phone: '02 9234 5678', stripe_connected: true, is_active: true },
  { id: 103, name: 'Lahori Sweets & Bakers', suburb: 'Lakemba', category: 'Bakery', emoji: '🍮', description: 'Authentic Pakistani sweets and freshly baked goods', phone: '02 9345 6789', stripe_connected: true, is_active: true },
  { id: 104, name: 'Spice Route Grocers', suburb: 'Merrylands', category: 'Grocery', emoji: '🛒', description: 'Your one-stop South Asian grocery store', phone: '02 9456 7890', stripe_connected: true, is_active: true },
  { id: 105, name: 'Desi Fresh Produce', suburb: 'Blacktown', category: 'Grocery', emoji: '🥬', description: 'Fresh South Asian vegetables and herbs daily', phone: '02 9567 8901', stripe_connected: true, is_active: true },
  { id: 106, name: 'Karachi Kitchen Supplies', suburb: 'Granville', category: 'Grocery', emoji: '🫙', description: 'Authentic Pakistani pantry essentials', phone: '02 9678 9012', stripe_connected: true, is_active: true },
]

export const demoProducts: Record<number, any[]> = {
  101: [
    { id: 1001, merchant_id: 101, name: 'Shan Biryani Masala', price: 4.99, emoji: '🌶️', category: 'Spices', stock_qty: 100 },
    { id: 1002, merchant_id: 101, name: 'National Chilli Powder 500g', price: 6.50, emoji: '🌶️', category: 'Spices', stock_qty: 80 },
    { id: 1003, merchant_id: 101, name: 'Basmati Rice 5kg', price: 18.99, emoji: '🍚', category: 'Rice', stock_qty: 50 },
    { id: 1004, merchant_id: 101, name: 'Rooh Afza 800ml', price: 12.99, emoji: '🍹', category: 'Drinks', stock_qty: 40 },
    { id: 1005, merchant_id: 101, name: 'Mustard Oil 1L', price: 8.99, emoji: '🫙', category: 'Oils', stock_qty: 45 },
    { id: 1006, merchant_id: 101, name: 'Toor Daal 2kg', price: 11.99, emoji: '🫘', category: 'Lentils', stock_qty: 60 },
  ],
  102: [
    { id: 1007, merchant_id: 102, name: 'Halal Lamb Chops 1kg', price: 22.99, emoji: '🥩', category: 'Meat', stock_qty: 30 },
    { id: 1008, merchant_id: 102, name: 'Whole Chicken Halal', price: 14.99, emoji: '🍗', category: 'Meat', stock_qty: 25 },
    { id: 1009, merchant_id: 102, name: 'Halal Beef Mince 500g', price: 12.99, emoji: '🥩', category: 'Meat', stock_qty: 20 },
    { id: 1010, merchant_id: 102, name: 'Lamb Shoulder 1.5kg', price: 32.99, emoji: '🥩', category: 'Meat', stock_qty: 15 },
  ],
  103: [
    { id: 1011, merchant_id: 103, name: 'Gulab Jamun 1kg', price: 16.99, emoji: '🍮', category: 'Sweets', stock_qty: 20 },
    { id: 1012, merchant_id: 103, name: 'Samosa Dozen', price: 9.99, emoji: '🥟', category: 'Snacks', stock_qty: 15 },
    { id: 1013, merchant_id: 103, name: 'Barfi Mixed 500g', price: 18.99, emoji: '🍬', category: 'Sweets', stock_qty: 12 },
    { id: 1014, merchant_id: 103, name: 'Naan Bread 6 pack', price: 6.99, emoji: '🫓', category: 'Bread', stock_qty: 30 },
  ],
  104: [
    { id: 1015, merchant_id: 104, name: 'Basmati Rice 10kg', price: 34.99, emoji: '🍚', category: 'Rice', stock_qty: 40 },
    { id: 1016, merchant_id: 104, name: 'Chana Daal 2kg', price: 9.99, emoji: '🫘', category: 'Lentils', stock_qty: 55 },
    { id: 1017, merchant_id: 104, name: 'Sunflower Oil 2L', price: 11.99, emoji: '🫙', category: 'Oils', stock_qty: 35 },
    { id: 1018, merchant_id: 104, name: 'Atta Flour 5kg', price: 14.99, emoji: '🌾', category: 'Flour', stock_qty: 45 },
    { id: 1019, merchant_id: 104, name: 'Tamarind Paste 400g', price: 5.99, emoji: '🟤', category: 'Condiments', stock_qty: 60 },
  ],
  105: [
    { id: 1020, merchant_id: 105, name: 'Fresh Methi 200g', price: 3.99, emoji: '🥬', category: 'Vegetables', stock_qty: 25 },
    { id: 1021, merchant_id: 105, name: 'Karela (Bitter Gourd)', price: 4.99, emoji: '🥒', category: 'Vegetables', stock_qty: 20 },
    { id: 1022, merchant_id: 105, name: 'Fresh Curry Leaves', price: 2.99, emoji: '🌿', category: 'Herbs', stock_qty: 30 },
    { id: 1023, merchant_id: 105, name: 'Green Chillies 250g', price: 3.49, emoji: '🌶️', category: 'Vegetables', stock_qty: 40 },
  ],
  106: [
    { id: 1024, merchant_id: 106, name: 'MDH Garam Masala 100g', price: 5.99, emoji: '🌶️', category: 'Spices', stock_qty: 70 },
    { id: 1025, merchant_id: 106, name: 'Shezan Mango Juice 1L', price: 4.99, emoji: '🥭', category: 'Drinks', stock_qty: 50 },
    { id: 1026, merchant_id: 106, name: 'Dalda Ghee 1kg', price: 19.99, emoji: '🫙', category: 'Cooking', stock_qty: 25 },
    { id: 1027, merchant_id: 106, name: 'Vermicelli 400g', price: 3.99, emoji: '🍝', category: 'Pantry', stock_qty: 45 },
  ],
}

export const demoHappyHours = [
  { id: 201, merchant_id: 101, title: 'Tuesday Afternoon Special', description: '20% off all spices and masalas. Limited to 25 orders only.', discount_percent: 20, max_orders: 25, orders_taken: 8, start_time: new Date(Date.now() - 3600000).toISOString(), end_time: new Date(Date.now() + 5400000).toISOString(), is_active: true },
  { id: 202, merchant_id: 102, title: 'Fresh Lamb Clearance', description: "Today's fresh stock must go. Grab lamb chops at a steal.", discount_percent: 22, max_orders: 15, orders_taken: 3, start_time: new Date(Date.now() - 1800000).toISOString(), end_time: new Date(Date.now() + 3200000).toISOString(), is_active: true },
]

export const demoOffers = [
  { id: 301, merchant: 'King Spice', name: 'Premium Saffron 5g', emoji: '🌸', was: 24.99, now: 17.99, save: '28% OFF', badge: 'HOT DEAL', expires: 'Ends tonight' },
  { id: 302, merchant: 'Spice Route', name: 'Basmati Rice 10kg', emoji: '🍚', was: 34.99, now: 26.99, save: '23% OFF', badge: 'LIMITED', expires: 'Ends Sunday' },
  { id: 303, merchant: 'Lahori Sweets', name: 'Mixed Mithai Box 1kg', emoji: '🍮', was: 28.99, now: 21.99, save: '24% OFF', badge: 'POPULAR', expires: 'Ends Friday' },
]

export const demoDashboardOrders = [
  { id: 901, merchant_id: 101, buyer_name: 'Mohammed Ali', buyer_email: 'mali@email.com', buyer_phone: '0411111111', items: [], subtotal: 45.97, surcharge: 0.69, total: 46.66, commission: 4.60, merchant_payout: 41.37, payment_method: 'card', status: 'paid', created_at: new Date(Date.now() - 900000).toISOString() },
  { id: 902, merchant_id: 101, buyer_name: 'Fatima Khan', buyer_email: 'fkhan@email.com', buyer_phone: '0422222222', items: [], subtotal: 32.48, surcharge: 0.49, total: 32.97, commission: 3.25, merchant_payout: 29.23, payment_method: 'card', status: 'ready', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 903, merchant_id: 101, buyer_name: 'Ahmed Siddiqui', buyer_email: 'asid@email.com', buyer_phone: '0433333333', items: [], subtotal: 67.96, surcharge: 1.02, total: 68.98, commission: 6.80, merchant_payout: 61.16, payment_method: 'afterpay', status: 'fulfilled', created_at: new Date(Date.now() - 86400000).toISOString() },
]
