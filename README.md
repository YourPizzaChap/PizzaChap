# PizzaChap

A delivery platform connecting customers, local pizzerias, and couriers.

## First milestone
- Responsive Ukrainian landing page
- Marketplace positioning and customer journey
- Separate onboarding sections for pizzerias and couriers
- Menu placeholder while partners and catalog are being prepared
- Mobile navigation and basic UI interactions
- Nginx Docker image for Northflank

## Run locally
Open `index.html` in a browser, or run `python3 -m http.server 8080`.

## Deploy to Northflank
Create a service from this GitHub repository and build using the included `Dockerfile`. The site listens on port **80**.

## Roadmap
1. Menu/catalog, product details, cart, and checkout.
2. Backend API and order lifecycle.
3. Firebase authentication and order persistence.
4. Pizzeria dashboard and courier assignment/dispatch.
5. Courier profile and delivery management.
6. Telegram bot for courier notifications and order controls.

**Important:** this first version is a frontend landing page only. It does not accept or dispatch real orders yet. Contact links are placeholders and should be replaced with real business contacts before launch.
