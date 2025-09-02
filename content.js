(function () {
    // Extract the Order Number
    const orderNumberElement = document.querySelector('.page-title-container > h1:nth-child(1)');
    let orderNumber = orderNumberElement ? orderNumberElement.textContent.trim() : 'Order Number not found';
    
    // Extract only the numeric part of the order number
    orderNumber = orderNumber.match(/\d+/g)?.join('') || 'Order Number not found';
  
    // Extract the Total
    const totalElement = document.querySelector('span.strong.total');
    const totalText = totalElement ? totalElement.textContent.trim() : '0,00 €';
    const totalValue = parseFloat(totalText.replace(',', '.').replace('€', '').trim());
  
    // Calculate the net amount (non-taxed value)
    const netValue = totalValue / 1.19;
  
    // Calculate VAT (19% of net value)
    const vat = (netValue * 0.19).toFixed(2);
  
    // Extract the Order Date
    const orderDateElement = document.querySelector('div.timeline-box:nth-child(2) > div:nth-child(2) > span:nth-child(1)');
    const orderDate = orderDateElement ? orderDateElement.textContent.trim() : 'Order Date not found';
  
    // Extract the Country
    const countryElement = document.querySelector('div.Country');
    const country = countryElement ? countryElement.textContent.trim() : 'Country not found';

    // Extract recipient details
    const recipientNameElement = document.querySelector('div.Name');
    const recipientName = recipientNameElement ? recipientNameElement.textContent.trim() : 'Recipient Name not found';

    const recipientStreetElement = document.querySelector('div.Street');
    const recipientStreet = recipientStreetElement ? recipientStreetElement.textContent.trim() : 'Recipient Street not found';
  
    const recipientCityElement = document.querySelector('div.City');
    const recipientCity = recipientCityElement ? recipientCityElement.textContent.trim() : 'Recipient City not found';

    // Extract table data (quantity, article name, expansion name, and price)
    const tableRows = document.querySelectorAll('tr[data-article-id]');
    const articles = Array.from(tableRows).map((row) => {
        return {
            quantity: row.getAttribute('data-amount') || '0',
            articleName: row.getAttribute('data-name') || 'Unknown Article',
            expansionName: row.getAttribute('data-expansion-name') || 'Unknown Expansion',
            price: parseFloat(row.getAttribute('data-price') || '0').toFixed(2) + ' €',
        };
    });

    // Save all extracted data in variables
    const extractedData = {
      orderNumber: orderNumber,
      total: totalValue.toFixed(2) + ' €',
      vat: vat + ' €',
      orderDate: orderDate,
      country: country,
      recipientName: recipientName,
      recipientStreet: recipientStreet,
      recipientCity: recipientCity,
      articles: articles, // Array of article data
    };
  
    // Log the extracted data to the console
    console.log('Extracted Data:', extractedData);
  
    // Now you can use the `extractedData` object as needed
})();