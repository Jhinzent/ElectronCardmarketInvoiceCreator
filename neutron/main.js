const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const PDFDocument = require("pdfkit");
const fs = require("fs");

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true, // Allow Node.js in the renderer
      contextIsolation: false, // Disable context isolation for direct DOM access
      webviewTag: true, // Enable webview tag
    },
  });

  mainWindow.loadFile("index.html");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Function to format numbers with a comma as the decimal separator
function formatCurrency(value) {
  return value.replace(".", ",");
}

// Function to format numbers with a comma as the decimal separator
function formatVatToPercent(vat) {
  const vatValue = parseFloat(vat); // Stelle sicher, dass vat eine Zahl ist
  if (vatValue > 0) {
    return "19%";
  }
  return "0%*";
}

// Listen for the 'generate-invoice' event from renderer
ipcMain.on("generate-invoice", (event, extractedData) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Format the total and vat with a comma as the decimal separator
  const formattedTotal = formatCurrency(extractedData.total.replace(" €", ""));
  const formattedVat = formatCurrency(extractedData.vat.replace(" €", ""));

  // Generate the filename dynamically
  let countryPrefix = "";
  if (
    extractedData.country.toLowerCase() !== "germany" &&
    extractedData.country.toLowerCase() !== "deutschland"
  ) {
    countryPrefix = "X_";
  }

  const fileName = `Invoice_${
    extractedData.orderNumber
  }_${countryPrefix}${extractedData.orderDate.replace(
    /\s+/g,
    "_"
  )}_${formattedVat}_${formattedTotal}.pdf`;

  // Define the path to save the PDF
  const filePath = dialog.showSaveDialogSync(mainWindow, {
    title: "Save Invoice",
    defaultPath: fileName, // Use the dynamically generated filename
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });

  if (filePath) {
    doc.pipe(fs.createWriteStream(filePath));

    doc.font("Helvetica");

    // Right-side information
    doc
      .fontSize(12)
      .text("Alfredstraße 24, 10365 Berlin, Germany", { align: "right" });
    doc.text("VAT Reg Number: DE364500544", { align: "right" });
    doc.text("Phone Number: 49-01783268131", { align: "right" });
    doc.text(`Invoice Number: ${extractedData.orderNumber}`, {
      align: "right",
    });
    doc.text(`Invoice Date: ${extractedData.orderDate}`, { align: "right" });
    doc.text(`Tax Point: ${extractedData.orderDate.split(" ")[0]}`, {
      align: "right",
    }); // Only date, without day
    doc.text(`Shipment nr.: ${extractedData.orderNumber}`, { align: "right" });
    doc.moveDown(3);

    // Sender Address (small font on the left side)
    doc.fontSize(8).text("Vinzent Wagner, Alfredstraße 24, D-10365, Berlin", {
      underline: true,
      align: "left",
    });
    doc.moveDown();

    // Recipient Address (on the left side, bigger font)
    doc.fontSize(12).text(`${extractedData.recipientName}`, {
      underline: true,
      align: "left",
    });
    doc.text(`${extractedData.recipientStreet}`, {
      underline: true,
      align: "left",
    });
    doc.text(`${extractedData.recipientCity}`, {
      underline: true,
      align: "left",
    });
    doc.text(`${extractedData.country}`, { underline: true, align: "left" }); // Country on a new line
    doc.moveDown(2);

    // Table for Articles
    doc.text("Artikel:", { underline: true, align: "left" });
    doc.moveDown(1);

    // Table Header (with borders)
    const tableTop = doc.y;
    const columnWidths = [40, 260, 70, 40, 80]; // Adjusted column widths
    const columnTextPlacement = [50, 90, 350, 420, 460]; // Adjusted column widths

    // Draw header row
    doc.rect(columnTextPlacement[0], tableTop, columnWidths[0], 20).stroke(); // Quantity column
    doc.rect(columnTextPlacement[1], tableTop, columnWidths[1], 20).stroke(); // Article column
    doc.rect(columnTextPlacement[2], tableTop, columnWidths[2], 20).stroke(); // Price Singular column
    doc.rect(columnTextPlacement[3], tableTop, columnWidths[3], 20).stroke(); // Vat column
    doc.rect(columnTextPlacement[4], tableTop, columnWidths[4], 20).stroke(); // Gross column

    doc.text("Menge", columnTextPlacement[0], tableTop + 5, {
      width: columnWidths[0],
      align: "center",
    });
    doc.text("Artikel", columnTextPlacement[1], tableTop + 5, {
      width: columnWidths[1],
      align: "center",
    });
    doc.text("Einzelpreis", columnTextPlacement[2], tableTop + 5, {
      width: columnWidths[2],
      align: "center",
    });
    doc.text("Steuer", columnTextPlacement[3], tableTop + 5, {
      width: columnWidths[3],
      align: "center",
    });
    doc.text("Gesamtpreis", columnTextPlacement[4], tableTop + 5, {
      width: columnWidths[4],
      align: "center",
    });
    doc.moveDown();

    // Draw article rows with page overflow handling
    let currentY = doc.y; // Set initial Y position for rows
    const pageHeight = doc.page.height;
    const bottomMargin = 50; // Margin from the bottom of the page

    extractedData.articles.forEach((article, index) => {
      // Skip the article if the checkbox is checked
      if (article.isChecked) {
        // Check if the current position is near the bottom of the page
        if (currentY + 40 > pageHeight - bottomMargin) {
          doc.addPage(); // Add a new page
          currentY = 50; // Reset Y position to the top of the new page

          // Draw header row
          doc
            .rect(columnTextPlacement[0], currentY, columnWidths[0], 20)
            .stroke(); // Quantity column
          doc
            .rect(columnTextPlacement[1], currentY, columnWidths[1], 20)
            .stroke(); // Article column
          doc
            .rect(columnTextPlacement[2], currentY, columnWidths[2], 20)
            .stroke(); // Price Singular column
          doc
            .rect(columnTextPlacement[3], currentY, columnWidths[3], 20)
            .stroke(); // Vat column
          doc
            .rect(columnTextPlacement[4], currentY, columnWidths[4], 20)
            .stroke(); // Gross column

          // Add text to the respective columns in the same row
          doc.text("Menge", columnTextPlacement[0], currentY + 5, {
            width: columnWidths[0],
            align: "center",
          });
          doc.text("Artikel", columnTextPlacement[1], currentY + 5, {
            width: columnWidths[1],
            align: "center",
          });
          doc.text("Einzelpreis", columnTextPlacement[2], currentY + 5, {
            width: columnWidths[2],
            align: "center",
          });
          doc.text("Steuer", columnTextPlacement[3], currentY + 5, {
            width: columnWidths[3],
            align: "center",
          });
          doc.text("Gesamtpreis", columnTextPlacement[4], currentY + 5, {
            width: columnWidths[4],
            align: "center",
          });
          currentY += 20; // Move the Y position down for the next row
        }
        // Draw header row
        doc
          .rect(columnTextPlacement[0], currentY, columnWidths[0], 30)
          .stroke(); // Quantity column
        doc
          .rect(columnTextPlacement[1], currentY, columnWidths[1], 30)
          .stroke(); // Article column
        doc
          .rect(columnTextPlacement[2], currentY, columnWidths[2], 30)
          .stroke(); // Price Singular column
        doc
          .rect(columnTextPlacement[3], currentY, columnWidths[3], 30)
          .stroke(); // Vat column
        doc
          .rect(columnTextPlacement[4], currentY, columnWidths[4], 30)
          .stroke(); // Gross column

        // Add text to the respective columns in the same row
        doc.text(article.quantity, columnTextPlacement[0], currentY + 5, {
          width: columnWidths[0],
          align: "center",
        });
        doc.text(article.articleName, columnTextPlacement[1], currentY + 5, {
          width: columnWidths[1],
          align: "center",
        });
        doc.text(article.pricePerUnit, columnTextPlacement[2], currentY + 5, {
          width: columnWidths[2],
          align: "center",
        });
        doc.text(formatVatToPercent(article.vatAmount), columnTextPlacement[3], currentY + 5, {
          width: columnWidths[3],
          align: "center",
        });
        doc.text(article.totalPrice, columnTextPlacement[4], currentY + 5, {
          width: columnWidths[4],
          align: "center",
        });
        currentY += 30; // Move the Y position down for the next row
      }
    });

    extractedData.articles.forEach((article, index) => {
      // Skip the article if the checkbox is checked
      if (!article.isChecked) {
        // Check if the current position is near the bottom of the page
        if (currentY + 40 > pageHeight - bottomMargin) {
          doc.addPage(); // Add a new page
          currentY = 50; // Reset Y position to the top of the new page

          // Draw header row
          doc
            .rect(columnTextPlacement[0], currentY, columnWidths[0], 20)
            .stroke(); // Quantity column
          doc
            .rect(columnTextPlacement[1], currentY, columnWidths[1], 20)
            .stroke(); // Article column
          doc
            .rect(columnTextPlacement[2], currentY, columnWidths[2], 20)
            .stroke(); // Price Singular column
          doc
            .rect(columnTextPlacement[3], currentY, columnWidths[3], 20)
            .stroke(); // Vat column
          doc
            .rect(columnTextPlacement[4], currentY, columnWidths[4], 20)
            .stroke(); // Gross column

          // Add text to the respective columns in the same row
          doc.text("Menge", columnTextPlacement[0], currentY + 5, {
            width: columnWidths[0],
            align: "center",
          });
          doc.text("Artikel", columnTextPlacement[1], currentY + 5, {
            width: columnWidths[1],
            align: "center",
          });
          doc.text("Einzelpreis", columnTextPlacement[2], currentY + 5, {
            width: columnWidths[2],
            align: "center",
          });
          doc.text("Steuer", columnTextPlacement[3], currentY + 5, {
            width: columnWidths[3],
            align: "center",
          });
          doc.text("Gesamtpreis", columnTextPlacement[4], currentY + 5, {
            width: columnWidths[4],
            align: "center",
          });
          currentY += 20; // Move the Y position down for the next row
        }
        // Draw header row
        doc
          .rect(columnTextPlacement[0], currentY, columnWidths[0], 30)
          .stroke(); // Quantity column
        doc
          .rect(columnTextPlacement[1], currentY, columnWidths[1], 30)
          .stroke(); // Article column
        doc
          .rect(columnTextPlacement[2], currentY, columnWidths[2], 30)
          .stroke(); // Price Singular column
        doc
          .rect(columnTextPlacement[3], currentY, columnWidths[3], 30)
          .stroke(); // Vat column
        doc
          .rect(columnTextPlacement[4], currentY, columnWidths[4], 30)
          .stroke(); // Gross column

        // Add text to the respective columns in the same row
        doc.text(article.quantity, columnTextPlacement[0], currentY + 5, {
          width: columnWidths[0],
          align: "center",
        });
        doc.text(article.articleName, columnTextPlacement[1], currentY + 5, {
          width: columnWidths[1],
          align: "center",
        });
        doc.text(article.pricePerUnit, columnTextPlacement[2], currentY + 5, {
          width: columnWidths[2],
          align: "center",
        });
        doc.text(formatVatToPercent(article.vatAmount), columnTextPlacement[3], currentY + 5, {
          width: columnWidths[3],
          align: "center",
        });
        doc.text(article.totalPrice, columnTextPlacement[4], currentY + 5, {
          width: columnWidths[4],
          align: "center",
        });
        currentY += 30; // Move the Y position down for the next row
      }
    });

    // Add shipping information (also check for overflow)
    if (currentY + 40 > pageHeight - bottomMargin) {
      doc.addPage(); // Add a new page
      currentY = 50; // Reset Y position to the top of the new page

      // Draw header row
      doc
        .rect(columnTextPlacement[0], tableTop, columnWidths[0], 20)
        .stroke(); // Quantity column
      doc
        .rect(columnTextPlacement[1], tableTop, columnWidths[1], 20)
        .stroke(); // Article column
      doc
        .rect(columnTextPlacement[2], tableTop, columnWidths[2], 20)
        .stroke(); // Price Singular column
      doc
        .rect(columnTextPlacement[3], tableTop, columnWidths[3], 20)
        .stroke(); // Vat column
      doc
        .rect(columnTextPlacement[4], tableTop, columnWidths[4], 20)
        .stroke(); // Gross column

      // Add text to the respective columns in the same row
      doc.text("Menge", columnTextPlacement[0], tableTop + 5, {
        width: columnWidths[0],
        align: "center",
      });
      doc.text("Artikel", columnTextPlacement[1], tableTop + 5, {
        width: columnWidths[1],
        align: "center",
      });
      doc.text("Einzelpreis", columnTextPlacement[2], tableTop + 5, {
        width: columnWidths[2],
        align: "center",
      });
      doc.text("Steuer", columnTextPlacement[3], tableTop + 5, {
        width: columnWidths[3],
        align: "center",
      });
      doc.text("Gesamtpreis", columnTextPlacement[4], tableTop + 5, {
        width: columnWidths[4],
        align: "center",
      });
      currentY += 20; // Move the Y position down for the next row
    }

    // Draw the shipping row
    doc.rect(columnTextPlacement[0], currentY, columnWidths[0], 20).stroke(); // Quantity column
    doc.rect(columnTextPlacement[1], currentY, columnWidths[1], 20).stroke(); // Article column
    doc.rect(columnTextPlacement[2], currentY, columnWidths[2], 20).stroke(); // Price Singular column
    doc.rect(columnTextPlacement[3], currentY, columnWidths[3], 20).stroke(); // Vat column
    doc.rect(columnTextPlacement[4], currentY, columnWidths[4], 20).stroke(); // Gross column

    doc.text(`Versand`, columnTextPlacement[1], currentY + 5, {
      width: columnWidths[1],
      align: "center",
    });
    doc.text(`19%`, columnTextPlacement[3], currentY + 5, {
      width: columnWidths[3],
      align: "center",
    });
    doc.text(`${extractedData.shippingPrice}`, columnTextPlacement[4], currentY + 5, {
      width: columnWidths[4],
      align: "center",
    });
    currentY += 40;

    // Helper function to check if there's enough space on the current page
    function ensureSpaceForFooter(doc, currentY, requiredHeight) {
      const pageHeight = doc.page.height - doc.page.margins.bottom;
      if (currentY + requiredHeight > pageHeight) {
        doc.addPage();
        return doc.page.margins.top; // Reset Y position to the top margin of the new page
      }
      return currentY;
    }

    // Add horizontal separation line before VAT (19%) and Net Sum
    const footerHeight = 8 * 20; // Approximate height needed for 8 rows of footer content (including spacing)
    currentY = ensureSpaceForFooter(doc, currentY, footerHeight);

    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 20; // Move the Y position down for the VAT entry

    // VAT (19%)
    doc.text(`MwSt (19%):`, columnTextPlacement[0], currentY + 5, {
      width: columnWidths[0],
      align: "left",
    });
    doc.text(`${formattedVat} €`, columnTextPlacement[4], currentY + 5, {
      width: columnWidths[4],
      align: "center",
    });

    currentY += 40; // Move the Y position down for the Net Sum entry

    // Net Sum
    const netTotal = (
      parseFloat(extractedData.total.replace(" €", "").replace(",", ".")) -
      parseFloat(extractedData.vat.replace(" €", "").replace(",", "."))
    ).toFixed(2);
    doc.text(`Net Sum:`, columnTextPlacement[0], currentY + 5, {
      width: columnWidths[0],
      align: "left",
    });
    doc.text(`${formatCurrency(netTotal)} €`, columnTextPlacement[4], currentY + 5, {
      width: columnWidths[4],
      align: "center",
    });

    currentY += 40; // Move the Y position down for the Total Sum entry

    // Add horizontal separation line after Net Sum
    doc.moveTo(50, currentY).lineTo(540, currentY).stroke();
    currentY += 20; // Move the Y position down for the Total Sum entry

    // Total Sum
    doc.text(`Total Sum:`, columnTextPlacement[0], currentY + 5, {
      width: columnWidths[0],
      align: "left",
    });
    doc.text(`${formattedTotal} €`, columnTextPlacement[4], currentY + 5, {
      width: columnWidths[4],
      align: "center",
    });

    doc
      .fontSize(9)
      .text("* Dieser Artikel wurde nach § 25a UStG differenzbesteuert", 50, 770, { align: "left" });

    // Finalize the PDF
    doc.end();
    console.log("Invoice PDF generated successfully!");
  } else {
    console.log("PDF generation canceled");
  }
});
