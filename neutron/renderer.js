const { ipcRenderer } = require("electron"); // Import ipcRenderer

const webview = document.getElementById("webview");
const backButton = document.getElementById("back-button");
const generateInvoiceButton = document.getElementById("generate-invoice");
const loadUrlButton = document.getElementById("load-url"); // New button for loading URL
const urlInput = document.getElementById("url-input"); // New input field for URL

// Enable or disable the "Back" button based on navigation state
webview.addEventListener("did-start-loading", () => {
  backButton.disabled = !webview.canGoBack();
});

// Navigate back when the "Back" button is clicked
backButton.addEventListener("click", () => {
  if (webview.canGoBack()) {
    webview.goBack();
  }
});

// Extract data from the webview and send to main process to generate PDF
generateInvoiceButton.addEventListener("click", () => {
  webview
    .executeJavaScript(
      `
    const orderNumberElement = document.querySelector('.page-title-container');
    let orderNumber = orderNumberElement ? orderNumberElement.innerText.trim() : 'Order Number not found';

    // String aufteilen und die Nummer extrahieren
    let parts = orderNumber.split("#"); // Trennen am '#'

    orderNumber = parts.length > 1 ? parts[1].trim() : 'Default Order Number';

    const totalElement = document.querySelector('span.strong.total');
    const totalText = totalElement ? totalElement.textContent.trim() : '0,00 €';
    const totalValue = parseFloat(totalText.replace(',', '.').replace('€', '').trim());

    const orderDateElement = document.querySelector('div.timeline-box:nth-child(2) > div:nth-child(2) > span:nth-child(1)');
    const orderDate = orderDateElement ? orderDateElement.textContent.trim() : 'Order Date not found';

    const countryElement = document.querySelector('div.Country');
    const country = countryElement ? countryElement.textContent.trim() : 'Country not found';

    const recipientNameElement = document.querySelector('div.Name');
    const recipientName = recipientNameElement ? recipientNameElement.textContent.trim() : 'Recipient Name not found';

    const recipientStreetElement = document.querySelector('div.Street');
    const recipientStreet = recipientStreetElement ? recipientStreetElement.textContent.trim() : 'Recipient Street not found';

    const recipientCityElement = document.querySelector('div.City');
    const recipientCity = recipientCityElement ? recipientCityElement.textContent.trim() : 'Recipient City not found';

    const tableRows = document.querySelectorAll('tr[data-article-id]');

    let totalNet = 0;
    let totalVat = 0;
    const articles = Array.from(tableRows).map((row) => {
        const quantity = parseInt(row.getAttribute('data-amount') || '0', 10);
        const pricePerUnit = parseFloat(row.getAttribute('data-price') || '0');
        const totalPrice = (quantity * pricePerUnit).toFixed(2);

        const checkbox = row.querySelector('input[type="checkbox"]');
        const isChecked = checkbox ? checkbox.checked : false;

        let vatAmount = 0;
        if (!isChecked) {
            vatAmount = Math.round(quantity * (pricePerUnit * 0.19 / 1.19) * 100) / 100;; // 19% VAT
            totalVat += parseFloat(vatAmount); // Add VAT only for non-differenzbesteuert items
        }

        totalNet += quantity * pricePerUnit;

        return {
            quantity: row.getAttribute('data-amount') || '0',
            articleName: row.getAttribute('data-name') || 'Unknown Article',
            expansionName: row.getAttribute('data-expansion-name') || 'Unknown Expansion',
            pricePerUnit: pricePerUnit.toFixed(2) + ' €',
            totalPrice: totalPrice + ' €',
            isChecked: isChecked,
            vatAmount: vatAmount + ' €',
        };
    });

    // Extract the Shipping Price
    const shippingElement = document.querySelector('.shipping-price');
    const shippingPriceText = shippingElement ? shippingElement.textContent.trim() : '0,00 €';
    const shippingPrice = parseFloat(shippingPriceText.replace(',', '.').replace('€', '').trim());

    // Add shipping cost to net and VAT
    const shippingVat = (shippingPrice - (shippingPrice / 1.19)).toFixed(2);
    totalNet += shippingPrice; // Add shipping to net value
    totalVat += parseFloat(shippingVat); // Add shipping VAT to total VAT

    const adjustedNetValue = totalNet.toFixed(2);
    const adjustedVatValue = totalVat.toFixed(2);

    const extractedData = {
      orderNumber: orderNumber,
      total: totalValue.toFixed(2) + ' €',
      vat: adjustedVatValue + ' €',
      orderDate: orderDate,
      country: country,
      recipientName: recipientName,
      recipientStreet: recipientStreet,
      recipientCity: recipientCity,
      articles: articles,
      shippingPrice: shippingPrice.toFixed(2) + ' €',
      adjustedNetValue: adjustedNetValue + ' €',
    };

    extractedData;
  `
    )
    .then((data) => {
      console.log("Extracted Data:", data);
      ipcRenderer.send("generate-invoice", data);
    })
    .catch((err) => console.error("Failed to extract data:", err));
});

// Load a new URL when the button is clicked
loadUrlButton.addEventListener("click", () => {
  const url = urlInput.value.trim();
  if (url) {
    webview.src = url; // Set the new URL in the webview
  } else {
    alert("Please enter a valid URL");
  }
});
