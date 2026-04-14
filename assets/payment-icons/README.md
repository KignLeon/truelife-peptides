# True Life Peptides — Payment Icons

## Location (inside repo)
`/assets/payment-icons/`

These SVG files are stored in the repo at `TLPeptides Website/assets/payment-icons/` and are also referenced from the site footer on every page.

## Icons included

| File | Brand | Color |
|---|---|---|
| `visa.svg` | Visa | `#1434CB` (Visa Blue) |
| `mastercard.svg` | Mastercard | `#EB001B` / `#F79E1B` (Standard) |
| `paypal.svg` | PayPal | `#003087` / `#009CDE` |
| `apple-pay.svg` | Apple Pay | `#000000` |
| `klarna.svg` | Klarna | `#FFB3C7` (Klarna Pink) |
| `amex.svg` | American Express | `#2557D6` |
| `shop-pay.svg` | Shop Pay | `#5A31F4` |

## Style
- Clean SVG with rounded-rect backgrounds matching each brand's official color
- Footer display: small cards (`height: 26px`) with semi-transparent dark glass effect matching the dark footer
- Hover state: slight brightness lift + 2px Y translate
- Format: `750×471` viewBox (standard payment card ratio)

## Usage in HTML
```html
<div class="footer-payments">
    <span class="footer-payments-label">Accepted</span>
    <span class="payment-icon" title="Visa">
        <img src="./assets/payment-icons/visa.svg" alt="Visa">
    </span>
    <!-- ... other payment icons ... -->
</div>
```

> **Note:** The `footer-payments`, `payment-icon`, and `footer-copyright` CSS classes are defined in `css/style.css` (appended at the bottom of the file).

## External Use
To use these icons outside the repo, copy the entire `payment-icons/` folder to your target project and include the CSS classes.
